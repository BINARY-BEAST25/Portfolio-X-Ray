import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err.response?.data || err);
  }
);

// ── Auth ─────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
  me:       ()     => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/password", data),
};

// ── Portfolio ─────────────────────────────────────────
export const portfolioAPI = {
  get:         ()       => api.get("/portfolio"),
  refresh:     ()       => api.get("/portfolio/refresh"),
  addFund:     (data)   => api.post("/portfolio/fund", data),
  updateFund:  (id, d)  => api.put(`/portfolio/fund/${id}`, d),
  deleteFund:  (id)     => api.delete(`/portfolio/fund/${id}`),
};

// ── Funds (mfapi proxy) ───────────────────────────────
export const fundsAPI = {
  search:   (q)      => api.get(`/funds/search?q=${encodeURIComponent(q)}`),
  all:      ()       => api.get("/funds/all"),
  scheme:   (code)   => api.get(`/funds/${code}`),
  nav:      (code)   => api.get(`/funds/${code}/nav`),
  history:  (code, days=365) => api.get(`/funds/${code}/history?days=${days}`),
  bulkNAV:  (codes)  => api.post("/funds/bulk-nav", { codes }),
};

// ── Analysis (Gemini AI) ──────────────────────────────
export const analysisAPI = {
  fullAnalysis:     ()      => api.get("/analysis/full"),
  insights:         ()      => api.get("/analysis/insights"),
  chat:             (data)  => api.post("/analysis/chat", data),
  parseStatement:   (text)  => api.post("/analysis/parse-statement", { text }),
  sipRecommendation:(data)  => api.post("/analysis/sip-recommendation", data),
};

export default api;
