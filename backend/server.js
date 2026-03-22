require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const connectDB  = require("./config/db");

// ── Routes ───────────────────────────────────────────
const authRoutes     = require("./routes/auth");
const portfolioRoutes= require("./routes/portfolio");
const fundsRoutes    = require("./routes/funds");
const analysisRoutes = require("./routes/analysis");

const app = express();

// ── Connect DB ───────────────────────────────────────
connectDB();

// ── Global Middleware ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));   // allow large PDF text
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Global rate limiter ──────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: "Too many requests, slow down" },
}));

// ── API Routes ───────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/portfolio",portfolioRoutes);
app.use("/api/funds",    fundsRoutes);
app.use("/api/analysis", analysisRoutes);

// ── Health check ─────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, status: "OK", time: new Date() })
);

// ── 404 handler ──────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// ── Error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

// ── Start server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Gemini API  : ${process.env.GEMINI_API_KEY ? "✅ configured" : "❌ missing"}`);
  console.log(`   MongoDB     : connecting…`);
});

module.exports = app;
