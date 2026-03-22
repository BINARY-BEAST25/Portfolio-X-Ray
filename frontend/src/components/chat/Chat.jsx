import { useState, useEffect, useRef } from "react";
import { usePortfolio } from "../../context/PortfolioContext";
import { useAuth } from "../../context/AuthContext";
import { analysisAPI } from "../../services/api";
import { T, fmtL, sBtn, sInp } from "../../utils/helpers";
import { Spinner } from "../ui";

const QUICK = [
  "How is my portfolio performing?",
  "Which fund should I consider exiting?",
  "How to lower my expense ratio?",
  "Am I properly diversified?",
  "How much SIP for ₹1 Cr in 15 years?",
  "Explain XIRR vs absolute return",
  "Should I increase my SIP?",
  "What is ELSS and should I invest?",
];

export default function Chat() {
  const { user }      = useAuth();
  const { portfolio } = usePortfolio();
  const hasFunds = (portfolio?.funds?.length || 0) > 0;

  const mkWelcome = () => hasFunds
    ? `Namaste ${user?.name?.split(" ")[0] || ""}! 👋 I'm Aryan, your AI money mentor.\n\nI can see your portfolio of **${portfolio.funds.length} funds** worth **${fmtL(portfolio.totalValue)}**. I have your live NAV data, XIRR figures, and Gemini AI powering my analysis.\n\nWhat would you like to know?`
    : `Namaste! 👋 I'm Aryan, your AI money mentor.\n\nYou haven't added any funds yet. Head to **Portfolio** to add funds manually, or **Upload** your CAMS/KFintech PDF — then I'll have your real numbers to advise on.\n\nFeel free to ask general MF / SIP / tax questions!`;

  const [msgs,    setMsgs]  = useState([{ role: "assistant", content: mkWelcome() }]);
  const [input,   setInput] = useState("");
  const [loading, setLoad]  = useState(false);
  const histRef = useRef([]);
  const endRef  = useRef(null);

  useEffect(() => {
    setMsgs([{ role: "assistant", content: mkWelcome() }]);
    histRef.current = [];
  }, [portfolio?.funds?.length]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (text) => {
    const t = (text || input).trim(); if (!t) return;
    setInput(""); setLoad(true);
    histRef.current = [...histRef.current, { role: "user", content: t }];
    setMsgs(p => [...p, { role: "user", content: t }]);

    try {
      const r = await analysisAPI.chat({ message: t, history: histRef.current.slice(-12) });
      const reply = r.data.reply;
      histRef.current = [...histRef.current, { role: "assistant", content: reply }];
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) {
      const err = e.message || "Something went wrong. Please try again.";
      setMsgs(p => [...p, { role: "assistant", content: err }]);
    } finally { setLoad(false); }
  };

  const renderMsg = (text) => text.split("\n").map((line, i) => (
    <div key={i} style={{ marginBottom: line === "" ? 6 : 2 }}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={j} style={{ color: "#f1f5f9" }}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      )}
    </div>
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)" }}>
      {/* Chat header */}
      <div style={{ padding: "12px 20px", background: T.surf, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 16 }}>A</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Aryan — AI Money Mentor</div>
          <div style={{ fontSize: 11, color: T.green }}>
            {hasFunds
              ? `● Gemini AI · ${portfolio.funds.length} funds loaded · ${fmtL(portfolio.totalValue)}`
              : "● Gemini AI · Add funds for personalised advice"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span style={{ background: `${T.purple}18`, color: T.purple, border: `1px solid ${T.purple}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Gemini 1.5 Flash</span>
          <span style={{ background: `${T.amber}18`, color: T.amber, border: `1px solid ${T.amber}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Not SEBI Registered</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ animation: "fadeIn 0.3s ease" }}>
            {m.role === "assistant" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 11, flexShrink: 0, marginTop: 2 }}>A</div>
                <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: "14px 14px 14px 4px", padding: "11px 14px", maxWidth: "76%", fontSize: 13, color: "#cbd5e1", lineHeight: 1.65 }}>
                  {renderMsg(m.content)}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: T.green, color: "#000", borderRadius: "14px 14px 4px 14px", padding: "11px 14px", maxWidth: "70%", fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
                  {m.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 11, flexShrink: 0 }}>A</div>
            <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: "14px 14px 14px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.sub, animation: `dot 1s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: "8px 20px 4px", background: T.surf, borderTop: `1px solid ${T.surfHi}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => send(q)} disabled={loading}
              style={{ background: T.surfHi, border: `1px solid ${T.border}`, borderRadius: 16, padding: "5px 12px", fontSize: 11, color: T.sub, cursor: "pointer", whiteSpace: "nowrap", opacity: loading ? 0.4 : 1 }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, background: T.surf, flexShrink: 0 }}>
        <input
          style={{ ...sInp(), borderRadius: 24, flex: 1 }}
          placeholder="Ask Aryan anything about your portfolio…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && !loading && send()}
          disabled={loading}
        />
        <button style={{ ...sBtn("primary"), borderRadius: 24, padding: "10px 22px", opacity: loading ? 0.5 : 1 }}
          onClick={() => !loading && send()} disabled={loading}>
          Send ↑
        </button>
      </div>
    </div>
  );
}
