const express = require("express");
const { body, validationResult } = require("express-validator");
const User      = require("../models/User");
const Portfolio = require("../models/Portfolio");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ── Helper: send token response ──────────────────────
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedJWT();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:           user._id,
      name:         user.name,
      email:        user.email,
      phone:        user.phone,
      pan:          user.pan,
      riskProfile:  user.riskProfile,
      monthlyIncome: user.monthlyIncome,
      goals:        user.goals,
      createdAt:    user.createdAt,
    },
  });
};

// ── POST /api/auth/register ──────────────────────────
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      const user = await User.create({ name, email, password });
      // Create empty portfolio for new user
      await Portfolio.create({ user: user._id, funds: [] });
      sendToken(user, 201, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email }).select("+password");
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      sendToken(user, 200, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ── GET /api/auth/me ─────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PUT /api/auth/profile ────────────────────────────
router.put("/profile", protect, async (req, res) => {
  const allowed = ["name","phone","pan","riskProfile","monthlyIncome","monthlyExpenses","goals"];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  try {
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true,
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /api/auth/password ───────────────────────────
router.put("/password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Both passwords required" });
  }
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: "Current password incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password min 6 chars" });
    }
    user.password = newPassword;
    await user.save();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
