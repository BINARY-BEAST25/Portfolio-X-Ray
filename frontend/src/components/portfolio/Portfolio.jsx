import { useState, useEffect, useCallback } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import { fundsAPI } from "../../services/api";
import { T, fmtL, fmtPct, fmtNAV, CAT_COLORS, CATS, sCard, sBtn, sInp, sBadge } from "../../utils/helpers";
import { Spinner, EmptyState, Alert } from "../ui";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── Fund search with live mfapi.in ───────────────────
function FundSearch({ onSelect }) {
  const [q, setQ] = useState("");
  const [results, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setRes([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fundsAPI.search(q);
        setRes(r.data.results || []);
        setOpen(true);
      } catch {
        setRes([]);
      } finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input style={sInp()} placeholder="Search fund name (mfapi.in)" value={q}
          onChange={e => setQ(e.target.value)} onFocus={() => q.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)} />
        {busy && <Spinner size={16} />}
      </div>
      {open && (results.length > 0) && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.surf, border: `1px solid ${T.borderB}`, borderRadius: 10, zIndex: 200, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {results.map(f => (
            <div key={f.schemeCode} onMouseDown={() => { onSelect(f); setQ(f.schemeName); setOpen(false); }}
              style={{ padding: "11px 14px", cursor: "pointer", borderBottom: `1px solid ${T.muted}`, fontSize: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfHi}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontWeight: 500, color: T.text }}>{f.schemeName}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Code: {f.schemeCode}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add / Edit modal ─────────────────────────────────
function FundModal({ initial, onSave, onClose }) {
  // ✅ FIX 1: Removed duplicate keys (sipAmount, lumpSum, units, currentValue were
  //    declared twice — the second set was silently overriding the spread of `initial`).
  const [form, setForm] = useState({
    schemeCode: initial?.schemeCode || "",
    schemeName: initial?.schemeName || "",
    category: initial?.category || "Large Cap",
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().split("T")[0] : "",
    investmentType: initial?.investmentType || "sip",
    sipAmount: initial?.sipAmount || "",
    lumpSum: initial?.lumpSum || "",
    units: initial?.units || "",
    currentValue: initial?.currentValue || "",
    expenseRatio: initial?.expenseRatio || "",
    folio: initial?.folio || "",
    useUnits: true,
  });
  const [liveNAV, setNAV] = useState(null);
  const [navLoad, setNL] = useState(false);
  const [errors, setErr] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Fetch NAV when schemeCode set
  useEffect(() => {
    if (!form.schemeCode) { setNAV(null); return; }
    setNL(true);
    fundsAPI.nav(form.schemeCode)
      .then(r => setNAV(r.data))
      .catch(() => setNAV(null))
      .finally(() => setNL(false));
  }, [form.schemeCode]);

  // Auto-detect category
  useEffect(() => {
    if (!form.schemeName) return;
    const n = form.schemeName.toLowerCase();
    if (n.includes("large cap")) set("category", "Large Cap");
    else if (n.includes("mid cap")) set("category", "Mid Cap");
    else if (n.includes("small cap")) set("category", "Small Cap");
    else if (n.includes("flexi cap") || n.includes("flexicap")) set("category", "Flexi Cap");
    else if (n.includes("elss") || n.includes("tax saver")) set("category", "ELSS");
    else if (n.includes("index") || n.includes("nifty") || n.includes("sensex")) set("category", "Index Fund");
    else if (n.includes("liquid") || n.includes("overnight") || n.includes("debt")) set("category", "Debt / Liquid");
    else if (n.includes("hybrid") || n.includes("balanced")) set("category", "Hybrid");
    else if (n.includes("international") || n.includes("global")) set("category", "International");
  }, [form.schemeName]);

  const computedVal = form.useUnits && form.units && liveNAV
    ? Number(form.units) * liveNAV.nav
    : Number(form.currentValue) || 0;

  const validate = () => {
    const e = {};
    // ✅ FIX 2: Validate schemeCode — this was completely missing, allowing
    //    empty schemeCode to reach the backend and trigger the 400 error.
    if (!form.schemeCode || String(form.schemeCode).trim() === "") {
      e.schemeCode = "Please search and select a fund from the dropdown";
    }
    if (!form.schemeName.trim()) e.schemeName = "Required";
    if (!form.startDate) e.startDate = "Required";
    if ((form.investmentType === "lump" || form.investmentType === "both") && !Number(form.lumpSum)) e.lumpSum = "Required";
    if ((form.investmentType === "sip" || form.investmentType === "both") && !Number(form.sipAmount)) e.sipAmount = "Required";
    if (form.useUnits && !Number(form.units)) e.units = "Required";
    if (!form.useUnits && !Number(form.currentValue)) e.currentValue = "Required";
    if (form.expenseRatio === "" || isNaN(Number(form.expenseRatio))) e.expenseRatio = "Required";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      schemeCode: String(form.schemeCode).trim(),
      schemeName: form.schemeName,
      category: form.category,
      startDate: form.startDate,
      investmentType: form.investmentType,
      sipAmount: Number(form.sipAmount) || 0,
      lumpSum: Number(form.lumpSum) || 0,
      units: Number(form.units) || 0,
      currentValue: computedVal,
      expenseRatio: Number(form.expenseRatio) || 0.5,
      folio: form.folio,
    });
  };

  const showL = form.investmentType === "lump" || form.investmentType === "both";
  const showS = form.investmentType === "sip" || form.investmentType === "both";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...sCard(), width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{initial ? "Edit Fund" : "Add Mutual Fund"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.sub, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Fund search */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>
            Fund Name * <span style={{ color: T.cyan, fontSize: 11 }}>(live search from mfapi.in)</span>
          </label>
          <FundSearch onSelect={f => {
            // ✅ FIX 3: Explicitly set both fields when a fund is selected
            set("schemeCode", String(f.schemeCode || f.Scheme_Code || "").trim());
            set("schemeName", f.schemeName || f.Scheme_Name || "");
            // Clear schemeCode error as soon as user selects a fund
            setErr(prev => ({ ...prev, schemeCode: undefined }));
          }} />
          {/* ✅ FIX 4: Show schemeCode error below the search box */}
          {errors.schemeCode && (
            <div style={{ fontSize: 11, color: T.red, marginTop: 5, padding: "6px 10px", background: "rgba(255,80,80,0.08)", borderRadius: 6, border: `1px solid ${T.red}` }}>
              ⚠ {errors.schemeCode}
            </div>
          )}
          {errors.schemeName && !errors.schemeCode && (
            <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.schemeName}</div>
          )}
          {form.schemeCode && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: T.surfHi, borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: T.sub }}>Code: <strong style={{ color: T.cyan }}>{form.schemeCode}</strong></span>
              {navLoad ? <Spinner size={12} /> : liveNAV ? (
                <>
                  <span style={{ color: T.sub }}>Live NAV: <strong style={{ color: T.green }}>{fmtNAV(liveNAV.nav)}</strong></span>
                  <span style={{ color: T.sub, fontSize: 11 }}>as of {liveNAV.date}</span>
                </>
              ) : <span style={{ color: T.red, fontSize: 11 }}>NAV unavailable</span>}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Category</label>
            <select style={sInp()} value={form.category} onChange={e => set("category", e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Start Date *</label>
            <input style={sInp(!!errors.startDate)} type="date" value={form.startDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => set("startDate", e.target.value)} />
            {errors.startDate && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.startDate}</div>}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Investment Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["sip", "SIP Only"], ["lump", "Lump Sum"], ["both", "SIP + Lump"]].map(([v, l]) => (
              <button key={v} onClick={() => set("investmentType", v)}
                style={{ ...sBtn(form.investmentType === v ? "primary" : "ghost"), flex: 1, padding: "7px", fontSize: 12 }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {showL && <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Lump Sum (₹) *</label>
            <input style={sInp(!!errors.lumpSum)} type="number" value={form.lumpSum}
              onChange={e => set("lumpSum", e.target.value)} placeholder="50000" />
            {errors.lumpSum && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.lumpSum}</div>}
          </div>}
          {showS && <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Monthly SIP (₹) *</label>
            <input style={sInp(!!errors.sipAmount)} type="number" value={form.sipAmount}
              onChange={e => set("sipAmount", e.target.value)} placeholder="5000" />
            {errors.sipAmount && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.sipAmount}</div>}
          </div>}
        </div>

        {/* Current value method */}
        <div style={{ padding: 14, background: T.surfHi, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>Current Value</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => set("useUnits", true)} style={{ ...sBtn(form.useUnits ? "primary" : "ghost"), flex: 1, fontSize: 12, padding: "7px" }}>Units × Live NAV</button>
            <button onClick={() => set("useUnits", false)} style={{ ...sBtn(!form.useUnits ? "primary" : "ghost"), flex: 1, fontSize: 12, padding: "7px" }}>Enter Manually</button>
          </div>
          {form.useUnits ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Units held *</label>
                <input style={sInp(!!errors.units)} type="number" step="0.001" value={form.units}
                  onChange={e => set("units", e.target.value)} placeholder="234.567" />
                {errors.units && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.units}</div>}
              </div>
              <div style={{ paddingBottom: 2, textAlign: "right" }}>
                <div style={{ fontSize: 11, color: T.sub }}>NAV: {navLoad ? "…" : fmtNAV(liveNAV?.nav)}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>{computedVal > 0 ? fmtL(computedVal) : "—"}</div>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Current Value (₹) *</label>
              <input style={sInp(!!errors.currentValue)} type="number" value={form.currentValue}
                onChange={e => set("currentValue", e.target.value)} placeholder="87430" />
              {errors.currentValue && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.currentValue}</div>}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Expense Ratio (%) *</label>
            <input style={sInp(!!errors.expenseRatio)} type="number" step="0.01" min="0" max="5"
              value={form.expenseRatio} onChange={e => set("expenseRatio", e.target.value)} placeholder="0.54" />
            {errors.expenseRatio && <div style={{ fontSize: 11, color: T.red, marginTop: 3 }}>{errors.expenseRatio}</div>}
            <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>Check AMFI / fund factsheet</div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Folio Number</label>
            <input style={sInp()} value={form.folio} onChange={e => set("folio", e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={sBtn("primary")} onClick={handleSave}>{initial ? "Update Fund" : "Add to Portfolio"}</button>
          <button style={sBtn("ghost")} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Single fund card with live NAV chart ─────────────
function FundCard({ fund, totalValue, onEdit, onDelete }) {
  const gain = (fund.currentValue || 0) - (fund.totalInvested || 0);
  const absPct = fund.absoluteReturn;
  const alloc = totalValue > 0 ? (fund.currentValue / totalValue) * 100 : 0;
  const col = CAT_COLORS[fund.category] || T.green;
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoad, setHL] = useState(false);

  const loadHistory = async () => {
    if (history.length > 0) { setShowHistory(p => !p); return; }
    if (!fund.schemeCode) return;
    setHL(true);
    try {
      const r = await fundsAPI.history(fund.schemeCode, 365);
      setHistory(r.data.history.map(h => ({ date: h.date, nav: parseFloat(h.nav) })));
      setShowHistory(true);
    } finally { setHL(false); }
  };

  return (
    <div style={{ ...sCard({ marginBottom: 12 }), animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{fund.schemeName}</span>
            <span style={sBadge(col)}>{fund.category}</span>
            {fund.schemeCode && <span style={sBadge(T.cyan)}>#{fund.schemeCode}</span>}
            {fund.unmatched && <span style={{ ...sBadge(T.amber), cursor: "pointer" }} title="No mfapi.in match — live NAV unavailable. Click Edit to link a scheme.">⚠ Unmatched</span>}
            {fund.folio && <span style={{ fontSize: 11, color: T.sub }}>Folio: {fund.folio}</span>}
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px 20px" }}>
            {[
              ["Invested", fmtL(fund.totalInvested), null],
              ["Current Value", fmtL(fund.currentValue), T.text],
              ["Gain / Loss", fmtL(gain), gain >= 0 ? T.green : T.red],
              ["Abs Return", absPct != null ? fmtPct(absPct) : "—", absPct != null ? (absPct >= 0 ? T.green : T.red) : T.sub],
              ["XIRR", fund.xirr != null ? `${fund.xirr}%` : "N/A", fund.xirr != null ? (fund.xirr >= 12 ? T.green : fund.xirr >= 8 ? T.amber : T.red) : T.sub],
              ["Live NAV", fund.lastNAV ? fmtNAV(fund.lastNAV) : "N/A", T.cyan],
              ["ER", `${fund.expenseRatio}%`, fund.expenseRatio > 1 ? T.amber : T.sub],
              ["Allocation", `${alloc.toFixed(1)}%`, null],
              ["SIP", fund.sipAmount > 0 ? `₹${fund.sipAmount.toLocaleString("en-IN")}/mo` : "—", null],
            ].map(([k, v, c]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: T.sub, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c || T.text }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Allocation bar */}
          <div style={{ marginTop: 10, height: 3, background: T.surfHi, borderRadius: 2 }}>
            <div style={{ width: `${Math.min(100, alloc)}%`, height: "100%", background: col, borderRadius: 2 }} />
          </div>

          {/* NAV history chart */}
          {showHistory && history.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>NAV History (365 days · mfapi.in)</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={history}>
                  <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: T.sub, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }}
                    formatter={v => `₹${v.toFixed(4)}`} />
                  <Line type="monotone" dataKey="nav" stroke={col} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {fund.schemeCode && (
            <button onClick={loadHistory} style={{ ...sBtn("ghost"), padding: "4px 8px", fontSize: 11, color: T.cyan }}>
              {histLoad ? <Spinner size={12} /> : showHistory ? "▲ Hide" : "▼ NAV"}
            </button>
          )}
          <button onClick={onEdit} style={{ ...sBtn("ghost"), padding: "4px 8px", fontSize: 11 }}>Edit</button>
          <button onClick={onDelete} style={{ ...sBtn("danger"), padding: "4px 8px", fontSize: 11 }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Portfolio page ───────────────────────────────
export default function Portfolio() {
  const { portfolio, fetchPortfolio, addFund, updateFund, deleteFund, loading } = usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const [editFund, setEditFund] = useState(null);
  const [saveBusy, setSave] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const handleSave = async (data) => {
    setSave(true); setError("");
    try {
      if (editFund) {
        await updateFund(editFund._id, data);
        setEditFund(null);
      } else {
        const res = await addFund(data);
        setShowModal(false);
        // ✅ Show info message if fund was skipped as duplicate
        if (res?.data?.message?.includes("skipped")) {
          setError(res.data.message); // reuse error banner as info — or swap for a toast
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Save failed");
    } finally { setSave(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this fund?")) return;
    try { await deleteFund(id); } catch (e) { setError(e.message); }
  };

  const funds = portfolio?.funds || [];
  const totalVal = portfolio?.totalValue || 0;

  return (
    <div style={{ padding: "24px 28px" }}>
      {(showModal || editFund) && (
        <FundModal
          initial={editFund}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditFund(null); }}
        />
      )}

      {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}

      {loading && !portfolio ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div>
      ) : funds.length === 0 ? (
        <EmptyState icon="📋" title="No funds yet"
          body="Add funds manually, or go to Upload to parse your CAMS/KFintech statement. Each fund gets live NAV from mfapi.in."
          action="+ Add Your First Fund" onAction={() => setShowModal(true)} />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{funds.length} Fund{funds.length !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Total: {fmtL(totalVal)}</div>
            </div>
            <button style={sBtn("primary")} onClick={() => { setShowModal(true); setEditFund(null); }}>+ Add Fund</button>
          </div>
          {funds.map(f => (
            <FundCard key={f._id} fund={f} totalValue={totalVal}
              onEdit={() => { setEditFund(f); setShowModal(false); }}
              onDelete={() => handleDelete(f._id)} />
          ))}
        </>
      )}
    </div>
  );
}