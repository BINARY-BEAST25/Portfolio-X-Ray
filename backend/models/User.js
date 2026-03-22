const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    phone: { type: String, default: "" },
    pan: {
      type: String,
      default: "",
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$|^$/, "Enter a valid PAN"],
    },
    riskProfile: {
      type: String,
      enum: ["conservative", "moderate", "aggressive"],
      default: "moderate",
    },
    monthlyIncome:   { type: Number, default: 0 },
    monthlyExpenses: { type: Number, default: 0 },
    goals: [
      {
        name:       String,
        targetAmt:  Number,
        targetDate: Date,
        priority:   { type: String, enum: ["low","medium","high"], default: "medium" },
      },
    ],
    resetPasswordToken:   String,
    resetPasswordExpire:  Date,
  },
  { timestamps: true }
);

// ── Hash password before save ────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare entered password ─────────────────────────
UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ── Generate signed JWT ──────────────────────────────
UserSchema.methods.getSignedJWT = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

module.exports = mongoose.model("User", UserSchema);
