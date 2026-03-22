const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  date:   { type: Date,   required: true },
  type:   { type: String, enum: ["purchase","redemption","switch_in","switch_out","dividend"], required: true },
  amount: { type: Number, required: true },
  units:  { type: Number, default: 0 },
  nav:    { type: Number, default: 0 },
  note:   { type: String, default: "" },
});

const FundHoldingSchema = new mongoose.Schema({
  schemeCode:     { type: String, required: true },
  schemeName:     { type: String, required: true },
  category: {
    type: String,
    enum: ["Large Cap","Mid Cap","Small Cap","Flexi Cap","Multi Cap","ELSS","Index Fund",
           "Sectoral","Debt / Liquid","Hybrid","International","Other"],
    default: "Other",
  },
  investmentType: { type: String, enum: ["sip","lump","both"], default: "sip" },
  sipAmount:      { type: Number, default: 0 },
  lumpSum:        { type: Number, default: 0 },
  units:          { type: Number, default: 0 },
  startDate:      { type: Date,   required: true },
  expenseRatio:   { type: Number, default: 0.5 },
  folio:          { type: String, default: "" },
  // Cached live data (refreshed on each analysis)
  lastNAV:          { type: Number, default: 0 },
  lastNAVDate:      { type: Date },
  currentValue:     { type: Number, default: 0 },
  totalInvested:    { type: Number, default: 0 },
  xirr:             { type: Number },
  absoluteReturn:   { type: Number },
  transactions:     [TransactionSchema],
});

const PortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    funds: [FundHoldingSchema],
    lastAnalysis: {
      generatedAt: Date,
      summary:     String,
      insights:    [String],
      riskScore:   Number,
      healthScore: Number,
      rebalancingPlan: String,
    },
    totalInvested:  { type: Number, default: 0 },
    totalValue:     { type: Number, default: 0 },
    totalGain:      { type: Number, default: 0 },
    absoluteReturn: { type: Number, default: 0 },
    xirr:           { type: Number },
  },
  { timestamps: true }
);

// ── Recalculate totals before save ───────────────────
PortfolioSchema.pre("save", function (next) {
  this.totalInvested  = this.funds.reduce((s, f) => s + (f.totalInvested  || 0), 0);
  this.totalValue     = this.funds.reduce((s, f) => s + (f.currentValue   || 0), 0);
  this.totalGain      = this.totalValue - this.totalInvested;
  this.absoluteReturn = this.totalInvested > 0 ? (this.totalGain / this.totalInvested) * 100 : 0;
  next();
});

module.exports = mongoose.model("Portfolio", PortfolioSchema);
