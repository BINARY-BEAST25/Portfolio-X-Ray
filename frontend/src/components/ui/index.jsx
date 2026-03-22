import { T, sCard, sBadge } from "../../utils/helpers";

export const Spinner = ({ size = 20, style = {} }) => (
  <div style={{ width: size, height: size, border: `2px solid ${T.border}`, borderTop: `2px solid ${T.green}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0, ...style }} />
);

export const MetricCard = ({ label, value, sub, color, accent }) => (
  <div style={{ ...sCard(), border: accent ? `1px solid ${accent}33` : `1px solid ${T.border}` }}>
    <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || T.text, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: color || T.sub, marginTop: 5 }}>{sub}</div>}
  </div>
);

export const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
    {tabs.map(([id, label]) => (
      <button key={id} onClick={() => onChange(id)}
        style={{ background: "none", border: "none", borderBottom: active === id ? `2px solid ${T.green}` : "2px solid transparent", padding: "9px 18px", fontSize: 13, fontWeight: active === id ? 700 : 400, color: active === id ? T.green : T.sub, cursor: "pointer", marginBottom: -1, transition: "color 0.15s" }}>
        {label}
      </button>
    ))}
  </div>
);

export const EmptyState = ({ icon, title, body, action, onAction }) => (
  <div style={{ textAlign: "center", padding: "72px 28px" }}>
    <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: T.sub, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>{body}</div>
    {action && (
      <button onClick={onAction}
        style={{ marginTop: 20, background: T.green, border: "none", borderRadius: 8, padding: "10px 22px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        {action}
      </button>
    )}
  </div>
);

export const Badge = ({ children, color }) => (
  <span style={sBadge(color)}>{children}</span>
);

export const Alert = ({ type = "info", children, onClose }) => {
  const colors = { info: T.blue, success: T.green, warning: T.amber, error: T.red };
  const c = colors[type] || T.blue;
  return (
    <div style={{ background: `${c}12`, border: `1px solid ${c}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{children}</div>
      {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>}
    </div>
  );
};

export const ProgressBar = ({ value, max = 100, color, height = 4 }) => (
  <div style={{ height, background: T.surfHi, borderRadius: height / 2 }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color || T.green, borderRadius: height / 2, transition: "width 0.5s" }} />
  </div>
);

export const RangeSlider = ({ label, value, onChange, min, max, step = 1, display }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.sub, marginBottom: 6 }}>
      <span>{label}</span>
      <span style={{ color: T.green, fontWeight: 700 }}>{display ?? value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: T.green }} />
  </div>
);
