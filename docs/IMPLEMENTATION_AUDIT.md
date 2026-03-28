# FolioX Core Idea Audit (Current Repo)

Date: 2026-03-28
Stack in repo: React + Vite + Express + MongoDB + Gemini + mfapi.in

## Summary
- Core idea status: **Mostly implemented** (portfolio ingestion, NAV sync, XIRR, AI analysis, chat, planner, dashboard).
- Not required to switch to Next.js/FastAPI/Firebase/Supabase to deliver core value.
- Main gaps are around deployment tooling, docs, optional CSV pipeline, and demo-flow polish.

## Phase-by-phase status

### PHASE 1: Accounts & Keys
- GitHub repo: **Implemented** (existing public repo in use).
- Firebase project: **Missing** (not used in current architecture).
- Supabase project: **Missing** (not used in current architecture).
- Gemini API key: **Implemented** (backend uses `GEMINI_API_KEY`).
- Groq API key: **Missing** (chat uses Gemini currently, no Groq integration).
- Render account / UptimeRobot: **Unknown/Manual** (outside codebase).

### PHASE 2: Project Setup
- Node/VS Code/Git setup: **Implemented** (project builds and runs).
- Python backend setup: **Missing** by design (current backend is Node/Express).
- Frontend scaffolding: **Implemented** (Vite React app, auth, routes, dashboard).
- Backend scaffolding: **Implemented** (Express routes, models, services).
- Env templates: **Implemented** (`backend/.env.example`, `frontend/.env.example`).
- Git push workflow: **Implemented**.

### PHASE 3: Build Features (Core Product)
- Fund search + manual input: **Implemented** (`Portfolio.jsx`, `funds/search`).
- mfapi integration (search/nav/history/bulk): **Implemented** (`backend/services/mfapiService.js`, `routes/funds.js`).
- Statement upload + parse: **Implemented** (`Upload.jsx`, `analysis/parse-statement`).
- XIRR engine: **Implemented** (deterministic in `routes/portfolio.js`; AI endpoint also exists).
- Overlap analysis: **Implemented** (`analysis/overlap`).
- Expense drain analysis: **Implemented** (`analysis/expense-drain`).
- Tax harvesting analysis: **Implemented** (`analysis/tax-harvest`).
- Goal planning: **Implemented** (frontend planner + profile goals + SIP recommendation endpoint).
- AI insights: **Implemented** (`analysis/full`, `analysis/insights`).
- Portfolio chat: **Implemented** (currently Gemini, not Groq).
- Dashboard + charts: **Implemented** (`Dashboard.jsx`, `Analysis.jsx`, `Planner.jsx`).
- CSV upload/parser: **Missing** (optional bonus in your plan).

### PHASE 4: Deploy
- Backend deploy config: **Partially implemented** (vercel config + server ready; Render-specific docs not complete).
- Frontend deploy config: **Partially implemented** (Vite build works; Firebase Hosting flow not documented in repo).
- Keep-warm monitoring: **Missing** (ops/manual).

### PHASE 5: Demo Prep
- Demo account/portfolio idea: **Partially implemented** (login shows demo creds, but no one-click "Try Demo Portfolio" flow).
- Architecture doc and impact model in repo: **Missing**.
- Submission-ready README rewrite: **Partial**.

## What was implemented in this pass
- Added public landing page at `/` with stronger UX and CTA to login/register.
- Moved authenticated app under `/app/*` without breaking existing features.
- Updated internal navigation links to `/app/...` paths.

## Next implementation queue (no stack rewrite)
1. Add one-click "Try Demo Portfolio" seed flow.
2. Add CSV upload (frontend parser + backend ingestion endpoint).
3. Add deployment docs for Render + Firebase Hosting (or your chosen hosting).
4. Add architecture diagram + impact model docs for submission.
5. Optional: add Groq chat provider switch while keeping Gemini default.
