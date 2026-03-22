import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { T, sInp, sBtn } from "../../utils/helpers";
import { Alert, Spinner } from "../ui";

export default function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: T.green, letterSpacing: "-1px", marginBottom: 8 }}>💰 AI Money Mentor</div>
          <div style={{ fontSize: 14, color: T.sub }}>Start tracking your mutual fund portfolio for free</div>
        </div>

        <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 16, padding: "32px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Create Account</div>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 24 }}>Free forever · No credit card needed</div>

          {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Full Name</label>
              <input style={sInp()} type="text" placeholder="Rahul Sharma" value={form.name}
                onChange={e => set("name", e.target.value)} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Email</label>
              <input style={sInp()} type="email" placeholder="rahul@example.com" value={form.email}
                onChange={e => set("email", e.target.value)} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
              <div>
                <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Password</label>
                <input style={sInp()} type="password" placeholder="Min 6 chars" value={form.password}
                  onChange={e => set("password", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>Confirm</label>
                <input style={sInp(form.confirm && form.password !== form.confirm)} type="password"
                  placeholder="Repeat password" value={form.confirm}
                  onChange={e => set("confirm", e.target.value)} required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ ...sBtn("primary"), width: "100%", padding: "11px", fontSize: 14, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <Spinner size={16} />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.sub }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: T.green, textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
