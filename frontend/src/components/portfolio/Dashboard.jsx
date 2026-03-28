import { useState, useEffect } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import { useAuth } from "../../context/AuthContext";
import { analysisAPI } from "../../services/api";
import { T, fmtL, fmtPct, CAT_COLORS, sCard } from "../../utils/helpers";
import { MetricCard, Spinner, Alert } from "../ui";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user }       = useAuth();
  const { portfolio, fetchPortfolio, loading } = usePortfolio();
  const [insights,   setInsights]   = useState([]);
  const [aiLoading,  setAILoading]  = useState(false);
  const [aiError,    setAIError]    = useState("");

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  useEffect(() => {
    if (!portfolio?.funds?.length) return;
    setAILoading(true);
    analysisAPI.insights()
      .then(r => setInsights(r.data.insights || []))
      .catch(e => setAIError(e.message || "Could not load insights"))
      .finally(() => setAILoading(false));
  }, [portfolio?.funds?.length]);

  const p = portfolio;
  if (loading && !p) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><Spinner size={40} /></div>;
  }

  const hasData = p?.funds?.length > 0;

  const catMap = {};
  p?.funds?.forEach(f => { catMap[f.category] = (catMap[f.category] || 0) + (f.currentValue || 0); });
  const catData = Object.entries(catMap).map(([cat, val]) => ({ cat, val, pct: (val / (p?.totalValue || 1) * 100).toFixed(1) }));

  const projData = hasData ? Array.from({ length: 25 }, (_, i) => ({
    m: i === 0 ? "Now" : i % 6 === 0 ? `+${i}mo` : "",
    opt:  Math.round((p.totalValue || 0) * Math.pow(1 + 0.12 / 12, i)),
    cons: Math.round((p.totalValue || 0) * Math.pow(1 + 0.08 / 12, i)),
  })) : [];

  const insightColors = { warning: T.amber, info: T.blue, success: T.green, danger: T.red };

  return (
    <div style={{ padding: "16px clamp(12px, 4vw, 28px)" }}>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>
          Good morning, {user?.name?.split(" ")[0]}</div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
          {hasData
            ? `Your portfolio of ${p.funds.length} funds is live. NAV data from mfapi.in.`
            : "Add your first fund or upload a CAMS/KFintech statement to get started."}
        </div>
      </div>

      {!hasData ? (
        <div style={{ ...sCard(), textAlign: "center", padding: "56px 24px", border: `1px solid ${T.greenBd}` }}>
          <div style={{ fontSize: 28, marginBottom: 16, color: T.green, fontWeight: 800 }}>PX</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>Start tracking your portfolio</div>
          <div style={{ fontSize: 13, color: T.sub, maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Upload a CAMS or KFintech statement, or add funds manually. Gemini AI will analyze your portfolio instantly.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link to="/app/upload" style={{ background: T.green, border: "none", borderRadius: 8, padding: "10px 22px", color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Upload Statement</Link>
            <Link to="/app/portfolio" style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 22px", color: T.text, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Add Manually</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Metric grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            <MetricCard label="Portfolio Value"  value={fmtL(p.totalValue)}    sub={`Invested: ${fmtL(p.totalInvested)}`} />
            <MetricCard label="Total Gain / Loss" value={fmtL(p.totalGain)}    sub={fmtPct(p.absoluteReturn)}  color={p.totalGain >= 0 ? T.green : T.red} />
            <MetricCard label="Monthly SIPs"      value={`₹${(p.funds.reduce((s, f) => s + (f.sipAmount || 0), 0)).toLocaleString("en-IN")}`} sub="active SIPs" />
            <MetricCard label="Portfolio XIRR"    value={p.xirr ? fmtPct(p.xirr) : "N/A"} sub="annualised return" color={p.xirr > 12 ? T.green : p.xirr > 8 ? T.amber : T.red} />
          </div>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={sCard()}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Projected Growth (24 months)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projData}>
                  <defs>
                    <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                    <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.2}/><stop offset="95%" stopColor={T.blue} stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="m" tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtL(v)} />
                  <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => fmtL(v)} />
                  <Area type="monotone" dataKey="opt"  stroke={T.green} fill="url(#dg1)" strokeWidth={2} name="12% p.a." />
                  <Area type="monotone" dataKey="cons" stroke={T.blue}  fill="url(#dg2)" strokeWidth={2} name="8% p.a."  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={sCard()}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Allocation</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="val" nameKey="cat">
                    {catData.map((d, i) => <Cell key={i} fill={CAT_COLORS[d.cat] || T.blue} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => fmtL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
                {catData.map(d => (
                  <div key={d.cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[d.cat] || T.blue }} />
                    <span style={{ color: T.sub }}>{d.cat}</span>
                    <span style={{ color: T.text, fontWeight: 700 }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div style={sCard()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Gemini AI Insights
              </div>
              <Link to="/app/analysis" style={{ fontSize: 12, color: T.green, textDecoration: "none" }}>Full Analysis →</Link>
            </div>
            {aiError && <Alert type="error">{aiError}</Alert>}
            {aiLoading ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", color: T.sub, fontSize: 13 }}><Spinner size={16} /> Gemini is analyzing your portfolio…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {insights.map((ins, i) => {
                  const c = insightColors[ins.type] || T.blue;
                  return (
                    <div key={i} style={{ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, marginTop: 4, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{ins.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>{ins.body}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


