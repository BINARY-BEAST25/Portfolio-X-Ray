import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePortfolio } from "../../context/PortfolioContext";
import { T, fmtL, fmtPct } from "../../utils/helpers";
import { Spinner } from "../ui";

const NAV = [
  { to: "/",         icon: "⬡",  label: "Dashboard"   },
  { to: "/upload",   icon: "↑",  label: "Upload PDF",  badge: "NEW" },
  { to: "/portfolio",icon: "◈",  label: "Portfolio"    },
  { to: "/analysis", icon: "📊", label: "Analysis"     },
  { to: "/chat",     icon: "◎",  label: "AI Mentor"    },
  { to: "/planner",  icon: "◉",  label: "Planner"      },
  { to: "/profile",  icon: "👤", label: "Profile"      },
];

function Sidebar({ collapsed }) {
  const { user, logout }    = useAuth();
  const { portfolio, refreshNAVs, loading } = usePortfolio();
  const navigate = useNavigate();

  const totalCur = portfolio?.totalValue     || 0;
  const totalInv = portfolio?.totalInvested  || 0;
  const gain     = portfolio?.totalGain      || 0;
  const absRet   = portfolio?.absoluteReturn || 0;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside style={{ width: collapsed ? 60 : 218, background: T.surf, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s", overflow: "hidden" }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "18px 0" : "20px 18px 16px", borderBottom: `1px solid ${T.border}`, textAlign: collapsed ? "center" : "left" }}>
        {!collapsed ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 900, color: T.green, letterSpacing: "-0.5px" }}>AI Money Mentor</div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>Gemini AI · mfapi.in</div>
          </>
        ) : (
          <div style={{ fontSize: 20 }}>💰</div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "9px 0" : "9px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 9, textDecoration: "none", fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              background: isActive ? T.greenDim : "transparent",
              color: isActive ? T.green : T.sub,
              border: isActive ? `1px solid ${T.greenBd}` : "1px solid transparent",
              transition: "all 0.12s",
            })}>
            <span style={{ fontSize: 15, width: collapsed ? "auto" : 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            {!collapsed && item.badge && (
              <span style={{ background: `${T.green}22`, color: T.green, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6 }}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Portfolio mini widget */}
      {!collapsed && portfolio?.funds?.length > 0 && (
        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ background: T.greenDim, border: `1px solid ${T.greenBd}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.5px" }}>PORTFOLIO</div>
              <button onClick={refreshNAVs} disabled={loading} title="Refresh NAV"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.sub, padding: 2 }}>
                {loading ? <Spinner size={12} /> : "↻"}
              </button>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>{fmtL(totalCur)}</div>
            <div style={{ fontSize: 12, color: gain >= 0 ? T.green : T.red, marginTop: 3, fontWeight: 600 }}>
              {gain >= 0 ? "+" : ""}{fmtL(gain)} ({fmtPct(absRet)})
            </div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 5 }}>{portfolio.funds.length} fund{portfolio.funds.length !== 1 ? "s" : ""} · live NAV</div>
            <div style={{ height: 2, background: T.border, borderRadius: 2, marginTop: 10 }}>
              <div style={{ width: `${Math.min(100, Math.max(0, absRet * 3))}%`, height: "100%", background: T.green, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      )}

      {/* User + Logout */}
      {!collapsed && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${T.green}22`, border: `1px solid ${T.greenBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: T.green, fontSize: 13, flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: "100%", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px", fontSize: 12, color: T.sub, cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden" }}>
      <Sidebar collapsed={collapsed} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{ height: 52, background: T.surf, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setCollapsed(p => !p)}
            style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 18, padding: 4, lineHeight: 1 }}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: T.sub, background: `${T.cyan}12`, border: `1px solid ${T.cyan}22`, borderRadius: 20, padding: "3px 10px" }}>
            mfapi.in live
          </span>
          <span style={{ fontSize: 11, color: T.purple, background: `${T.purple}12`, border: `1px solid ${T.purple}22`, borderRadius: 20, padding: "3px 10px" }}>
            Gemini AI
          </span>
        </header>
        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
