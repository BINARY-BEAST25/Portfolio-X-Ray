import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PortfolioProvider } from "./context/PortfolioContext";

import Login     from "./components/auth/Login";
import Register  from "./components/auth/Register";
import Profile   from "./components/auth/Profile";
import Landing   from "./components/landing/Landing";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/portfolio/Dashboard";
import Portfolio from "./components/portfolio/Portfolio";
import Upload    from "./components/upload/Upload";
import Analysis  from "./components/analysis/Analysis";
import Chat      from "./components/chat/Chat";
import Planner   from "./components/planner/Planner";
import { Spinner } from "./components/ui";
import { T } from "./utils/helpers";

// ── Protected route wrapper ──────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <Spinner size={40} />
          <div style={{ fontSize: 13, color: T.sub, marginTop: 16 }}>Loading your portfolio…</div>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

// ── Public route (redirect if already logged in) ─────
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/app" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected: all inside PortfolioProvider + AppLayout */}
      <Route path="/app/*" element={
        <ProtectedRoute>
          <PortfolioProvider>
            <AppLayout>
              <Routes>
                <Route index             element={<Dashboard />} />
                <Route path="upload"     element={<Upload />} />
                <Route path="portfolio"  element={<Portfolio />} />
                <Route path="analysis"   element={<Analysis />} />
                <Route path="chat"       element={<Chat />} />
                <Route path="planner"    element={<Planner />} />
                <Route path="profile"    element={<Profile />} />
                <Route path="*"          element={<Navigate to="/app" replace />} />
              </Routes>
            </AppLayout>
          </PortfolioProvider>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
