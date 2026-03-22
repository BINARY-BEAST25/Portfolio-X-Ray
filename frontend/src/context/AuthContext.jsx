import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // checking stored token on mount
  const [error,   setError]   = useState(null);

  // ── On mount: verify stored token ─────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // ── Register ───────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    setError(null);
    const res = await authAPI.register({ name, email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // ── Login ──────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await authAPI.login({ email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // ── Logout ─────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  // ── Update profile ─────────────────────────────────
  const updateProfile = useCallback(async (data) => {
    const res = await authAPI.updateProfile(data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
