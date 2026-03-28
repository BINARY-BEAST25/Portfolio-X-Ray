const { GoogleGenAI } = require("@google/genai");

let ai = null;

const getAI = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in backend environment");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

const MODELS = {
  pro: "gemini-2.5-flash",
  flash: "gemini-2.5-flash",
  lite: "gemini-2.5-flash",
};

const STATEMENT_CHUNK_SIZE = 11000;
const MAX_STATEMENT_CHUNKS = 8;

const generate = async (
  model,
  contents,
  temperature = 0.2,
  maxOutputTokens = 2048,
  systemInstruction
) => {
  const config = { temperature, maxOutputTokens };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  const response = await getAI().models.generateContent({ model, contents, config });
  return response.text;
};

const parseJSON = (raw, opener = "[") => {
  const cleaned = String(raw || "").replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf(opener);
  const end = opener === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Invalid JSON returned by Gemini");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

const toText = (value) => String(value || "").trim();

const toPositiveNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const cleaned = String(value || "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const toISODate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().split("T")[0];

  const m = String(value).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
};

const normalizeInvestmentType = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "sip" || normalized === "lump" || normalized === "both") return normalized;
  return "sip";
};

const normalizeCategory = (value) => {
  const allowed = new Set([
    "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Multi Cap", "ELSS",
    "Index Fund", "Sectoral", "Debt / Liquid", "Hybrid", "International", "Other",
  ]);
  return allowed.has(value) ? value : "Other";
};

const normalizeParsedFund = (fund) => {
  const schemeName = toText(fund?.schemeName);
  const currentValue = toPositiveNumber(fund?.currentValue);
  const sipAmount = toPositiveNumber(fund?.sipAmount);
  const lumpSum = toPositiveNumber(fund?.lumpSum);
  const totalInvested = Math.max(toPositiveNumber(fund?.totalInvested), sipAmount, lumpSum);
  const units = toPositiveNumber(fund?.units);
  const expenseRatio = Math.min(5, Math.max(0, toPositiveNumber(fund?.expenseRatio)));

  return {
    schemeName,
    category: normalizeCategory(fund?.category),
    startDate: toISODate(fund?.startDate) || new Date().toISOString().split("T")[0],
    investmentType: normalizeInvestmentType(fund?.investmentType),
    sipAmount,
    lumpSum,
    currentValue,
    totalInvested,
    units,
    folio: toText(fund?.folio),
    expenseRatio: Number.isFinite(expenseRatio) ? expenseRatio : 0.5,
  };
};

const normalizeFundKey = (schemeName = "", folio = "") =>
  `${schemeName.toLowerCase().replace(/[^a-z0-9]/g, "")}|${folio.toLowerCase().replace(/[^a-z0-9]/g, "") || "na"}`;

const mergeParsedFunds = (funds = []) => {
  const byKey = new Map();

  for (const rawFund of funds) {
    const fund = normalizeParsedFund(rawFund);
    if (!fund.schemeName) continue;

    const key = normalizeFundKey(fund.schemeName, fund.folio);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fund);
      continue;
    }

    byKey.set(key, {
      ...existing,
      currentValue: Math.max(existing.currentValue || 0, fund.currentValue || 0),
      totalInvested: Math.max(existing.totalInvested || 0, fund.totalInvested || 0),
      sipAmount: Math.max(existing.sipAmount || 0, fund.sipAmount || 0),
      lumpSum: Math.max(existing.lumpSum || 0, fund.lumpSum || 0),
      units: Math.max(existing.units || 0, fund.units || 0),
      folio: existing.folio || fund.folio,
      startDate: existing.startDate || fund.startDate,
      category: existing.category !== "Other" ? existing.category : fund.category,
    });
  }

  return [...byKey.values()].filter((f) => f.currentValue > 0 || f.totalInvested > 0 || f.sipAmount > 0 || f.lumpSum > 0);
};

