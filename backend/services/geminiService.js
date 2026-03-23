const { GoogleGenAI } = require("@google/genai");

// ── Single AI client (lazy init) ──────────────────────────────────────────────
let ai = null;

const getAI = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env");
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

// ── Model name constants ───────────────────────────────────────────────────────
// gemini-3.1-pro-preview    → deep reasoning, complex multi-section analysis
// gemini-3-flash-preview    → fast, structured JSON tasks, chat, PDF parsing
// gemini-2.5-flash-lite     → cheapest/fastest, simple one-shot tasks
const MODELS = {
  pro:   "gemini-3.1-pro-preview",
  flash: "gemini-3-flash-preview",
  lite:  "gemini-2.5-flash-lite",
};

// ── Core helper: generate content with config ─────────────────────────────────
const generate = async (model, contents, temperature = 0.2, maxOutputTokens = 2048, systemInstruction) => {
  const config = { temperature, maxOutputTokens };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  const response = await getAI().models.generateContent({ model, contents, config });
  return response.text;
};

// ── JSON parse helper ─────────────────────────────────────────────────────────
const parseJSON = (raw, opener = "[") => {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const start   = cleaned.indexOf(opener);
  const end     = opener === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (start === -1) throw new Error(`Invalid JSON from Gemini — opener "${opener}" not found`);
  return JSON.parse(cleaned.slice(start, end + 1));
};

// ── Shared portfolio context builder ──────────────────────────────────────────
const buildPortfolioContext = (portfolio, user) => {
  const funds = portfolio.funds.map(f =>
    `• ${f.schemeName} (${f.category}) | Invested: ₹${Math.round(f.totalInvested).toLocaleString("en-IN")} | Value: ₹${Math.round(f.currentValue).toLocaleString("en-IN")} | XIRR: ${f.xirr?.toFixed(2) ?? "N/A"}% | Abs Return: ${f.absoluteReturn?.toFixed(2) ?? "N/A"}% | ER: ${f.expenseRatio}% | SIP: ₹${f.sipAmount}/mo`
  ).join("\n");

  return `
USER PROFILE:
- Name: ${user.name}
- Risk Profile: ${user.riskProfile}
- Monthly Income: ₹${(user.monthlyIncome || 0).toLocaleString("en-IN")}
- Monthly Expenses: ₹${(user.monthlyExpenses || 0).toLocaleString("en-IN")}

PORTFOLIO SUMMARY:
- Total Invested: ₹${Math.round(portfolio.totalInvested).toLocaleString("en-IN")}
- Current Value: ₹${Math.round(portfolio.totalValue).toLocaleString("en-IN")}
- Gain/Loss: ₹${Math.round(portfolio.totalGain).toLocaleString("en-IN")} (${portfolio.absoluteReturn?.toFixed(2)}%)
- XIRR: ${portfolio.xirr?.toFixed(2) ?? "N/A"}%
- Number of Funds: ${portfolio.funds.length}

FUND HOLDINGS:
${funds || "(No funds in portfolio)"}

USER GOALS:
${user.goals?.length ? user.goals.map(g => `• ${g.name}: ₹${g.targetAmt?.toLocaleString("en-IN")} by ${g.targetDate ? new Date(g.targetDate).getFullYear() : "N/A"}`).join("\n") : "Not specified"}
`.trim();
};

