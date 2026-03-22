const express   = require("express");
const Portfolio = require("../models/Portfolio");
const { protect } = require("../middleware/auth");
const mfapi     = require("../services/mfapiService");

const router = express.Router();
router.use(protect);

// ── XIRR helper ──────────────────────────────────────
function calcXIRR(flows) {
  if (!flows || flows.length < 2) return null;
  const t0 = flows[0].date.getTime();
  const yrs = flows.map(c => (c.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000));
  const amt  = flows.map(c => c.amount);
  const f   = r => amt.reduce((s, a, i) => s + a / Math.pow(1 + r, yrs[i]), 0);
  const df  = r => amt.reduce((s, a, i) => s - yrs[i] * a / Math.pow(1 + r, yrs[i] + 1), 0);
  let r = 0.15;
  for (let i = 0; i < 300; i++) {
    const fv = f(r), dfv = df(r);
    if (Math.abs(dfv) < 1e-12) break;
    const nr = r - fv / dfv;
    if (Math.abs(nr - r) < 1e-9) return isFinite(nr) && nr > -1 ? +(nr * 100).toFixed(2) : null;
    r = nr < -0.99 ? -0.5 : nr > 200 ? 10 : nr;
  }
  return null;
}

function totalInvested(fund) {
  let inv = 0;
  if (fund.investmentType !== "sip")  inv += (fund.lumpSum || 0);
  if (fund.investmentType !== "lump" && fund.sipAmount > 0) {
    const start = new Date(fund.startDate);
    const today = new Date();
    let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (d <= today) { inv += fund.sipAmount; d.setMonth(d.getMonth() + 1); }
  }
  return inv;
}

