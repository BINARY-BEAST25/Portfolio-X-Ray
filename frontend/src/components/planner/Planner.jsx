import { useState } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import { T, fmtL, fmtINR, sipFV, requiredSIP, retirementCorpus, sCard, sBtn, sInp } from "../../utils/helpers";
import { TabBar, RangeSlider, MetricCard } from "../ui";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function SIPTab({ totalSips }) {
  const [sip,  setSip]  = useState(totalSips || 10000);
  const [rate, setRate] = useState(12);
  const [yrs,  setYrs]  = useState(15);
  const result   = sipFV(sip, rate, yrs);
  const invested = sip * yrs * 12;
  const data = Array.from({ length: yrs }, (_, i) => ({
    year: `Y${i + 1}`,
    corpus:   Math.round(sipFV(sip, rate, i + 1)),
    invested: sip * (i + 1) * 12,
  }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 16 }}>SIP Growth Calculator</div>
        {totalSips > 0 && (
          <div style={{ padding: "8px 12px", background: `${T.blue}12`, border: `1px solid ${T.blue}30`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: "#93c5fd" }}>
            Your active SIPs: <strong>₹{totalSips.toLocaleString("en-IN")}/mo</strong>
          </div>
        )}
        <RangeSlider label="Monthly SIP" value={sip} onChange={setSip} min={500} max={200000} step={500} display={`₹${sip.toLocaleString("en-IN")}`} />
        <RangeSlider label="Annual Return" value={rate} onChange={setRate} min={4} max={25} step={0.5} display={`${rate}%`} />
        <RangeSlider label="Duration" value={yrs} onChange={setYrs} min={1} max={40} display={`${yrs} years`} />
        <div style={{ background: "linear-gradient(135deg,#052e16,#064e3b)", border: `1px solid ${T.green}`, borderRadius: 12, padding: "22px", textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#6ee7b7", marginBottom: 4 }}>Future Value after {yrs} years</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.text }}>{fmtL(result)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div><div style={{ fontSize: 11, color: "#6ee7b7" }}>You invest</div><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fmtL(invested)}</div></div>
            <div><div style={{ fontSize: 11, color: "#6ee7b7" }}>Wealth created</div><div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>{fmtL(result - invested)}</div></div>
          </div>
        </div>
      </div>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Year-by-Year Growth</div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="pl1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.35} /><stop offset="95%" stopColor={T.green} stopOpacity={0} /></linearGradient>
              <linearGradient id="pl2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.2} /><stop offset="95%" stopColor={T.blue} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="year" tick={{ fill: T.sub, fontSize: 9 }} />
            <YAxis tick={{ fill: T.sub, fontSize: 9 }} tickFormatter={v => fmtL(v)} />
            <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} formatter={v => fmtL(v)} />
            <Area type="monotone" dataKey="corpus"   stroke={T.green} fill="url(#pl1)" name="Portfolio" strokeWidth={2} />
            <Area type="monotone" dataKey="invested" stroke={T.blue}  fill="url(#pl2)" name="Invested"  strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GoalTab({ totalSips, totalPortfolio }) {
  const [target, setTarget] = useState(10000000);
  const [rate,   setRate]   = useState(12);
  const [yrs,    setYrs]    = useState(15);
  const req = requiredSIP(target, rate, yrs);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 16 }}>Reverse SIP Calculator</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Target Amount</label>
          <input style={sInp()} type="number" value={target} onChange={e => setTarget(Number(e.target.value))} />
          <div style={{ fontSize: 12, color: T.green, marginTop: 4, fontWeight: 600 }}>{fmtL(target)}</div>
        </div>
        <RangeSlider label="Expected Return" value={rate} onChange={setRate} min={4} max={25} step={0.5} display={`${rate}%`} />
        <RangeSlider label="Time Horizon" value={yrs} onChange={setYrs} min={1} max={40} display={`${yrs} years`} />
        <div style={{ background: "linear-gradient(135deg,#0c1a3a,#1e1b4b)", border: `1px solid ${T.blue}44`, borderRadius: 12, padding: "22px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#a5b4fc", marginBottom: 4 }}>Required Monthly SIP</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.text }}>₹{Math.ceil(req).toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 12, color: "#a5b4fc", marginTop: 8 }}>to reach {fmtL(target)} in {yrs} yrs at {rate}%</div>
        </div>
        {totalSips > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: T.surfHi, borderRadius: 8, fontSize: 12, color: T.sub }}>
            Your SIPs: <strong style={{ color: T.text }}>₹{totalSips.toLocaleString("en-IN")}/mo</strong>
            {totalSips < req
              ? <span style={{ color: T.amber }}> — ₹{Math.ceil(req - totalSips).toLocaleString("en-IN")}/mo more needed</span>
              : <span style={{ color: T.green }}> — on track ✓</span>}
          </div>
        )}
      </div>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Required SIP at Different Returns</div>
        {[7, 10, 12, 15, 18].map(r => (
          <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, color: T.sub }}>{r}% p.a.</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: r >= 12 ? T.green : T.text }}>₹{Math.ceil(requiredSIP(target, r, yrs)).toLocaleString("en-IN")}/mo</div>
              <div style={{ fontSize: 11, color: T.sub }}>Total invested: {fmtL(Math.ceil(requiredSIP(target, r, yrs)) * yrs * 12)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetirementTab({ totalPortfolio }) {
  const [exp,    setExp]    = useState(60000);
  const [retIn,  setRetIn]  = useState(25);
  const [infl,   setInfl]   = useState(6);
  const corpus    = retirementCorpus(exp, infl, retIn);
  const sipNeeded = requiredSIP(corpus, 12, retIn);
  const futureExp = Math.round(exp * Math.pow(1 + infl / 100, retIn));
  const coverage  = totalPortfolio > 0 ? Math.min(100, (totalPortfolio / corpus) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 16 }}>Retirement Corpus Planner</div>
        <RangeSlider label="Monthly Expenses Today" value={exp} onChange={setExp} min={10000} max={500000} step={5000} display={`₹${exp.toLocaleString("en-IN")}`} />
        <RangeSlider label="Years to Retirement" value={retIn} onChange={setRetIn} min={3} max={40} display={`${retIn} yrs`} />
        <RangeSlider label="Inflation" value={infl} onChange={setInfl} min={3} max={12} step={0.5} display={`${infl}%`} />
        <div style={{ background: "linear-gradient(135deg,#052e16,#064e3b)", border: `1px solid ${T.green}`, borderRadius: 12, padding: "22px", marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Required corpus", fmtL(corpus), T.text],
              ["Monthly SIP needed", `₹${Math.ceil(sipNeeded).toLocaleString("en-IN")}/mo`, T.green],
              ["Future monthly expense", `₹${futureExp.toLocaleString("en-IN")}`, T.text],
              ...(totalPortfolio > 0 ? [["Portfolio covers", `${coverage.toFixed(1)}%`, coverage >= 50 ? T.green : T.amber]] : []),
            ].map(([k, v, c]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: "#6ee7b7" }}>{k}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Assumptions</div>
        {[
          ["Post-retirement life", "25 years"],
          ["Post-retirement return", "7% p.a."],
          ["SIP return assumed", "12% p.a."],
          ["Your inflation", `${infl}% p.a.`],
          ["Retire in year", `${new Date().getFullYear() + retIn}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
            <span style={{ color: T.sub }}>{k}</span>
            <span style={{ color: T.text, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, background: `${T.amber}10`, border: `1px solid ${T.amber}28`, borderRadius: 8, fontSize: 12, color: T.amber, lineHeight: 1.7 }}>
          💡 Review every 3 years. Returns and inflation will vary.
        </div>
      </div>
    </div>
  );
}

function EmergencyTab({ portfolio }) {
  const [exp, setExp] = useState(50000);
  const liquid  = (portfolio?.funds || []).filter(f => f.category === "Debt / Liquid").reduce((s, f) => s + (f.currentValue || 0), 0);
  const target  = exp * 6;
  const pct     = Math.min(100, liquid / target * 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 16 }}>Emergency Fund Calculator</div>
        <RangeSlider label="Monthly Expenses" value={exp} onChange={setExp} min={10000} max={300000} step={5000} display={`₹${exp.toLocaleString("en-IN")}`} />
        {[[3, "Minimum (salaried)"], [6, "Recommended ✓"], [9, "Ideal (freelancer)"], [12, "Conservative"]].map(([m, l]) => (
          <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, color: m === 6 ? T.text : T.sub }}>{m} months — {l}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: m === 6 ? T.green : T.sub }}>{fmtL(exp * m)}</span>
          </div>
        ))}
        {portfolio?.funds?.length > 0 && (
          <div style={{ marginTop: 16, padding: 14, background: pct >= 80 ? `${T.green}0d` : `${T.amber}10`, border: `1px solid ${pct >= 80 ? T.greenBd : T.amber + "44"}`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>Your Debt/Liquid funds</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: pct >= 80 ? T.green : T.amber }}>{fmtL(liquid)} ({pct.toFixed(0)}% of 6-mo target)</div>
            {pct < 80 && <div style={{ fontSize: 12, color: T.amber, marginTop: 4 }}>Build ₹{fmtL(target - liquid)} more before increasing equity SIPs.</div>}
          </div>
        )}
      </div>
      <div style={sCard()}>
        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>Where to Park It</div>
        {[
          ["Overnight / Liquid MF", "~7% p.a. · Instant redemption", "50%", T.green],
          ["Flexi / Ultra-Short FD", "~7.5% p.a. · Premature OK", "30%", T.blue],
          ["High-yield Savings A/C", "~4% p.a. · Immediate access", "20%", T.sub],
        ].map(([n, d, a, c]) => (
          <div key={n} style={{ padding: "13px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{n}</span>
              <span style={{ background: `${c}18`, color: c, border: `1px solid ${c}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{a}</span>
            </div>
            <div style={{ fontSize: 12, color: T.sub }}>{d}</div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, background: T.surfHi, borderRadius: 8, fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
          Never put emergency funds in equity or small cap. Accessibility beats returns.
        </div>
      </div>
    </div>
  );
}

export default function Planner() {
  const { portfolio } = usePortfolio();
  const [tab, setTab]  = useState("sip");
  const totalSips      = (portfolio?.funds || []).reduce((s, f) => s + (f.sipAmount || 0), 0);
  const totalPortfolio = portfolio?.totalValue || 0;

  return (
    <div style={{ padding: "24px 28px" }}>
      <TabBar
        tabs={[["sip", "SIP Calculator"], ["goal", "Goal Planner"], ["retirement", "Retirement"], ["emergency", "Emergency Fund"]]}
        active={tab} onChange={setTab}
      />
      {tab === "sip"        && <SIPTab        totalSips={totalSips} />}
      {tab === "goal"       && <GoalTab       totalSips={totalSips} totalPortfolio={totalPortfolio} />}
      {tab === "retirement" && <RetirementTab totalPortfolio={totalPortfolio} />}
      {tab === "emergency"  && <EmergencyTab  portfolio={portfolio} />}
    </div>
  );
}
