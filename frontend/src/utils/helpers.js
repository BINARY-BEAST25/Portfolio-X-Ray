// ── Formatters ────────────────────────────────────────
export const fmtINR = (n, dec = 0) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

export const fmtL = (n) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
};

export const fmtPct = (n, showPlus = true) => {
  if (n == null) return "—";
  const sign = n > 0 && showPlus ? "+" : "";
  return `${sign}${Number(n).toFixed(2)}%`;
};

export const fmtNAV = (n) =>
  n == null ? "—" : `₹${Number(n).toFixed(4)}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Financial Math ────────────────────────────────────
export const sipFV = (monthly, pctPA, years) => {
  if (!monthly || !years) return 0;
  const r = pctPA / 100 / 12;
  const n = years * 12;
  return r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};

export const requiredSIP = (target, pctPA, years) => {
  if (!target || !years) return 0;
  const r = pctPA / 100 / 12;
  const n = years * 12;
  return r === 0 ? target / n : target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
};

export const retirementCorpus = (monthlyExp, inflation, yearsToRetire) => {
  const inflated = monthlyExp * Math.pow(1 + inflation / 100, yearsToRetire);
  const r = 0.07, n = 25;
  return inflated * 12 * ((1 - Math.pow(1 + r, -n)) / r);
};

// ── Category colours ──────────────────────────────────
export const CAT_COLORS = {
  "Large Cap":    "#00e5a0",
  "Mid Cap":      "#5b8ff9",
  "Small Cap":    "#ffb830",
  "Flexi Cap":    "#f472b6",
  "Multi Cap":    "#38bdf8",
  "ELSS":         "#34d399",
  "Index Fund":   "#a78bfa",
  "Sectoral":     "#fb923c",
  "Debt / Liquid":"#64748b",
  "Hybrid":       "#c084fc",
  "International":"#22d3ee",
  "Other":        "#94a3b8",
};

export const CATS = Object.keys(CAT_COLORS);

// ── Design tokens ─────────────────────────────────────
export const T = {
  bg:       "#05111f",
  surf:     "#0b1929",
  surfHi:   "#0e2035",
  border:   "#162d47",
  borderB:  "#1a3a5c",
  text:     "#e2ecf8",
  sub:      "#4d7090",
  muted:    "#1e3650",
  green:    "#00e5a0",
  greenDim: "rgba(0,229,160,0.08)",
  greenBd:  "rgba(0,229,160,0.2)",
  red:      "#ff5b5b",
  amber:    "#ffb830",
  blue:     "#5b8ff9",
  purple:   "#a78bfa",
  cyan:     "#22d3ee",
};

// ── Style helpers ─────────────────────────────────────
export const sCard = (extra = {}) => ({
  background: T.surf,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: "18px 20px",
  ...extra,
});

export const sBtn = (variant = "primary", extra = {}) => ({
  background: variant === "primary" ? T.green
    : variant === "danger" ? T.red + "22"
    : "transparent",
  border: variant === "primary" ? "none"
    : `1px solid ${variant === "danger" ? T.red + "55" : T.border}`,
  borderRadius: 8,
  padding: "9px 18px",
  color: variant === "primary" ? "#000"
    : variant === "danger" ? T.red
    : T.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
  ...extra,
});

export const sInp = (err = false, extra = {}) => ({
  background: T.surfHi,
  border: `1px solid ${err ? T.red : T.border}`,
  borderRadius: 8,
  padding: "9px 12px",
  color: T.text,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  ...extra,
});

export const sBadge = (color = T.green) => ({
  background: `${color}18`,
  color,
  border: `1px solid ${color}30`,
  borderRadius: 20,
  padding: "3px 10px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
  display: "inline-block",
});
