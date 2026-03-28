import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePortfolio } from "../../context/PortfolioContext";
import { T, fmtL, fmtPct } from "../../utils/helpers";
import { Spinner } from "../ui";

const NAV = [
  { to: "/app", icon: "dashboard", label: "Dashboard" },
  { to: "/app/upload", icon: "upload", label: "Upload PDF", badge: "NEW" },
  { to: "/app/portfolio", icon: "portfolio", label: "Portfolio" },
  { to: "/app/analysis", icon: "analysis", label: "Analysis" },
  { to: "/app/chat", icon: "chat", label: "AI Mentor" },
  { to: "/app/planner", icon: "planner", label: "Planner" },
  { to: "/app/profile", icon: "profile", label: "Profile" },
];

function NavIcon({ name }) {
  const shared = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...shared}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "upload":
      return (
        <svg {...shared}>
          <path d="M12 16V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      );
    case "portfolio":
      return (
        <svg {...shared}>
          <path d="M3 7h18" />
          <path d="M6 3h12v18H6z" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "analysis":
      return (
        <svg {...shared}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20v-12" />
        </svg>
      );
    case "chat":
      return (
        <svg {...shared}>
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-3.2-.6L3 21l1.7-5.2a8.5 8.5 0 1 1 16.3-4.3z" />
        </svg>
      );
    case "planner":
      return (
        <svg {...shared}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 2v4M16 2v4M4 10h16" />
          <path d="M8 14h3M8 17h6" />
        </svg>
      );
    case "profile":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      );
    default:
      return null;
  }
}

function Sidebar({ collapsed, isMobile, onNavigate }) {
  const { user, logout } = useAuth();
  const { portfolio, refreshNAVs, loading } = usePortfolio();
  const navigate = useNavigate();

  const totalCur = portfolio?.totalValue || 0;
  const gain = portfolio?.totalGain || 0;
  const absRet = portfolio?.absoluteReturn || 0;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      style={{
        width: collapsed ? 60 : 218,
        background: T.surf,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div style={{ padding: collapsed ? "18px 0" : "20px 18px 16px", borderBottom: `1px solid ${T.border}`, textAlign: collapsed ? "center" : "left" }}>
        {!collapsed ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 900, color: T.green, letterSpacing: "-0.5px" }}>Portfolio-X-Ray</div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 3 }} />
          </>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 800, color: T.green }}>PX</div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            onClick={() => isMobile && onNavigate?.()}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "9px 0" : "9px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 9,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              background: isActive ? T.greenDim : "transparent",
              color: isActive ? T.green : T.sub,
              border: isActive ? `1px solid ${T.greenBd}` : "1px solid transparent",
              transition: "all 0.12s",
            })}
          >
            <span
              style={{
                width: collapsed ? "auto" : 18,
                minWidth: 16,
                textAlign: "center",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NavIcon name={item.icon} />
            </span>
            {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            {!collapsed && item.badge && (
              <span style={{ background: `${T.green}22`, color: T.green, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6 }}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {!collapsed && portfolio?.funds?.length > 0 && (
        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ background: T.greenDim, border: `1px solid ${T.greenBd}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.5px" }}>PORTFOLIO</div>
              <button onClick={refreshNAVs} disabled={loading} title="Refresh NAV" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.sub, padding: 2 }}>
                {loading ? <Spinner size={12} /> : "R"}
              </button>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>{fmtL(totalCur)}</div>
            <div style={{ fontSize: 12, color: gain >= 0 ? T.green : T.red, marginTop: 3, fontWeight: 600 }}>
              {gain >= 0 ? "+" : ""}
              {fmtL(gain)} ({fmtPct(absRet)})
            </div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 5 }}>{portfolio.funds.length} funds, live NAV</div>
          </div>
        </div>
      )}

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
          <button onClick={handleLogout} style={{ width: "100%", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px", fontSize: 12, color: T.sub, cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(false);
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, overflow: "hidden" }}>
      {isMobile ? (
        <>
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 998 }}
            />
          )}
          <div
            style={{
              position: "fixed",
              left: mobileOpen ? 0 : -240,
              top: 0,
              bottom: 0,
              width: 218,
              zIndex: 999,
              transition: "left 0.2s ease",
            }}
          >
            <Sidebar collapsed={false} isMobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      ) : (
        <Sidebar collapsed={collapsed} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: 0 }}>
        <header style={{ height: 52, background: T.surf, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => (isMobile ? setMobileOpen((p) => !p) : setCollapsed((p) => !p))}
            style={{ background: "none", border: `1px solid ${T.border}`, color: T.sub, cursor: "pointer", fontSize: 12, borderRadius: 8, padding: "6px 10px", lineHeight: 1 }}
          >
            Menu
          </button>
          <div style={{ flex: 1 }} />
          {!isMobile && (
            <>
              <span style={{ fontSize: 11, color: T.sub, background: `${T.cyan}12`, border: `1px solid ${T.cyan}22`, borderRadius: 20, padding: "3px 10px" }}>mfapi.in live</span>
              <span style={{ fontSize: 11, color: T.purple, background: `${T.purple}12`, border: `1px solid ${T.purple}22`, borderRadius: 20, padding: "3px 10px" }}>Gemini AI</span>
            </>
          )}
        </header>

        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