function buildCashflows(fund) {
  const flows = [];
  const start = new Date(fund.startDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (isNaN(start.getTime())) return null;
  if (fund.investmentType !== "sip")  flows.push({ date: new Date(start), amount: -(fund.lumpSum || 0) });
  if (fund.investmentType !== "lump" && fund.sipAmount > 0) {
    let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (d <= today) { flows.push({ date: new Date(d), amount: -fund.sipAmount }); d.setMonth(d.getMonth() + 1); }
  }
  if (fund.currentValue > 0) flows.push({ date: new Date(today), amount: fund.currentValue });
  return flows.length >= 2 ? flows : null;
}

// ── Refresh live NAV for all funds ───────────────────
async function refreshNAVs(portfolio) {
  const codes = portfolio.funds.filter(f => f.schemeCode).map(f => f.schemeCode);
  if (!codes.length) return;
  const navMap = await mfapi.bulkNAV(codes);

  for (const fund of portfolio.funds) {
    if (!fund.schemeCode) continue;
    const live = navMap[fund.schemeCode];
    if (live) {
      fund.lastNAV     = live.nav;
      fund.lastNAVDate = new Date();
      if (fund.units > 0) fund.currentValue = fund.units * live.nav;
    }
    fund.totalInvested = totalInvested(fund);
    const flows = buildCashflows(fund);
    fund.xirr = calcXIRR(flows);
    fund.absoluteReturn = fund.totalInvested > 0
      ? ((fund.currentValue - fund.totalInvested) / fund.totalInvested) * 100
      : 0;
  }
}

// ── GET /api/portfolio ────────────────────────────────
router.get("/", async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ user: req.user._id, funds: [] });
    }
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/portfolio/refresh ────────────────────────
router.get("/refresh", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });
    await refreshNAVs(portfolio);
    await portfolio.save();
    res.json({ success: true, portfolio, message: "NAVs refreshed from mfapi.in" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/portfolio/fund ──────────────────────────
router.post("/fund", async (req, res) => {
  try {
    // ✅ FIX 1: Normalize schemeCode — handle both 'schemeCode' and 'Scheme_Code' (mfapi format)
    const schemeCode = req.body.schemeCode
      || req.body.Scheme_Code
      || req.body.scheme_code
      || req.body.code
      || null;

    // ✅ FIX 2: Fail fast with a clear message before touching the DB
    if (!schemeCode || String(schemeCode).trim() === "") {
      return res.status(400).json({ success: false, message: "schemeCode is required. Please select a valid fund." });
    }

    const {
      schemeName,
      category,
      startDate,
      investmentType,
      sipAmount,
      lumpSum,
      units,
      currentValue,
      expenseRatio,
      folio
    } = req.body;

    // ✅ FIX 3: Validate other required fields early
    if (!startDate || isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, message: "A valid startDate is required." });
    }

    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) portfolio = await Portfolio.create({ user: req.user._id, funds: [] });

   // Skip silently if fund already exists
const duplicate = portfolio.funds.find(f => f.schemeCode === String(schemeCode).trim());
if (duplicate) {
  return res.status(200).json({ success: true, portfolio, message: `Fund ${schemeCode} already in your portfolio — skipped.` });
}

    // Fetch live NAV if schemeCode provided
    let liveNAV = 0, liveDate = null;
    const live = await mfapi.liveNAV(String(schemeCode).trim()).catch(() => null);
    if (live) { liveNAV = live.nav; liveDate = new Date(); }

    const calcValue = (units && liveNAV) ? Number(units) * liveNAV : (Number(currentValue) || 0);

    const newFund = {
      schemeCode:     String(schemeCode).trim(),   // ✅ always a clean string
      schemeName:     schemeName || "",
      category:       category   || "Other",
      startDate:      new Date(startDate),
      investmentType: investmentType || "sip",
      sipAmount:      Number(sipAmount)    || 0,
      lumpSum:        Number(lumpSum)      || 0,
      units:          Number(units)        || 0,
      currentValue:   calcValue,
      expenseRatio:   Number(expenseRatio) || 0.5,
      folio:          folio || "",
      lastNAV:        liveNAV,
      lastNAVDate:    liveDate,
    };

    newFund.totalInvested = totalInvested(newFund);
    const flows = buildCashflows(newFund);
    newFund.xirr = calcXIRR(flows);
    newFund.absoluteReturn = newFund.totalInvested > 0
      ? ((newFund.currentValue - newFund.totalInvested) / newFund.totalInvested) * 100
      : 0;

    portfolio.funds.push(newFund);
    await portfolio.save();
    res.status(201).json({ success: true, portfolio });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /api/portfolio/fund/:fundId ──────────────────
router.put("/fund/:fundId", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });

    const fund = portfolio.funds.id(req.params.fundId);
    if (!fund) return res.status(404).json({ success: false, message: "Fund not found" });

    // ✅ FIX 5: Normalize schemeCode on update too
    if (req.body.schemeCode !== undefined || req.body.Scheme_Code !== undefined) {
      const updatedCode = req.body.schemeCode || req.body.Scheme_Code || req.body.scheme_code;
      if (!updatedCode || String(updatedCode).trim() === "") {
        return res.status(400).json({ success: false, message: "schemeCode cannot be empty." });
      }
      fund.schemeCode = String(updatedCode).trim();
    }

    const allowed = ["schemeName", "category", "startDate", "investmentType",
                     "sipAmount", "lumpSum", "units", "currentValue", "expenseRatio", "folio"];
    allowed.forEach(k => { if (req.body[k] !== undefined) fund[k] = req.body[k]; });

    fund.totalInvested = totalInvested(fund);
    const flows = buildCashflows(fund);
    fund.xirr = calcXIRR(flows);
    fund.absoluteReturn = fund.totalInvested > 0
      ? ((fund.currentValue - fund.totalInvested) / fund.totalInvested) * 100
      : 0;

    await portfolio.save();
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/portfolio/fund/:fundId ───────────────
router.delete("/fund/:fundId", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });

    portfolio.funds = portfolio.funds.filter(f => f._id.toString() !== req.params.fundId);
    await portfolio.save();
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;