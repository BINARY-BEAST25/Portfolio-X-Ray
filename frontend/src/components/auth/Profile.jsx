import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { T, sCard, sBtn, sInp } from "../../utils/helpers";
import { Alert } from "../ui";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [tab, setTab]   = useState("profile");
  const [saving, setSave] = useState(false);
  const [msg, setMsg]     = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    name:            user?.name || "",
    phone:           user?.phone || "",
    pan:             user?.pan || "",
    riskProfile:     user?.riskProfile || "moderate",
    monthlyIncome:   user?.monthlyIncome || "",
    monthlyExpenses: user?.monthlyExpenses || "",
  });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

  const saveProfile = async (e) => {
    e.preventDefault(); setSave(true); setMsg({ type: "", text: "" });
    try {
      await updateProfile({ ...form, monthlyIncome: Number(form.monthlyIncome), monthlyExpenses: Number(form.monthlyExpenses) });
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Update failed" });
    } finally { setSave(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setMsg({ type: "error", text: "Passwords do not match" }); return; }
    if (pwForm.newPassword.length < 6) { setMsg({ type: "error", text: "Password min 6 characters" }); return; }
    setSave(true); setMsg({ type: "", text: "" });
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setMsg({ type: "success", text: "Password changed successfully!" });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Password change failed" });
    } finally { setSave(false); }
  };

  const TB = ({ id, l }) => (
    <button onClick={() => { setTab(id); setMsg({ type: "", text: "" }); }}
      style={{ background: "none", border: "none", borderBottom: tab === id ? `2px solid ${T.green}` : "2px solid transparent", padding: "9px 18px", fontSize: 13, fontWeight: tab === id ? 700 : 400, color: tab === id ? T.green : T.sub, cursor: "pointer", marginBottom: -1 }}>
      {l}
    </button>
  );

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block" }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 680 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>Account Settings</div>

      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        <TB id="profile" l="Profile" /><TB id="security" l="Security" /><TB id="goals" l="Goals" />
      </div>

      {msg.text && <Alert type={msg.type} onClose={() => setMsg({ type: "", text: "" })}>{msg.text}</Alert>}

      {/* ── Profile ── */}
      {tab === "profile" && (
        <form onSubmit={saveProfile}>
          <div style={sCard({ marginBottom: 20 })}>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${T.green}22`, border: `2px solid ${T.greenBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: T.green }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{user?.email}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Full Name"><input style={sInp()} value={form.name} onChange={e => setF("name", e.target.value)} required /></Field>
              <Field label="Phone"><input style={sInp()} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="10-digit mobile" /></Field>
              <Field label="PAN (optional)"><input style={sInp()} value={form.pan} onChange={e => setF("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></Field>
              <Field label="Risk Profile">
                <select style={sInp()} value={form.riskProfile} onChange={e => setF("riskProfile", e.target.value)}>
                  <option value="conservative">Conservative (FD / Debt heavy)</option>
                  <option value="moderate">Moderate (Balanced)</option>
                  <option value="aggressive">Aggressive (Equity heavy)</option>
                </select>
              </Field>
              <Field label="Monthly Income (₹)"><input style={sInp()} type="number" value={form.monthlyIncome} onChange={e => setF("monthlyIncome", e.target.value)} placeholder="e.g. 100000" /></Field>
              <Field label="Monthly Expenses (₹)"><input style={sInp()} type="number" value={form.monthlyExpenses} onChange={e => setF("monthlyExpenses", e.target.value)} placeholder="e.g. 60000" /></Field>
            </div>
            <div style={{ marginTop: 8, padding: "10px 12px", background: T.surfHi, borderRadius: 8, fontSize: 12, color: T.sub }}>
              Income and expenses help <strong style={{ color: T.purple }}>Gemini AI</strong> give more accurate SIP recommendations and retirement planning.
            </div>
          </div>
          <button type="submit" style={sBtn("primary")} disabled={saving}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      )}

      {/* ── Security ── */}
      {tab === "security" && (
        <form onSubmit={changePassword}>
          <div style={sCard({ marginBottom: 20 })}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 18 }}>Change Password</div>
            <Field label="Current Password"><input style={sInp()} type="password" value={pwForm.currentPassword} onChange={e => setPw("currentPassword", e.target.value)} required /></Field>
            <Field label="New Password (min 6 chars)"><input style={sInp()} type="password" value={pwForm.newPassword} onChange={e => setPw("newPassword", e.target.value)} required /></Field>
            <Field label="Confirm New Password">
              <input style={sInp(pwForm.confirm && pwForm.newPassword !== pwForm.confirm)} type="password" value={pwForm.confirm} onChange={e => setPw("confirm", e.target.value)} required />
            </Field>
          </div>
          <button type="submit" style={sBtn("primary")} disabled={saving}>{saving ? "Changing…" : "Change Password"}</button>
        </form>
      )}

      {/* ── Goals ── */}
      {tab === "goals" && (
        <GoalsEditor user={user} updateProfile={updateProfile} setMsg={setMsg} />
      )}
    </div>
  );
}

function GoalsEditor({ user, updateProfile, setMsg }) {
  const [goals, setGoals] = useState(user?.goals || []);
  const [saving, setSave] = useState(false);

  const addGoal = () => setGoals(p => [...p, { name: "", targetAmt: "", targetDate: "", priority: "medium" }]);
  const setG    = (i, k, v) => setGoals(p => p.map((g, j) => j === i ? { ...g, [k]: v } : g));
  const delGoal = (i) => setGoals(p => p.filter((_, j) => j !== i));

  const saveGoals = async () => {
    setSave(true);
    try {
      await updateProfile({ goals: goals.map(g => ({ ...g, targetAmt: Number(g.targetAmt) })) });
      setMsg({ type: "success", text: "Goals saved!" });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    finally { setSave(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {goals.map((g, i) => (
          <div key={i} style={{ ...sCard({ marginBottom: 12 }), border: `1px solid ${T.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>Goal name</label>
                <input style={sInp()} value={g.name} onChange={e => setG(i, "name", e.target.value)} placeholder="e.g. Child's Education" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>Target (₹)</label>
                <input style={sInp()} type="number" value={g.targetAmt} onChange={e => setG(i, "targetAmt", e.target.value)} placeholder="5000000" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>Target year</label>
                <input style={sInp()} type="number" min="2025" max="2080" value={g.targetDate ? new Date(g.targetDate).getFullYear() : ""} onChange={e => setG(i, "targetDate", new Date(`${e.target.value}-01-01`).toISOString())} placeholder="2035" />
              </div>
              <div style={{ paddingBottom: 2 }}>
                <button style={{ ...sBtn("danger"), padding: "9px 12px" }} onClick={() => delGoal(i)}>✕</button>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: T.sub, marginBottom: 4, display: "block" }}>Priority</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["low", "medium", "high"].map(p => (
                  <button key={p} onClick={() => setG(i, "priority", p)}
                    style={{ ...sBtn(g.priority === p ? "primary" : "ghost"), flex: 1, padding: "5px", fontSize: 11, textTransform: "capitalize" }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={sBtn("ghost")} onClick={addGoal}>+ Add Goal</button>
        <button style={sBtn("primary")} onClick={saveGoals} disabled={saving}>{saving ? "Saving…" : "Save Goals"}</button>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: T.sub }}>
        Goals are shared with <strong style={{ color: T.purple }}>Gemini AI</strong> to personalise analysis and recommendations.
      </div>
    </div>
  );
}
