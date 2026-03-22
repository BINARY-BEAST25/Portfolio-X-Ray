const express = require("express");
const mfapi   = require("../services/mfapiService");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// GET /api/funds/search?q=mirae
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, results: [] });
    const results = await mfapi.search(q);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/funds/all  (all schemes list)
router.get("/all", async (req, res) => {
  try {
    const data = await mfapi.allSchemes();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/funds/:code  (live NAV + full history)
router.get("/:code", async (req, res) => {
  try {
    const data = await mfapi.scheme(req.params.code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/funds/:code/nav  (live NAV only)
router.get("/:code/nav", async (req, res) => {
  try {
    const live = await mfapi.liveNAV(req.params.code);
    if (!live) return res.status(404).json({ success: false, message: "NAV not found" });
    res.json({ success: true, ...live });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/funds/:code/history?days=365
router.get("/:code/history", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;
    const history = await mfapi.history(req.params.code, days);
    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/funds/bulk-nav  body: { codes: ["119551","118989",...] }
router.post("/bulk-nav", async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes)) return res.status(400).json({ success: false, message: "codes array required" });
    const navMap = await mfapi.bulkNAV(codes);
    res.json({ success: true, navMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
