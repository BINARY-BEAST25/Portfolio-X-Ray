const express   = require("express");
const rateLimit = require("express-rate-limit");
const Portfolio = require("../models/Portfolio");
const gemini    = require("../services/geminiService");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Rate-limit AI endpoints (expensive)
const aiLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: "Too many AI requests – wait 1 minute" },
});

// ── GET /api/analysis/full ────────────────────────────
// Full Gemini portfolio analysis
router.get("/full", aiLimit, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio || !portfolio.funds.length) {
      return res.status(400).json({ success: false, message: "Add funds to your portfolio first" });
    }

    const analysis = await gemini.analyzePortfolio(portfolio, req.user);

    // Save to portfolio
    portfolio.lastAnalysis = {
      generatedAt: new Date(),
      summary: analysis.slice(0, 500),
      healthScore: extractHealthScore(analysis),
    };
    await portfolio.save();

    res.json({ success: true, analysis, generatedAt: new Date() });
  } catch (err) {
    console.error("Gemini analysis error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Gemini AI error" });
  }
});

// ── GET /api/analysis/insights ────────────────────────
// Quick 4-card insights
router.get("/insights", aiLimit, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio || !portfolio.funds.length) {
      return res.json({ success: true, insights: [] });
    }
    const insights = await gemini.quickInsights(portfolio, req.user);
    res.json({ success: true, insights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/analysis/chat ───────────────────────────
// Chat message with portfolio context
router.post("/chat", aiLimit, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: "Message required" });

    const portfolio = await Portfolio.findOne({ user: req.user._id }) ||
      { funds: [], totalInvested: 0, totalValue: 0, totalGain: 0, absoluteReturn: 0 };

    const reply = await gemini.chat(message, history, portfolio, req.user);
    res.json({ success: true, reply });
  } catch (err) {
    console.error("Gemini chat error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/analysis/parse-statement ───────────────
// Parse CAMS/KFintech PDF text
router.post("/parse-statement", aiLimit, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.length < 200) {
      return res.status(400).json({ success: false, message: "PDF text too short" });
    }
    const funds = await gemini.parseStatement(text);
    res.json({ success: true, funds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/analysis/sip-recommendation ────────────
router.post("/sip-recommendation", aiLimit, async (req, res) => {
  try {
    const { goal, riskProfile, currentSIP, income } = req.body;
    const rec = await gemini.sipRecommendation(goal, riskProfile, currentSIP, income);
    res.json({ success: true, recommendation: rec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: extract health score from analysis text
function extractHealthScore(text) {
  const match = text.match(/health\s+score[:\s]+(\d+)/i);
  return match ? parseInt(match[1]) : 70;
}

module.exports = router;
