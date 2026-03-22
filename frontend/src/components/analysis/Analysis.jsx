import { useState } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import { analysisAPI } from "../../services/api";
import { T, fmtL, fmtPct, CAT_COLORS, sCard, sBtn } from "../../utils/helpers";
import { TabBar, Spinner, EmptyState, Alert, MetricCard } from "../ui";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// ── Gemini analysis formatter ─────────────────────────
function AnalysisReport({ text }) {
  const sections = text.split(/\n(?=[A-Z][A-Z\s]+:)/).filter(Boolean);
  return (
    <div style={{ fontSize: 13, lineHeight: 1.8, color: T.text }}>
      {sections.map((s, i) => {
        const [heading, ...rest] = s.split("\n");
        const body = rest.join("\n").trim();
        const isHeader = /^[A-Z\s]+:/.test(heading);
        return (
          <div key={i} style={{ marginBottom: 20 }}>
            {isHeader && (
              <div style={{ fontSize: 12, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${T.border}` }}>
                {heading.replace(":", "")}
              </div>
            )}
            <div style={{ color: T.sub, lineHeight: 1.8, whiteSpace: "pre-line" }}>{body || heading}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Analysis() {
  const { portfolio } = usePortfolio();
  const [tab, setTab]           = useState("overview");
  const [analysis, setAnalysis] = useState("");
  const [aiLoading, setAILoad]  = useState(false);
  const [aiError,   setAIError] = useState("");

  const funds    = portfolio?.funds || [];
  const hasData  = funds.length > 0;

  if (!hasData) return (
    <div style={{ padding: "24px 28px" }}>
      <EmptyState icon="📊" title="No portfolio to analyze"
        body="Add funds in the Portfolio tab first. Then Gemini AI will do a full X-ray of your investments." />
    </div>
  );

  const totalInv = portfolio.totalInvested || 0;
  const totalCur = portfolio.totalValue    || 0;
  const gain     = portfolio.totalGain     || 0;
  const annualER     = funds.reduce((s, f) => s + (f.currentValue * f.expenseRatio / 100), 0);
  const annualERIdx  = funds.reduce((s, f) => s + (f.currentValue * 0.1  / 100), 0);
  const erDrag       = annualER - annualERIdx;

  const catMap  = {};
  funds.forEach(f => { catMap[f.category] = (catMap[f.category] || 0) + (f.currentValue || 0); });
  const catData = Object.entries(catMap).map(([cat, val]) => ({
    cat, val, pct: +(val / totalCur * 100).toFixed(1),
  })).sort((a, b) => b.val - a.val);

  const withXirr = funds.filter(f => f.xirr != null);
  const best  = withXirr.length ? withXirr.reduce((a, b) => a.xirr > b.xirr ? a : b) : null;
  const worst = withXirr.length > 1 ? withXirr.reduce((a, b) => a.xirr < b.xirr ? a : b) : null;

  const runAnalysis = async () => {
    setAILoad(true); setAIError(""); setAnalysis("");
    setTab("gemini");
    try {
      const r = await analysisAPI.fullAnalysis();
      setAnalysis(r.data.analysis);
    } catch (e) {
      setAIError(e.message || "Gemini analysis failed");
    } finally { setAILoad(false); }
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Portfolio X-Ray</div>
        <button style={sBtn("primary")} onClick={runAnalysis} disabled={aiLoading}>
          {aiLoading ? <><Spinner size={14} style={{ display: "inline-block", marginRight: 6 }} />Analyzing…</> : "🤖 Full Gemini Analysis"}
        </button>
      </div>

      <TabBar
        tabs={[["overview","Overview"], ["returns","Returns"], ["allocation","Allocation"], ["costs","Costs"], ["gemini","Gemini Report"]]}
        active={tab} onChange={setTab}
      />

      {/* ── Overview ── */}
      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            <MetricCard label="Portfolio Value"  value={fmtL(totalCur)} sub={`Invested: ${fmtL(totalInv)}`} />
            <MetricCard label="Gain / Loss"      value={fmtL(gain)}     sub={fmtPct(portfolio.absoluteReturn)} color={gain >= 0 ? T.green : T.red} />
            <MetricCard label="XIRR"             value={portfolio.xirr ? `${portfolio.xirr}%` : "N/A"} color={portfolio.xirr > 12 ? T.green : T.amber} />
            <MetricCard label="Funds"            value={funds.length} sub="in portfolio" />
          </div>
          {best && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={sCard({ border: `1px solid ${T.green}30` })}>
                <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Best Performer</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{best.schemeName?.slice(0, 50)}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.green }}>XIRR: {best.xirr}%</div>
              </div>
              {worst && worst._id !== best._id && (
                <div style={sCard({ border: `1px solid ${T.red}30` })}>
                  <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Needs Review</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{worst.schemeName?.slice(0, 50)}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: worst.xirr < 8 ? T.red : T.amber }}>XIRR: {worst.xirr}%</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Returns ── */}
      {tab === "returns" && (
        <>
          <div style={sCard({ marginBottom: 16 })}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Fund-wise Returns (Real XIRR · Newton-Raphson)</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: T.sub, borderBottom: `1px solid ${T.border}` }}>
                    {["Fund", "Category", "Invested", "Current", "Abs Return", "XIRR", "ER"].map(h => (
                      <th key={h} style={{ padding: "7px 8px", textAlign: h === "Fund" ? "left" : "right", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funds.map(f => {
                    const ap = f.absoluteReturn;
                    return (
                      <tr key={f._id} style={{ borderBottom: `1px solid ${T.surfHi}` }}>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[f.category] || T.green, flexShrink: 0 }} />
                            <span style={{ color: T.text, fontWeight: 500 }}>{f.schemeName?.length > 35 ? f.schemeName.slice(0, 35) + "…" : f.schemeName}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}><span style={{ ...sBadge_helper(CAT_COLORS[f.category] || T.green) }}>{f.category}</span></td>
                        <td style={{ padding: "10px 8px", textAlign: "right", color: T.sub }}>{fmtL(f.totalInvested)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>{fmtL(f.currentValue)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", color: ap != null ? (ap >= 0 ? T.green : T.red) : T.sub, fontWeight: 600 }}>{ap != null ? fmtPct(ap) : "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: f.xirr != null ? (f.xirr >= 12 ? T.green : f.xirr >= 8 ? T.amber : T.red) : T.sub }}>{f.xirr != null ? `${f.xirr}%` : "N/A"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", color: f.expenseRatio > 1 ? T.amber : T.sub }}>{f.expenseRatio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {withXirr.length > 0 && (
            <div style={sCard()}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>XIRR Chart</div>
              <ResponsiveContainer width="100%" height={Math.max(160, funds.length * 52)}>
                <BarChart data={withXirr.map(f => ({ name: f.schemeName?.split(" ").slice(0, 3).join(" "), xirr: f.xirr }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: T.sub, fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: T.sub, fontSize: 11 }} width={150} />
                  <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => `${v}%`} />
                  <Bar dataKey="xirr" radius={[0, 4, 4, 0]}>
                    {withXirr.map((f, i) => <Cell key={i} fill={f.xirr >= 12 ? T.green : f.xirr >= 8 ? T.amber : T.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── Allocation ── */}
      {tab === "allocation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={sCard()}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Category Allocation</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3} dataKey="val" nameKey="cat">
                  {catData.map((d, i) => <Cell key={i} fill={CAT_COLORS[d.cat] || T.blue} />)}
                </Pie>
                <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => fmtL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={sCard()}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Breakdown</div>
            {catData.map(d => (
              <div key={d.cat} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[d.cat] || T.blue }} />
                    <span style={{ color: T.sub }}>{d.cat}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ color: T.sub }}>{fmtL(d.val)}</span>
                    <span style={{ color: T.text, fontWeight: 700, minWidth: 38, textAlign: "right" }}>{d.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 5, background: T.surfHi, borderRadius: 3 }}>
                  <div style={{ width: `${d.pct}%`, height: "100%", background: CAT_COLORS[d.cat] || T.blue, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Costs ── */}
      {tab === "costs" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
            <MetricCard label="Annual ER Cost"    value={`₹${Math.round(annualER).toLocaleString("en-IN")}`}    color={T.amber} />
            <MetricCard label="Index Fund Equiv." value={`₹${Math.round(annualERIdx).toLocaleString("en-IN")}`} color={T.green} />
            <MetricCard label="Annual ER Drag"    value={`₹${Math.round(erDrag).toLocaleString("en-IN")}`}     color={T.red}   sub="vs 0.1% index" />
          </div>
          <div style={sCard()}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Fund-wise ER</div>
            {funds.map(f => (
              <div key={f._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: T.text }}>{f.schemeName?.length > 48 ? f.schemeName.slice(0, 48) + "…" : f.schemeName}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Annual cost: ₹{Math.round(f.currentValue * f.expenseRatio / 100).toLocaleString("en-IN")}</div>
                </div>
                <span style={{ background: `${f.expenseRatio > 1.5 ? T.red : f.expenseRatio > 0.8 ? T.amber : T.green}18`, color: f.expenseRatio > 1.5 ? T.red : f.expenseRatio > 0.8 ? T.amber : T.green, border: `1px solid ${f.expenseRatio > 1.5 ? T.red : f.expenseRatio > 0.8 ? T.amber : T.green}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{f.expenseRatio}%</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: 12, background: T.surfHi, borderRadius: 8, fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
              <strong style={{ color: T.text }}>10-year compounded drag:</strong> ₹{Math.round(erDrag).toLocaleString("en-IN")}/yr compounding at 12% = <strong style={{ color: T.red }}>₹{fmtL(erDrag * 12 * ((Math.pow(1 + 0.12 / 12, 120) - 1) / (0.12 / 12)))}</strong> in foregone wealth.
            </div>
          </div>
        </>
      )}

      {/* ── Gemini Report ── */}
      {tab === "gemini" && (
        <div style={sCard()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>Gemini AI Full Analysis</div>
            <button style={{ ...sBtn("ghost"), fontSize: 12 }} onClick={runAnalysis} disabled={aiLoading}>
              {aiLoading ? "Analyzing…" : "↻ Refresh"}
            </button>
          </div>
          {aiError && <Alert type="error">{aiError}</Alert>}
          {aiLoading && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", color: T.sub, fontSize: 13, padding: "20px 0" }}>
              <Spinner size={20} /> Gemini is analyzing your portfolio…
            </div>
          )}
          {!aiLoading && !analysis && !aiError && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.sub }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
              <div style={{ marginBottom: 16 }}>Click "Full Gemini Analysis" for a detailed AI-powered review</div>
              <button style={sBtn("primary")} onClick={runAnalysis}>Run Analysis</button>
            </div>
          )}
          {analysis && <AnalysisReport text={analysis} />}
          {analysis && (
            <div style={{ marginTop: 20, padding: 12, background: `${T.amber}10`, border: `1px solid ${T.amber}25`, borderRadius: 8, fontSize: 11, color: T.amber }}>
              ⚠ AI-generated analysis. Not SEBI-registered investment advice. Always consult a certified financial advisor.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// inline badge helper (avoid importing for just one use)
const sBadge_helper = (color) => ({
  background: `${color}18`, color, border: `1px solid ${color}30`,
  borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700,
});
