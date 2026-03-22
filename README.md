# 💰 AI Money Mentor — Full MERN Stack

A production-grade Indian mutual fund portfolio tracker powered by **Gemini AI** and **mfapi.in** live NAV data.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + React Router v6   |
| Backend   | Node.js + Express.js                |
| Database  | MongoDB + Mongoose                  |
| AI        | Google Gemini 1.5 Flash             |
| MF Data   | mfapi.in (free, no key needed)      |
| Auth      | JWT + bcryptjs                      |
| Charts    | Recharts                            |

---

## Project Structure

```
ai-money-mentor/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User schema (bcrypt, JWT)
│   │   └── Portfolio.js          # Portfolio + Fund holdings
│   ├── middleware/auth.js        # JWT protect middleware
│   ├── routes/
│   │   ├── auth.js               # register, login, me, profile, password
│   │   ├── portfolio.js          # CRUD + live NAV refresh + XIRR
│   │   ├── funds.js              # mfapi.in proxy endpoints
│   │   └── analysis.js          # Gemini AI endpoints
│   ├── services/
│   │   ├── mfapiService.js      # mfapi.in with in-memory cache
│   │   └── geminiService.js     # Gemini 1.5 Flash integration
│   ├── server.js                 # Express app entry point
│   └── .env.example             # Environment variables template
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx   # Global auth state
    │   │   └── PortfolioContext.jsx
    │   ├── services/api.js       # Axios instance + all API methods
    │   ├── utils/helpers.js      # Formatters + financial math + tokens
    │   ├── components/
    │   │   ├── auth/             # Login, Register, Profile
    │   │   ├── layout/           # Sidebar, AppLayout
    │   │   ├── ui/               # Spinner, MetricCard, TabBar, etc.
    │   │   ├── portfolio/        # Dashboard, Portfolio (with FundCard)
    │   │   ├── analysis/         # Full Gemini X-Ray analysis
    │   │   ├── chat/             # Gemini AI conversational chat
    │   │   ├── planner/          # SIP, Goal, Retirement, Emergency
    │   │   └── upload/           # PDF.js + Gemini parse + mfapi match
    │   └── App.jsx               # Routes + Protected routes
    └── vite.config.js
```

---

## Quick Start

### 1. Clone & install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI and GEMINI_API_KEY in .env

# Frontend
cd ../frontend
npm install
```

### 2. Get API Keys

**Gemini API Key (Free)**
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add to `backend/.env` as `GEMINI_API_KEY=...`

**MongoDB**
- Local: install MongoDB and use `mongodb://localhost:27017/ai_money_mentor`
- Atlas (free tier): https://mongodb.com/atlas → Get connection string

**mfapi.in** — No key needed. Free, open API.

### 3. Run

```bash
# Terminal 1 – Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 – Frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

### Auth
| Method | URL                    | Description         | Auth |
|--------|------------------------|---------------------|------|
| POST   | /api/auth/register     | Create account      | No   |
| POST   | /api/auth/login        | Sign in             | No   |
| GET    | /api/auth/me           | Get current user    | Yes  |
| PUT    | /api/auth/profile      | Update profile      | Yes  |
| PUT    | /api/auth/password     | Change password     | Yes  |

### Portfolio
| Method | URL                          | Description                   | Auth |
|--------|------------------------------|-------------------------------|------|
| GET    | /api/portfolio               | Get user's portfolio          | Yes  |
| GET    | /api/portfolio/refresh       | Refresh live NAVs             | Yes  |
| POST   | /api/portfolio/fund          | Add a fund                    | Yes  |
| PUT    | /api/portfolio/fund/:id      | Update a fund                 | Yes  |
| DELETE | /api/portfolio/fund/:id      | Delete a fund                 | Yes  |

### Funds (mfapi.in proxy)
| Method | URL                          | Description                   |
|--------|------------------------------|-------------------------------|
| GET    | /api/funds/search?q=mirae    | Search fund names             |
| GET    | /api/funds/:code             | Full scheme + history         |
| GET    | /api/funds/:code/nav         | Live NAV only                 |
| GET    | /api/funds/:code/history     | Historical NAV                |
| POST   | /api/funds/bulk-nav          | Multiple NAVs at once         |

### Analysis (Gemini AI)
| Method | URL                              | Description                     |
|--------|----------------------------------|---------------------------------|
| GET    | /api/analysis/full               | Full portfolio analysis         |
| GET    | /api/analysis/insights           | 4 quick insight cards           |
| POST   | /api/analysis/chat               | Conversational AI chat          |
| POST   | /api/analysis/parse-statement    | Parse CAMS/KFintech PDF text    |
| POST   | /api/analysis/sip-recommendation | SIP advice for a specific goal  |

---

## Features

- **JWT Authentication** — Register, login, protected routes, password change
- **Live NAV** — Every fund fetches real-time NAV from mfapi.in
- **Real XIRR** — Newton-Raphson calculation from actual cashflow dates
- **Gemini AI Analysis** — Full portfolio X-Ray: health score, overlap, ER drag, rebalancing plan
- **Gemini Chat** — Conversational advisor with your real portfolio injected as context
- **PDF Upload** — PDF.js browser extraction + Gemini parsing + mfapi.in scheme matching
- **Goal Planner** — SIP calculator, reverse SIP, retirement corpus, emergency fund
- **Profile** — Risk profile, income/expenses, goals (all fed to Gemini for personalisation)

---

## Notes

- Gemini API has a free tier (60 req/min) — sufficient for personal use
- mfapi.in is rate-limited; backend caches responses for 10 minutes
- This is **not SEBI-registered investment advice**. For regulated advice, consult a SEBI-RIA.
