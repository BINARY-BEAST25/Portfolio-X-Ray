import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { T, sInp, sBtn } from "../../utils/helpers";
import { Alert, Spinner } from "../ui";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: T.green, letterSpacing: "-1px", marginBottom: 8 }}>
            💰 Portfolio-X-Ray
          </div>
          <div style={{ fontSize: 14, color: T.sub }}></div>
        </div>

        {/* Card */}
        <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 16, padding: "32px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 24 }}>Sign in to your portfolio</div>

          {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Email</label>
              <input style={sInp()} type="email" placeholder="you@example.com" value={form.email}
                onChange={e => set("email", e.target.value)} required autoComplete="email" />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Password</label>
              <input style={sInp()} type="password" placeholder="••••••••" value={form.password}
                onChange={e => set("password", e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading}
              style={{ ...sBtn("primary"), width: "100%", padding: "11px", fontSize: 14, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <Spinner size={16} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.sub }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: T.green, textDecoration: "none", fontWeight: 600 }}>Create one</Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div style={{ marginTop: 16, background: `${T.blue}11`, border: `1px solid ${T.blue}22`, borderRadius: 10, padding: "12px 16px", fontSize: 12, color: T.sub, textAlign: "center" }}>
          <strong style={{ color: T.blue }}>Demo:</strong> demo@example.com / demo123
        </div>
      </div>
    </div>
  );
}
