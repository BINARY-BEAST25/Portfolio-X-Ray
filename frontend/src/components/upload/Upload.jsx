import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../../context/PortfolioContext";
import { analysisAPI, fundsAPI } from "../../services/api";
import { T, CATS, CAT_COLORS, sCard, sBtn, sInp } from "../../utils/helpers";
import { Spinner, Alert } from "../ui";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; res(window.pdfjsLib); };
    s.onerror = () => rej(new Error("Failed to load PDF.js"));
    document.head.appendChild(s);
  });
}

async function extractPdfText(file) {
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    text += `\n[Page ${p}]\n` + tc.items.map(i => i.str).join(" ");
  }
  return text;
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function dedupeParsedFunds(funds) {
  const byKey = new Map();

  for (const fund of funds) {
    const codeKey = normalizeKey(fund.schemeCode);
    const nameKey = normalizeKey(fund.originalName || fund.schemeName);
    const folioKey = normalizeKey(fund.folio);
    const key = codeKey
      ? `code:${codeKey}`
      : `name:${nameKey}|folio:${folioKey || "na"}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fund);
      continue;
    }

    const merged = {
      ...existing,
      ...fund,
      id: existing.id,
      schemeCode: existing.schemeCode || fund.schemeCode,
      schemeName: existing.schemeName || fund.schemeName,
      originalName: existing.originalName || fund.originalName,
      folio: existing.folio || fund.folio,
      unmatched: existing.unmatched && fund.unmatched,
      sipAmount: Math.max(existing.sipAmount || 0, fund.sipAmount || 0),
      lumpSum: Math.max(existing.lumpSum || 0, fund.lumpSum || 0),
      currentValue: Math.max(existing.currentValue || 0, fund.currentValue || 0),
      units: Math.max(existing.units || 0, fund.units || 0),
      expenseRatio: existing.expenseRatio || fund.expenseRatio,
      startDate: existing.startDate || fund.startDate,
    };

    byKey.set(key, merged);
  }

  return [...byKey.values()];
}

const STEPS = [
  "Reading PDF pages…",
  "Extracting transaction text…",
  "Sending to Gemini for parsing…",
  "Matching with mfapi.in schemes…",
  "Done ✓",
];

// ── Inline re-link search for unmatched funds ────────
function UnmatchedRelink({ fund, onLink }) {
  const [q, setQ] = useState(fund.originalName || fund.schemeName || "");
  const [results, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = async (val) => {
    setQ(val);
    if (val.length < 2) { setRes([]); return; }
    setBusy(true);
    try {
      const r = await fundsAPI.search(val);
      setRes(r.data.results || []);
      setOpen(true);
    } catch { setRes([]); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ marginBottom: 12, padding: "10px 12px", background: `${T.amber}0a`, border: `1px dashed ${T.amber}50`, borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: T.amber, marginBottom: 6, fontWeight: 600 }}>🔗 Link to mfapi.in scheme (optional — improves live NAV)</div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={sInp(false, { padding: "6px 10px", fontSize: 12, flex: 1 })}
            value={q}
            placeholder="Search fund name on mfapi.in…"
            onChange={e => search(e.target.value)}
            onFocus={() => q.length >= 2 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
          />
          {busy && <Spinner size={13} />}
        </div>
        {open && results.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.surf, border: `1px solid ${T.borderB}`, borderRadius: 8, zIndex: 300, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            {results.map(r => (
              <div key={r.schemeCode}
                onMouseDown={() => { onLink(String(r.schemeCode), r.schemeName); setOpen(false); setQ(r.schemeName); }}
                style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${T.muted}`, fontSize: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfHi}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ fontWeight: 500, color: T.text }}>{r.schemeName}</div>
                <div style={{ fontSize: 11, color: T.cyan, marginTop: 1 }}>Code: {r.schemeCode}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Upload() {
  const { addFund } = usePortfolio();
  const navigate = useNavigate();
  const [stage, setStage] = useState("idle");  // idle|loading|confirm|error
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState([]);
  const [checked, setChecked] = useState([]);
  const [errMsg, setErrMsg] = useState("");
  const [fname, setFname] = useState("");
  const [drag, setDrag] = useState(false);
  const [importing, setImport] = useState(false);
  const [importErr, setImpErr] = useState("");
  const fileRef = useRef();

  const tick = i => setStep(i);

  const handleFile = async (file) => {
    if (!file?.name.endsWith(".pdf")) { setErrMsg("Please upload a PDF file."); setStage("error"); return; }
    setFname(file.name); setStage("loading"); setStep(0);
    try {
      tick(0); const text = await extractPdfText(file);
      tick(1);
      if (text.length < 300) throw new Error("Could not extract text. Ensure the PDF is not a scanned image.");
      const lower = text.toLowerCase();
      if (!lower.includes("folio") && !lower.includes("nav") && !lower.includes("mutual"))
        throw new Error("This doesn't look like a CAMS or KFintech CAS statement.");

      tick(2);
      const r = await analysisAPI.parseStatement(text);
      const rawFunds = r.data.funds || [];
      if (!rawFunds.length) throw new Error("No funds found. Upload a Consolidated Account Statement (CAS) PDF.");

      // Match scheme codes from mfapi.in
      tick(3);
      const allFundsRes = await fundsAPI.all().catch(() => ({ data: { data: [] } }));
      const allSchemes = allFundsRes.data.data || [];

      // Multi-strategy fuzzy matcher — tries progressively looser matches
      function findMatch(name) {
        if (!name || !allSchemes.length) return null;
        const n = name.toLowerCase().trim();

        // Strategy 1: exact substring match on first 30 chars
        let m = allSchemes.find(a => a.schemeName.toLowerCase().includes(n.slice(0, 30)));
        if (m) return m;

        // Strategy 2: first 18 chars (original approach)
        m = allSchemes.find(a => a.schemeName.toLowerCase().includes(n.slice(0, 18)));
        if (m) return m;

        // Strategy 3: all significant words (≥4 chars) must appear in scheme name
        const words = n.split(/\s+/).filter(w => w.length >= 4);
        if (words.length >= 2) {
          m = allSchemes.find(a => {
            const sn = a.schemeName.toLowerCase();
            return words.every(w => sn.includes(w));
          });
          if (m) return m;
        }

        // Strategy 4: majority of significant words match
        if (words.length >= 3) {
          m = allSchemes.find(a => {
            const sn = a.schemeName.toLowerCase();
            const hits = words.filter(w => sn.includes(w)).length;
            return hits >= Math.ceil(words.length * 0.6);
          });
          if (m) return m;
        }

        // Strategy 5: AMC name + fund type keyword
        const amcKeywords = ["hdfc", "icici", "sbi", "axis", "mirae", "kotak", "nippon", "franklin", "dsp", "ppfas", "aditya", "birla", "uti", "tata", "canara", "invesco", "pgim", "bandhan", "edelweiss", "motilal", "quant", "whiteoak", "navi", "zerodha"];
        const typeKeywords = ["large cap", "mid cap", "small cap", "flexi cap", "elss", "index", "liquid", "overnight", "hybrid", "balanced", "gilt", "arbitrage", "bluechip", "multicap", "multi cap", "focused", "value", "contra", "dividend"];
        const amc = amcKeywords.find(k => n.includes(k));
        const type = typeKeywords.find(k => n.includes(k));
        if (amc && type) {
          m = allSchemes.find(a => {
            const sn = a.schemeName.toLowerCase();
            return sn.includes(amc) && sn.includes(type);
          });
          if (m) return m;
        }

        return null;
      }

      const sanitised = rawFunds.map((f, i) => {
        const match = findMatch(f.schemeName);
        return {
          ...f,
          id: Date.now() + i,
          schemeCode: match ? String(match.schemeCode) : "",
          schemeName: match ? match.schemeName : (f.schemeName || "Unknown"),
          originalName: f.schemeName || "",   // keep original for display / re-search
          unmatched: !match,               // ← flag unmatched funds
          sipAmount: Math.max(0, Number(f.sipAmount) || 0),
          lumpSum: Math.max(0, Number(f.lumpSum) || 0),
          currentValue: Math.max(0, Number(f.currentValue) || 0),
          expenseRatio: Math.min(5, Math.max(0, Number(f.expenseRatio) || 0.5)),
          category: CATS.includes(f.category) ? f.category : "Other",
          investmentType: ["sip", "lump", "both"].includes(f.investmentType) ? f.investmentType : "sip",
          units: Number(f.units) || 0,
          startDate: f.startDate && !isNaN(new Date(f.startDate).getTime())
            ? new Date(f.startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        };
      }).filter(f => f.schemeName && f.currentValue > 0);

      const deduped = dedupeParsedFunds(sanitised);

      if (!deduped.length) throw new Error("No valid fund data extracted. Try adding funds manually.");

      tick(4);
      setParsed(deduped);
      setChecked(deduped.map(f => f.id));
      setStage("confirm");
    } catch (e) {
      setErrMsg(e.message || "Parsing failed. Please try again.");
      setStage("error");
    }
  };

  const editField = (id, k, v) => setParsed(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  const handleImport = async () => {
    setImport(true); setImpErr("");
    const toAdd = parsed.filter(f => checked.includes(f.id));
    const addedUnmatched = [];
    const failed = [];

    for (const f of toAdd) {
      const startDate = f.startDate && !isNaN(new Date(f.startDate).getTime())
        ? f.startDate
        : new Date().toISOString().split("T")[0];

      // Unmatched funds get a synthetic schemeCode so they are NOT silently dropped.
      // The `unmatched: true` flag lets Portfolio.jsx show a "fix me" badge.
      const schemeCode = f.schemeCode && String(f.schemeCode).trim()
        ? String(f.schemeCode).trim()
        : `UNMATCHED_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      try {
        await addFund({
          schemeCode,
          schemeName: f.schemeName || f.originalName || "Unknown Fund",
          category: f.category,
          startDate,
          investmentType: f.investmentType,
          sipAmount: f.sipAmount,
          lumpSum: f.lumpSum,
          units: f.units,
          currentValue: f.currentValue,
          expenseRatio: f.expenseRatio,
          folio: f.folio || "",
          unmatched: f.unmatched || false,
        });
        if (f.unmatched) addedUnmatched.push(f.schemeName || f.originalName);
      } catch (e) {
        const msg = e.response?.data?.message || e.message || "";
        if (!msg.toLowerCase().includes("already") && !msg.toLowerCase().includes("skipped")) {
          failed.push(f.schemeName);
        }
      }
    }

    setImport(false);

    const warnings = [];
    if (addedUnmatched.length)
      warnings.push(`⚠ ${addedUnmatched.length} fund(s) added without mfapi match — edit them in Portfolio to link a live scheme code: ${addedUnmatched.join(", ")}`);
    if (failed.length)
      warnings.push(`${failed.length} fund(s) failed to save: ${failed.join(", ")}`);

    // Stay on page so user can read the warning; navigate only when clean
    if (warnings.length) { setImpErr(warnings.join(" · ")); setImport(false); return; }
    navigate("/portfolio");
  };

  const pct = Math.round(step / (STEPS.length - 1) * 100);

  if (stage === "confirm") return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, padding: "16px 20px", background: `${T.green}0d`, border: `1px solid ${T.greenBd}`, borderRadius: 12 }}>
        <div style={{ fontSize: 28 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Found {parsed.length} funds — Gemini AI parsed, mfapi.in matched</div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Review and edit values before importing. Uncheck funds you don't want.</div>
          {parsed.some(f => f.unmatched) && (
            <div style={{ fontSize: 11, color: T.amber, marginTop: 6 }}>
              ⚠ {parsed.filter(f => f.unmatched).length} fund(s) couldn't be matched to mfapi.in —
              they will be imported with an <strong>⚠ Unmatched</strong> flag. Use the search below each card to link them,
              or fix them later via Edit in Portfolio.
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={sBtn("ghost")} onClick={() => setStage("idle")}>← Back</button>
          <button style={{ ...sBtn("primary"), opacity: checked.length === 0 || importing ? 0.5 : 1 }}
            disabled={checked.length === 0 || importing} onClick={handleImport}>
            {importing ? <Spinner size={14} /> : null}
            Import {checked.length} Fund{checked.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {importErr && (
        <Alert type="error" onClose={() => setImpErr("")}>
          <div style={{ marginBottom: 8 }}>{importErr}</div>
          <button style={sBtn("primary")} onClick={() => navigate("/portfolio")}>Go to Portfolio →</button>
        </Alert>
      )}

      {parsed.map(f => {
        const on = checked.includes(f.id);
        return (
          <div key={f.id} style={{ ...sCard({ marginBottom: 12 }), border: `1px solid ${f.unmatched && on ? T.amber : on ? T.greenBd : T.border}`, opacity: on ? 1 : 0.4, transition: "all 0.15s" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <input type="checkbox" checked={on} onChange={() => setChecked(p => on ? p.filter(x => x !== f.id) : [...p, f.id])}
                style={{ marginTop: 3, accentColor: T.green, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.schemeName}</span>
                  {f.originalName && f.originalName !== f.schemeName && (
                    <span style={{ fontSize: 10, color: T.sub }}>was: {f.originalName}</span>
                  )}
                  <span style={{ background: `${CAT_COLORS[f.category] || T.green}18`, color: CAT_COLORS[f.category] || T.green, border: `1px solid ${CAT_COLORS[f.category] || T.green}30`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{f.category}</span>
                  {f.unmatched
                    ? <span style={{ fontSize: 11, color: T.amber, background: `${T.amber}15`, border: `1px solid ${T.amber}40`, borderRadius: 10, padding: "1px 7px" }}>⚠ Unmatched — will import without live NAV</span>
                    : <span style={{ fontSize: 11, color: T.cyan }}>mfapi: {f.schemeCode}</span>
                  }
                  {f.folio && <span style={{ fontSize: 11, color: T.sub }}>Folio: {f.folio}</span>}
                </div>

                {/* Inline re-link search for unmatched funds */}
                {f.unmatched && (
                  <UnmatchedRelink fund={f} onLink={(schemeCode, schemeName) =>
                    setParsed(prev => prev.map(p => p.id === f.id
                      ? { ...p, schemeCode, schemeName, unmatched: false }
                      : p
                    ))
                  } />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: "10px 14px" }}>
                  {[
                    { k: "currentValue", l: "Current Value (₹)", type: "number" },
                    { k: "sipAmount", l: "Monthly SIP (₹)", type: "number" },
                    { k: "lumpSum", l: "Lump Sum (₹)", type: "number" },
                    { k: "expenseRatio", l: "Expense Ratio (%)", type: "number", step: "0.01" },
                    { k: "startDate", l: "Start Date", type: "date" },
                  ].map(({ k, l, type, step }) => (
                    <div key={k}>
                      <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>{l}</label>
                      <input type={type} step={step} value={f[k] || ""} onChange={e => editField(f.id, k, type === "number" ? Number(e.target.value) : e.target.value)}
                        style={sInp(false, { padding: "6px 10px", fontSize: 12 })} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>Category</label>
                    <select value={f.category} onChange={e => editField(f.id, "category", e.target.value)}
                      style={sInp(false, { padding: "6px 10px", fontSize: 12, cursor: "pointer" })}>
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 8 }}>Upload Statement</div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.8 }}>
          PDF.js extracts text in-browser → <strong style={{ color: T.purple }}>Gemini AI</strong> parses funds → <strong style={{ color: T.cyan }}>mfapi.in</strong> matches live scheme codes.
          <br /><strong style={{ color: T.text }}>No data permanently stored without your action.</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        {[
          { n: "CAMS Statement", d: "Mirae · Axis · DSP · Franklin · PPFAS · Nippon", i: "📋", c: T.blue },
          { n: "KFintech Statement", d: "HDFC · ICICI Pru · Kotak · SBI · Aditya Birla · UTI", i: "📊", c: T.green },
        ].map(s => (
          <div key={s.n} style={sCard({ border: `1px solid ${s.c}30`, textAlign: "center", padding: "22px" })}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{s.i}</div>
            <div style={{ fontWeight: 700, color: T.text, marginBottom: 5 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.5 }}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={sCard({ marginBottom: 20, background: `${T.blue}08`, border: `1px solid ${T.blue}22` })}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.blue, marginBottom: 8 }}>📌 How to get your CAS PDF</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12, color: T.sub }}>
          {[["CAMS", "mycams.com → Statements → Detailed CAS"], ["KFintech", "kfintech.com → Investor → CAS PDF"], ["MF Central", "mfcentral.com → Statements → Consolidated"], ["AMFI", "investor.amfiindia.com → CAS"]].map(([s, d]) => (
            <div key={s} style={{ display: "flex", gap: 6 }}><strong style={{ color: T.text, minWidth: 72 }}>{s}</strong>{d}</div>
          ))}
        </div>
      </div>

      {stage === "idle" && (
        <div style={{ border: `2px dashed ${drag ? T.green : T.border}`, borderRadius: 16, padding: "52px 32px", textAlign: "center", cursor: "pointer", background: drag ? `${T.green}06` : "transparent", transition: "all 0.2s" }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 48, marginBottom: 14 }}>📂</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Drop your CAS PDF here</div>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 22 }}>Text-based PDF only · CAMS · KFintech · MF Central</div>
          <button style={sBtn("primary")} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Select PDF File</button>
        </div>
      )}

      {stage === "loading" && (
        <div style={sCard({ padding: "28px 24px" })}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.green, marginBottom: 4 }}>Processing: {fname}</div>
          <div style={{ marginBottom: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: i < step ? T.green : i === step ? T.amber : T.surfHi, color: i <= step ? "#000" : T.sub, transition: "all 0.3s" }}>
                  {i < step ? "✓" : i === step ? "…" : ""}
                </div>
                <div style={{ fontSize: 13, color: i <= step ? T.text : T.sub }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 4, background: T.surfHi, borderRadius: 2 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: T.green, borderRadius: 2, transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 11, color: T.sub, textAlign: "right", marginTop: 5 }}>{pct}%</div>
        </div>
      )}

      {stage === "error" && (
        <div style={sCard({ border: `1px solid ${T.red}44`, background: `${T.red}08` })}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.red, marginBottom: 8 }}>⚠ Parsing Failed</div>
          <div style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.7, marginBottom: 16 }}>{errMsg}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={sBtn("primary")} onClick={() => { setStage("idle"); setStep(0); }}>Try Again</button>
            <button style={sBtn("ghost")} onClick={() => navigate("/portfolio")}>Add Manually</button>
          </div>
        </div>
      )}
    </div>
  );
}
