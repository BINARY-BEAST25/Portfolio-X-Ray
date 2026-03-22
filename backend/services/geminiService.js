const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;

const getClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const getModel = () => getClient().getGenerativeModel({ model: "gemini-2.5-flash" });

// ── Shared prompt builder ────────────────────────────
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
  // ── Full AI portfolio analysis ─────────────────────
  analyzePortfolio: async (portfolio, user) => {
    const model   = getModel();
    const context = buildPortfolioContext(portfolio, user);

    const prompt = `You are an expert Indian SEBI-registered financial advisor. Analyze this investor's mutual fund portfolio thoroughly.

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

    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  // ── Chat response with portfolio context ───────────
  chat: async (message, history, portfolio, user) => {
    const model   = getModel();
    const context = buildPortfolioContext(portfolio, user);

    const systemInstruction = `You are Aryan, a warm and knowledgeable Indian personal finance AI assistant. You have deep expertise in mutual funds, SIPs, taxes, and Indian financial planning. Be conversational, use simple language, and reference the user's actual portfolio data when relevant. Always end with 2-3 actionable bullet points. Keep responses concise (3-4 paragraphs max). Use ₹, L (lakhs), Cr (crores). Add a brief disclaimer for specific investment recommendations.

${context}`;

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      systemInstruction,
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  },

  // ── Quick insights for dashboard ──────────────────
  quickInsights: async (portfolio, user) => {
    const model   = getModel();
    const context = buildPortfolioContext(portfolio, user);

    const prompt = `You are a financial advisor. Based on this portfolio, generate exactly 4 short, actionable insights in JSON format.

${context}

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {"type": "warning|info|success|danger", "icon": "emoji", "title": "Short title", "body": "1-2 sentence insight with specific numbers"},
  ...
]`;

    const result = await model.generateContent(prompt);
    const raw    = result.response.text().replace(/```json|```/gi, "").trim();
    const start  = raw.indexOf("["), end = raw.lastIndexOf("]");
    if (start === -1) throw new Error("Invalid JSON from Gemini");
    return JSON.parse(raw.slice(start, end + 1));
  },

  // ── Parse CAMS/KFintech statement text ─────────────
  parseStatement: async (text) => {
    const model = getModel();

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

    const result = await model.generateContent(prompt);
    const raw    = result.response.text().replace(/```json|```/gi, "").trim();
    const start  = raw.indexOf("["), end = raw.lastIndexOf("]");
    if (start === -1) throw new Error("Could not parse statement");
    return JSON.parse(raw.slice(start, end + 1));
  },

  // ── SIP recommendation ────────────────────────────
  sipRecommendation: async (goal, riskProfile, currentSIP, income) => {
    const model  = getModel();
    const prompt = `An Indian investor wants advice on SIP allocation.
Goal: ${goal.name} — ₹${goal.targetAmt?.toLocaleString("en-IN")} by ${goal.targetDate ? new Date(goal.targetDate).getFullYear() : "N/A"}
Risk profile: ${riskProfile}
Current monthly SIP: ₹${currentSIP.toLocaleString("en-IN")}
Monthly income: ₹${income.toLocaleString("en-IN")}

Give a specific SIP recommendation: which fund categories, what percentage allocation, and exact fund types (e.g., "40% Large Cap Index Fund, 30% Flexi Cap, 20% Mid Cap, 10% Debt"). Keep it concise, practical, and specific to Indian mutual funds. Max 150 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
};

module.exports = gemini;