const gemini = {

  // ── Full portfolio analysis — gemini-3.1-pro-preview (deepest reasoning) ────
  analyzePortfolio: async (portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const prompt  = `You are an expert Indian SEBI-registered financial advisor. Analyze this investor's mutual fund portfolio thoroughly.

${context}

Provide a comprehensive analysis with these exact sections. Be specific — use their actual numbers.

1. PORTFOLIO HEALTH SCORE (0-100): Give a score with justification.

2. STRENGTHS (3-4 points): What they're doing well.

3. CRITICAL ISSUES (3-5 points): Problems that need immediate attention — overweighting, overlap, high ER, poor performers.

4. FUND OVERLAP ANALYSIS: Identify which funds likely hold similar stocks (Large Cap + Flexi Cap funds often overlap 40-50%).

5. EXPENSE RATIO IMPACT: Calculate the annual ER cost and 10-year impact vs index funds at 0.1%.

6. REBALANCING PLAN: Specific allocation targets — which funds to increase SIP, which to stop, which to switch.

7. GOAL ALIGNMENT: Are their investments aligned with their stated goals and risk profile?

8. ACTION STEPS (numbered, concrete): 5 immediate steps they should take this week.

Format each section with the header in CAPS followed by the content. Be direct, actionable, and use Indian financial context (₹, NSE, BSE, SEBI, AMFI). Mention that this is AI-generated analysis and not SEBI-registered advice.`;

    return generate(MODELS.pro, prompt, 0.6, 4096);
  },

  // ── Chat — gemini-3-flash-preview (conversational, balanced) ─────────────────
  chat: async (message, history, portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const systemInstruction = `You are Aryan, a warm and knowledgeable Indian personal finance AI assistant. You have deep expertise in mutual funds, SIPs, taxes, and Indian financial planning. Be conversational, use simple language, and reference the user's actual portfolio data when relevant. Always end with 2-3 actionable bullet points. Keep responses concise (3-4 paragraphs max). Use ₹, L (lakhs), Cr (crores). Add a brief disclaimer for specific investment recommendations.

${context}`;

    const contents = [
      ...history.map(h => ({
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

  // ── Quick insights — gemini-2.5-flash-lite (fast, cheap, 4 cards) ────────────
  quickInsights: async (portfolio, user) => {
    const context = buildPortfolioContext(portfolio, user);
    const prompt  = `You are a financial advisor. Based on this portfolio, generate exactly 4 short, actionable insights in JSON format.

${context}

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {"type": "warning|info|success|danger", "icon": "emoji", "title": "Short title", "body": "1-2 sentence insight with specific numbers"},
  ...
]`;

    const raw = await generate(MODELS.lite, prompt, 0.3, 512);
    return parseJSON(raw, "[");
  },

  // ── Parse CAMS statement — gemini-3-flash-preview (precise extraction) ────────
  parseStatement: async (text) => {
    const trimmed = text.length > 14000
      ? text.slice(0, 7500) + "\n...\n" + text.slice(-6000)
      : text;

    const prompt = `You are an expert Indian mutual fund statement parser for CAMS and KFintech CAS PDFs.
Extract ALL mutual fund schemes and return ONLY a valid JSON array — zero text outside JSON.

For each scheme extract:
- schemeName: exact scheme name
- category: one of "Large Cap"|"Mid Cap"|"Small Cap"|"Flexi Cap"|"Multi Cap"|"ELSS"|"Index Fund"|"Sectoral"|"Debt / Liquid"|"Hybrid"|"International"|"Other"
- startDate: first transaction date "YYYY-MM-DD"
- investmentType: "sip"|"lump"|"both"
- sipAmount: monthly SIP (0 if none)
- lumpSum: largest lump sum (0 if none)
- currentValue: current market value ₹
- totalInvested: sum of all purchases ₹
- units: units held (0 if not found)
- folio: folio number
- expenseRatio: estimate (direct large/flexi≈0.5, mid/small≈0.6, index≈0.1, regular+0.8, debt≈0.2)

Statement text:
${trimmed}

Return ONLY the JSON array.`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 2048);
    return parseJSON(raw, "[");
  },

  // ── SIP recommendation — gemini-2.5-flash-lite (simple, fast) ────────────────
  sipRecommendation: async (goal, riskProfile, currentSIP, income) => {
    const prompt = `An Indian investor wants advice on SIP allocation.
Goal: ${goal.name} — ₹${goal.targetAmt?.toLocaleString("en-IN")} by ${goal.targetDate ? new Date(goal.targetDate).getFullYear() : "N/A"}
Risk profile: ${riskProfile}
Current monthly SIP: ₹${currentSIP.toLocaleString("en-IN")}
Monthly income: ₹${income.toLocaleString("en-IN")}

Give a specific SIP recommendation: which fund categories, what percentage allocation, and exact fund types (e.g., "40% Large Cap Index Fund, 30% Flexi Cap, 20% Mid Cap, 10% Debt"). Keep it concise, practical, and specific to Indian mutual funds. Max 150 words.`;

    return generate(MODELS.lite, prompt, 0.4, 512);
  },

  // ── True XIRR — gemini-3-flash-preview (structured JSON, math-focused) ────────
  calculateXIRR: async (portfolio) => {
    const fundsData = portfolio.funds.map(f => ({
      name: f.schemeName, category: f.category,
      totalInvested: f.totalInvested, currentValue: f.currentValue,
      sipAmount: f.sipAmount, startDate: f.startDate, expenseRatio: f.expenseRatio,
      transactions: (f.transactions || []).map(t => ({
        date: t.date, type: t.type, amount: t.amount, units: t.units, nav: t.nav,
      })),
    }));

    const prompt = `You are an expert Indian financial analyst. Calculate the TRUE XIRR (Extended Internal Rate of Return) for each mutual fund using all transaction dates and amounts. XIRR accounts for exact SIP dates unlike simple CAGR.

Portfolio Data:
${JSON.stringify(fundsData, null, 2)}

For each fund compute:
1. True XIRR % (cashflow dates: negative for purchases, positive for redemptions, current value as final positive cashflow today)
2. Compare against simple absolute return %
3. Identify the XIRR gap (how much the app/platform overstates returns)

Return ONLY valid JSON (no markdown):
{
  "portfolioXIRR": <number>,
  "portfolioAbsoluteReturn": <number>,
  "xirrGap": <number>,
  "rupeeLostToGap": <number>,
  "breakdown": [{"fund":"<name>","xirr":<n>,"absoluteReturn":<n>,"invested":<n>,"currentValue":<n>,"xirrVsAbsoluteDiff":<n>}],
  "insight": "<1-2 sentence plain-English explanation>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1536);
    return parseJSON(raw, "{");
  },

  // ── Fund Overlap — gemini-3-flash-preview (knowledge-based estimation) ────────
  analyzeOverlap: async (portfolio) => {
    const fundsData = portfolio.funds.map(f => ({
      name: f.schemeName, category: f.category, currentValue: f.currentValue,
      portfolioPct: portfolio.totalValue > 0
        ? ((f.currentValue / portfolio.totalValue) * 100).toFixed(1) : 0,
    }));

    const prompt = `You are an expert Indian mutual fund analyst. Analyze the ILLUSION OF DIVERSIFICATION in this portfolio.

Funds held:
${JSON.stringify(fundsData, null, 2)}

Based on known AMFI portfolio disclosures:
1. Identify which stocks are likely held across MULTIPLE funds (HDFC Bank, Reliance, Infosys appear in most large/flexi cap funds)
2. Estimate the portfolio-weighted concentration of top stocks
3. Identify overlapping fund pairs
4. Give a diversification score (0=highly concentrated, 100=truly diversified)

Return ONLY valid JSON (no markdown):
{
  "diversificationScore": <0-100>,
  "estimatedUniqueStocks": <number>,
  "topHoldings": [{"stock":"<n>","estimatedPortfolioWeight":<n>,"funds":["<f1>","<f2>"]}],
  "overlappingPairs": [{"fund1":"<n>","fund2":"<n>","estimatedOverlap":<0-100>,"reason":"<why>"}],
  "verdict": "<1-sentence plain-English verdict>",
  "recommendation": "<specific action to truly diversify>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.2, 1536);
    return parseJSON(raw, "{");
  },

  // ── Expense Drain — gemini-3-flash-preview (deterministic calc) ──────────────
  analyzeExpenseDrain: async (portfolio) => {
    const fundsData = portfolio.funds.map(f => ({
      name: f.schemeName, category: f.category,
      currentValue: f.currentValue, expenseRatio: f.expenseRatio, investmentType: f.investmentType,
    }));

    const prompt = `You are an Indian mutual fund cost analyst. Calculate the EXPENSE RATIO DRAIN (money lost to fees vs switching to Direct plans).

Funds held:
${JSON.stringify(fundsData, null, 2)}

For each fund:
- Estimate if Regular (ER > 1.0% for equity = likely Regular) or Direct
- Direct plan ER is typically ~0.8-1.2% lower than Regular
- Annual drain = currentValue × (regularER - directER) / 100
- 10-year drain: compound at 12% gross returns

Return ONLY valid JSON (no markdown):
{
  "totalAnnualDrain": <number>,
  "total10YearDrain": <number>,
  "isOnRegularPlans": <boolean>,
  "breakdown": [{"fund":"<n>","currentExpenseRatio":<n>,"estimatedDirectER":<n>,"planType":"Regular|Direct","annualDrain":<n>,"drain10Year":<n>}],
  "verdict": "<1-sentence impact statement>",
  "action": "<specific funds to switch to Direct and how>"
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1024);
    return parseJSON(raw, "{");
  },

  // ── Tax Harvesting — gemini-3-flash-preview (rule-based, deterministic) ───────
  findTaxHarvesting: async (portfolio) => {
    const today     = new Date().toISOString().split("T")[0];
    const fundsData = portfolio.funds.map(f => ({
      name: f.schemeName, category: f.category,
      currentValue: f.currentValue, totalInvested: f.totalInvested,
      transactions: (f.transactions || []).map(t => ({
        date: t.date, type: t.type, amount: t.amount, units: t.units, nav: t.nav,
      })),
    }));

    const prompt = `You are an Indian tax-optimisation expert (FY 2024-25 rules). Scan this portfolio for TAX HARVESTING opportunities.

Today: ${today}
Portfolio:
${JSON.stringify(fundsData, null, 2)}

Indian Capital Gains rules:
- Equity held > 1 year: LTCG @ 12.5% (above ₹1.25L yearly exemption)
- Equity held ≤ 1 year: STCG @ 20%
- Debt: STCG at slab rate
Tax Harvesting: Book unrealised losses to offset gains. Redeem losing lots → reinvest after 30 days.

Return ONLY valid JSON (no markdown):
{
  "totalTaxSaving": <number>,
  "opportunities": [{"fund":"<n>","lossType":"LTCL|STCL","unrealisedLoss":<n>,"taxSaving":<n>,"action":"<e.g. Redeem ₹X and reinvest after 30 days>","urgency":"high|medium|low"}],
  "financialYearDeadline": "2025-03-31",
  "verdict": "<1-sentence summary>",
  "disclaimer": "Tax harvesting involves transaction costs. Consult a CA before acting."
}`;

    const raw = await generate(MODELS.flash, prompt, 0.1, 1536);
    return parseJSON(raw, "{");
  },
};

module.exports = gemini;