const buildStatementChunks = (text) => {
  const fullText = String(text || "").trim();
  if (!fullText) return [];

  const pages = fullText.split(/\n(?=\[Page\s+\d+\])/g).filter(Boolean);
  const source = pages.length ? pages : [fullText];
  const chunks = [];
  let current = "";

  for (const part of source) {
    const candidate = current ? `${current}\n${part}` : part;
    if (candidate.length <= STATEMENT_CHUNK_SIZE) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    if (part.length <= STATEMENT_CHUNK_SIZE) {
      current = part;
      continue;
    }

    for (let i = 0; i < part.length; i += STATEMENT_CHUNK_SIZE) {
      chunks.push(part.slice(i, i + STATEMENT_CHUNK_SIZE));
      if (chunks.length >= MAX_STATEMENT_CHUNKS) return chunks;
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks.slice(0, MAX_STATEMENT_CHUNKS);
};

const clampAmount = (value) => {
  const num = Number(String(value || "").replace(/[, ]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const normaliseDate = (value) => {
  if (!value) return null;
  const parts = String(value).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!parts) return null;

  const day = parts[1].padStart(2, "0");
  const month = parts[2].padStart(2, "0");
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
};

const inferCategory = (schemeName = "") => {
  const name = schemeName.toLowerCase();
  if (name.includes("index")) return "Index Fund";
  if (name.includes("elss") || name.includes("tax saver")) return "ELSS";
  if (name.includes("small cap")) return "Small Cap";
  if (name.includes("mid cap")) return "Mid Cap";
  if (name.includes("large cap")) return "Large Cap";
  if (name.includes("multi cap")) return "Multi Cap";
  if (name.includes("flexi cap")) return "Flexi Cap";
  if (name.includes("debt") || name.includes("liquid") || name.includes("ultra short")) return "Debt / Liquid";
  if (name.includes("hybrid") || name.includes("balanced")) return "Hybrid";
  if (name.includes("nasdaq") || name.includes("international") || name.includes("global") || name.includes("fof")) return "International";
  if (name.includes("bank") || name.includes("pharma") || name.includes("technology") || name.includes("infra")) return "Sectoral";
  return "Other";
};

const estimateExpenseRatio = (category, schemeName = "") => {
  const isRegular = schemeName.toLowerCase().includes("regular");
  const base = {
    "Index Fund": 0.1,
    "Debt / Liquid": 0.2,
    "Large Cap": 0.5,
    "Flexi Cap": 0.5,
    "Mid Cap": 0.6,
    "Small Cap": 0.6,
    "Multi Cap": 0.6,
    ELSS: 0.6,
    Hybrid: 0.5,
    International: 0.7,
    Sectoral: 0.7,
    Other: 0.5,
  }[category] ?? 0.5;

  return +(base + (isRegular ? 0.8 : 0)).toFixed(2);
};

const parseStatementHeuristically = (text) => {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  const schemeRegex = /((?:[A-Z][A-Za-z&/().-]*\s+){1,12}(?:Small\s+Cap|Mid\s+Cap|Large\s+Cap|Flexi\s+Cap|Multi\s+Cap|Index|Tax\s+Saver|ELSS|Liquid|Hybrid|Debt|Equity|Focused|Contra|Bluechip|Opportunities|Advantage|Savings|Value|Growth|International|Nasdaq|Balanced|Arbitrage|Fund|Scheme)(?:\s+[A-Za-z0-9&/().-]+){0,8})/g;
  const matches = [...compact.matchAll(schemeRegex)];
  const seen = new Set();
  const funds = [];

  for (const match of matches) {
    const schemeName = match[1].replace(/\s+/g, " ").trim();
    const key = schemeName.toLowerCase();
    if (schemeName.length < 8 || seen.has(key)) continue;
    seen.add(key);

    const idx = match.index || 0;
    const snippet = compact.slice(Math.max(0, idx - 500), Math.min(compact.length, idx + schemeName.length + 900));
    const folio = (snippet.match(/folio(?:\s*(?:no|number|#))?\s*[:\-]?\s*([A-Z0-9\-\/]+)/i) || [])[1] || "";
    const date = normaliseDate((snippet.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/) || [])[0]);

    const currencyAmounts = [...snippet.matchAll(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/gi)]
      .map((m) => clampAmount(m[1]))
      .filter((n) => n > 0);
    const plainAmounts = [...snippet.matchAll(/\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?)\b/g)]
      .map((m) => clampAmount(m[1]))
      .filter((n) => n >= 1000);
    const rankedAmounts = [...currencyAmounts, ...plainAmounts].sort((a, b) => b - a);

    const currentValue = rankedAmounts[0] || 0;
    const lumpSum = rankedAmounts.find((n) => n > 0 && n !== currentValue) || 0;
    const sipAmount = clampAmount((snippet.match(/(?:sip|systematic investment plan)[^\d]{0,20}(\d[\d,]*(?:\.\d+)?)/i) || [])[1]);
    const units = clampAmount((snippet.match(/units?\s*[:\-]?\s*(\d[\d,]*(?:\.\d+)?)/i) || [])[1]);
    const category = inferCategory(schemeName);

    if (!currentValue && !lumpSum && !sipAmount && !units) continue;

    funds.push({
      schemeName,
      category,
      startDate: date || new Date().toISOString().split("T")[0],
      investmentType: sipAmount > 0 && lumpSum > 0 ? "both" : sipAmount > 0 ? "sip" : "lump",
      sipAmount,
      lumpSum,
      currentValue: currentValue || lumpSum || sipAmount,
      totalInvested: Math.max(lumpSum, sipAmount),
      units,
      folio,
      expenseRatio: estimateExpenseRatio(category, schemeName),
    });
  }

  return funds;
};

const buildPortfolioContext = (portfolio, user) => {
  const funds = portfolio.funds
    .map(
      (f) =>
        `- ${f.schemeName} (${f.category}) | Invested: Rs ${Math.round(f.totalInvested).toLocaleString("en-IN")} | Value: Rs ${Math.round(f.currentValue).toLocaleString("en-IN")} | XIRR: ${f.xirr?.toFixed(2) ?? "N/A"}% | Abs Return: ${f.absoluteReturn?.toFixed(2) ?? "N/A"}% | ER: ${f.expenseRatio}% | SIP: Rs ${f.sipAmount}/mo`
    )
    .join("\n");

  return `
USER PROFILE:
- Name: ${user.name}
- Risk Profile: ${user.riskProfile}
- Monthly Income: Rs ${(user.monthlyIncome || 0).toLocaleString("en-IN")}
- Monthly Expenses: Rs ${(user.monthlyExpenses || 0).toLocaleString("en-IN")}

PORTFOLIO SUMMARY:
- Total Invested: Rs ${Math.round(portfolio.totalInvested).toLocaleString("en-IN")}
- Current Value: Rs ${Math.round(portfolio.totalValue).toLocaleString("en-IN")}
- Gain/Loss: Rs ${Math.round(portfolio.totalGain).toLocaleString("en-IN")} (${portfolio.absoluteReturn?.toFixed(2)}%)
- XIRR: ${portfolio.xirr?.toFixed(2) ?? "N/A"}%
- Number of Funds: ${portfolio.funds.length}

FUND HOLDINGS:
${funds || "(No funds in portfolio)"}

USER GOALS:
${user.goals?.length ? user.goals.map((g) => `- ${g.name}: Rs ${g.targetAmt?.toLocaleString("en-IN")} by ${g.targetDate ? new Date(g.targetDate).getFullYear() : "N/A"}`).join("\n") : "Not specified"}
`.trim();
};

const gemini = {
  analyzePortfolio: async (portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const prompt = `You are an expert Indian financial advisor. Analyze this investor's mutual fund portfolio thoroughly.

${context}

Provide these sections in order:
1. PORTFOLIO HEALTH SCORE (0-100)
2. STRENGTHS
3. CRITICAL ISSUES
4. FUND OVERLAP ANALYSIS
5. EXPENSE RATIO IMPACT
6. REBALANCING PLAN
7. GOAL ALIGNMENT
8. ACTION STEPS

Use Indian investing context. Be direct, practical, and mention this is AI-generated and not regulated financial advice.`;

    return generate(MODELS.pro, prompt, 0.6, 4096);
  },

  chat: async (message, history, portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const systemInstruction = `You are Aryan, a warm Indian personal finance assistant. Be conversational, simple, and practical. Use the user's actual portfolio data where helpful. End with 2-3 actionable bullet points and a brief disclaimer for specific investment recommendations.

${context}`;

    const contents = [
      ...history.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await getAI().models.generateContent({
      model: MODELS.flash,
      contents,
      config: { temperature: 0.7, maxOutputTokens: 1024, systemInstruction },
    });

    return response.text;
  },

  quickInsights: async (portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const prompt = `You are a financial advisor. Based on this portfolio, generate exactly 4 short, actionable insights in JSON format.

${context}

Return ONLY a valid JSON array:
[
  {"type":"warning|info|success|danger","icon":"emoji","title":"Short title","body":"1-2 sentence insight with specific numbers"}
]`;

    const raw = await generate(MODELS.lite, prompt, 0.3, 512);
    return parseJSON(raw, "[");
  },

  parseStatement: async (text) => {
    const chunks = buildStatementChunks(text);
    if (!chunks.length) {
      throw new Error("Statement parsing failed: empty statement text");
    }

    const parsedAcrossChunks = [];
    const parseErrors = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const prompt = `You are an expert Indian mutual fund statement parser for CAMS and KFintech CAS PDFs.
Extract all mutual fund schemes present in this text chunk and return ONLY a valid JSON array.
Do not invent values. If a field is missing, set it to 0 or an empty string.

For each scheme extract:
- schemeName
- category from: "Large Cap","Mid Cap","Small Cap","Flexi Cap","Multi Cap","ELSS","Index Fund","Sectoral","Debt / Liquid","Hybrid","International","Other"
- startDate as YYYY-MM-DD
- investmentType as "sip","lump","both"
- sipAmount
- lumpSum
- currentValue
- totalInvested
- units
- folio
- expenseRatio

Statement text chunk ${index + 1} of ${chunks.length}:
${chunk}

Return ONLY the JSON array.`;

      try {
        const raw = await generate(MODELS.flash, prompt, 0.05, 3072);
        const parsed = parseJSON(raw, "[");
        if (Array.isArray(parsed) && parsed.length) {
          parsedAcrossChunks.push(...parsed);
        }
      } catch (err) {
        parseErrors.push(`chunk-${index + 1}: ${err.message}`);
      }
    }

    const mergedFunds = mergeParsedFunds(parsedAcrossChunks);
    if (mergedFunds.length) return mergedFunds;

    if (process.env.ALLOW_HEURISTIC_STATEMENT_PARSE === "true") {
      const fallbackFunds = mergeParsedFunds(parseStatementHeuristically(text));
      if (fallbackFunds.length) return fallbackFunds;
    }

    throw new Error(`Statement parsing failed: no reliable funds extracted${parseErrors.length ? ` (${parseErrors.join("; ")})` : ""}`);
  },

  sipRecommendation: async (goal, riskProfile, currentSIP, income) => {
    const prompt = `An Indian investor wants advice on SIP allocation.
Goal: ${goal.name} - Rs ${goal.targetAmt?.toLocaleString("en-IN")} by ${goal.targetDate ? new Date(goal.targetDate).getFullYear() : "N/A"}
Risk profile: ${riskProfile}
Current monthly SIP: Rs ${currentSIP.toLocaleString("en-IN")}
Monthly income: Rs ${income.toLocaleString("en-IN")}

Give a concise, practical SIP allocation recommendation for Indian mutual funds in under 150 words.`;

    return generate(MODELS.lite, prompt, 0.4, 512);
  },

  calculateXIRR: async (portfolio) => {
    const fundsData = portfolio.funds.map((f) => ({
      name: f.schemeName,
      category: f.category,
      totalInvested: f.totalInvested,
      currentValue: f.currentValue,
      sipAmount: f.sipAmount,
      startDate: f.startDate,
      expenseRatio: f.expenseRatio,
      transactions: (f.transactions || []).map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        units: t.units,
        nav: t.nav,
      })),
    }));

    const prompt = `You are an expert Indian financial analyst. Calculate the true XIRR for each mutual fund using all transaction dates and amounts.

Portfolio Data:
${JSON.stringify(fundsData, null, 2)}

Return ONLY valid JSON:
{
  "portfolioXIRR": <number>,
  "portfolioAbsoluteReturn": <number>,
  "xirrGap": <number>,
  "rupeeLostToGap": <number>,
  "breakdown": [{"fund":"<name>","xirr":<n>,"absoluteReturn":<n>,"invested":<n>,"currentValue":<n>,"xirrVsAbsoluteDiff":<n>}],
  "insight": "<1-2 sentence explanation>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1536);
    return parseJSON(raw, "{");
  },

  analyzeOverlap: async (portfolio) => {
    const fundsData = portfolio.funds.map((f) => ({
      name: f.schemeName,
      category: f.category,
      currentValue: f.currentValue,
      portfolioPct: portfolio.totalValue > 0 ? ((f.currentValue / portfolio.totalValue) * 100).toFixed(1) : 0,
    }));

    const prompt = `You are an expert Indian mutual fund analyst. Analyze overlap and real diversification in this portfolio.

Funds held:
${JSON.stringify(fundsData, null, 2)}

Return ONLY valid JSON:
{
  "diversificationScore": <0-100>,
  "estimatedUniqueStocks": <number>,
  "topHoldings": [{"stock":"<n>","estimatedPortfolioWeight":<n>,"funds":["<f1>","<f2>"]}],
  "overlappingPairs": [{"fund1":"<n>","fund2":"<n>","estimatedOverlap":<0-100>,"reason":"<why>"}],
  "verdict": "<summary>",
  "recommendation": "<action>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.2, 1536);
    return parseJSON(raw, "{");
  },

  analyzeExpenseDrain: async (portfolio) => {
    const fundsData = portfolio.funds.map((f) => ({
      name: f.schemeName,
      category: f.category,
      currentValue: f.currentValue,
      expenseRatio: f.expenseRatio,
      investmentType: f.investmentType,
    }));

    const prompt = `You are an Indian mutual fund cost analyst. Calculate expense ratio drag versus direct plans.

Funds held:
${JSON.stringify(fundsData, null, 2)}

Return ONLY valid JSON:
{
  "totalAnnualDrain": <number>,
  "total10YearDrain": <number>,
  "isOnRegularPlans": <boolean>,
  "breakdown": [{"fund":"<n>","currentExpenseRatio":<n>,"estimatedDirectER":<n>,"planType":"Regular|Direct","annualDrain":<n>,"drain10Year":<n>}],
  "verdict": "<impact>",
  "action": "<specific action>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1024);
    return parseJSON(raw, "{");
  },

  findTaxHarvesting: async (portfolio) => {
    const today = new Date().toISOString().split("T")[0];
    const fundsData = portfolio.funds.map((f) => ({
      name: f.schemeName,
      category: f.category,
      currentValue: f.currentValue,
      totalInvested: f.totalInvested,
      transactions: (f.transactions || []).map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        units: t.units,
        nav: t.nav,
      })),
    }));

    const prompt = `You are an Indian tax optimisation expert. Scan this portfolio for tax harvesting opportunities.

Today: ${today}
Portfolio:
${JSON.stringify(fundsData, null, 2)}

Return ONLY valid JSON:
{
  "totalTaxSaving": <number>,
  "opportunities": [{"fund":"<n>","lossType":"LTCL|STCL","unrealisedLoss":<n>,"taxSaving":<n>,"action":"<action>","urgency":"high|medium|low"}],
  "financialYearDeadline": "2026-03-31",
  "verdict": "<summary>",
  "disclaimer": "Tax harvesting involves costs. Consult a CA before acting."
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1536);
    return parseJSON(raw, "{");
  },
};

module.exports = gemini;
