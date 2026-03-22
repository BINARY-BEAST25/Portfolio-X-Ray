const axios = require("axios");

const BASE  = process.env.MFAPI_BASE_URL || "https://api.mfapi.in/mf";
const cache = new Map(); // in-memory cache
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const cached = async (key, fetcher) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const data = await fetcher();
  cache.set(key, { data, ts: Date.now() });
  return data;
};

const mfapi = {
  /** All ~16k schemes [{schemeCode, schemeName}] – cached 30 min */
  allSchemes: () =>
    cached("all_schemes", async () => {
      const { data } = await axios.get(BASE, { timeout: 15000 });
      return data;
    }),

  /** Full scheme: meta + data[{date,nav}] – cached 10 min */
  scheme: (code) =>
    cached(`scheme_${code}`, async () => {
      const { data } = await axios.get(`${BASE}/${code}`, { timeout: 10000 });
      return data;
    }),

  /** Live NAV only */
  liveNAV: async (code) => {
    const s = await mfapi.scheme(code);
    const d = s?.data?.[0];
    return d ? { nav: parseFloat(d.nav), date: d.date, meta: s.meta } : null;
  },

  /** Historical NAV for last N days */
  history: async (code, days = 365) => {
    const s = await mfapi.scheme(code);
    return (s?.data || []).slice(0, days).reverse(); // oldest first
  },

  /** Search schemes by name */
  search: async (query) => {
    const all = await mfapi.allSchemes();
    const q   = query.toLowerCase();
    return all.filter(s => s.schemeName.toLowerCase().includes(q)).slice(0, 15);
  },

  /** Bulk live NAVs for an array of codes */
  bulkNAV: async (codes) => {
    const results = await Promise.allSettled(codes.map(c => mfapi.liveNAV(c)));
    const map = {};
    codes.forEach((c, i) => {
      if (results[i].status === "fulfilled") map[c] = results[i].value;
    });
    return map;
  },
};

module.exports = mfapi;
