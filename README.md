# Portfolio-X-Ray

Portfolio-X-Ray is a full-stack mutual fund portfolio analyzer for Indian investors.
It combines live NAV data (`mfapi.in`), deterministic portfolio math (invested value, returns, XIRR), and Gemini-powered insights/chat over your actual holdings.

## Current Status

- Landing page at `/` and authenticated app at `/app/*`
- Portfolio ingestion from manual entry and statement parsing (CAMS/KFintech text extraction flow)
- Live NAV refresh and portfolio metrics
- AI analysis modules (full analysis, quick insights, chat, XIRR deep analysis, overlap, expense drain, tax harvesting)
- Deployed architecture supported on Vercel (frontend + backend)

## Tech Stack

- Frontend: React 18, Vite, React Router v6, Recharts
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- AI: Google Gemini via `@google/genai`
- Market Data: `mfapi.in` (free, no API key)
- Auth: JWT + bcryptjs

## Gemini Model Allocation (Hardcoded)

The backend uses multiple Gemini models by responsibility in `backend/services/geminiService.js`:

- `gemini-2.5-flash-lite`: quick insights, SIP recommendation
- `gemini-2.5-flash`: full portfolio analysis (reasoning-heavy)
- `gemini-3.1-flash-lite`: chat, statement parsing, XIRR/overlap/expense/tax JSON analyses

## Project Structure

```text
Portfolio-X-Ray/
|- api/
|  |- index.js                  # Vercel serverless entry (exports backend app)
|- backend/
|  |- server.js                 # Express app setup
|  |- config/db.js              # MongoDB connection
|  |- middleware/auth.js        # JWT auth middleware
|  |- models/                   # User, Portfolio schemas
|  |- routes/                   # auth, portfolio, funds, analysis
|  |- services/                 # geminiService, mfapiService
|- docs/
|  |- IMPLEMENTATION_AUDIT.md
|- frontend/
|  |- public/                   # favicon and static assets
|  |- src/
|     |- components/
|     |  |- landing/            # public landing page
|     |  |- auth/
|     |  |- layout/
|     |  |- portfolio/
|     |  |- analysis/
|     |  |- chat/
|     |  |- planner/
|     |  |- upload/
|     |- context/
|     |- services/api.js
|     |- App.jsx                # routes (`/`, `/login`, `/register`, `/app/*`)
|- vercel.json
```

## Key Routes

Frontend:

- `/` -> Landing page
- `/login`, `/register`
- `/app` -> Dashboard
- `/app/upload`, `/app/portfolio`, `/app/analysis`, `/app/chat`, `/app/planner`, `/app/profile`

Backend:

- `GET /api/health`
- Auth: `/api/auth/*`
- Portfolio: `/api/portfolio/*`
- Funds: `/api/funds/*`
- Analysis: `/api/analysis/*`

## Main API Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

Portfolio:

- `GET /api/portfolio`
- `GET /api/portfolio/refresh`
- `POST /api/portfolio/fund`
- `PUT /api/portfolio/fund/:fundId`
- `DELETE /api/portfolio/fund/:fundId`

Funds (mfapi proxy):

- `GET /api/funds/search?q=`
- `GET /api/funds/all`
- `GET /api/funds/:code`
- `GET /api/funds/:code/nav`
- `GET /api/funds/:code/history?days=365`
- `POST /api/funds/bulk-nav`

Analysis:

- `GET /api/analysis/full`
- `GET /api/analysis/insights`
- `POST /api/analysis/chat`
- `POST /api/analysis/parse-statement`
- `POST /api/analysis/sip-recommendation`
- `GET /api/analysis/xirr`
- `GET /api/analysis/overlap`
- `GET /api/analysis/expense-drain`
- `GET /api/analysis/tax-harvest`

## Local Development

### 1. Prerequisites

- Node.js 18+
- MongoDB connection string (local or Atlas)
- Gemini API key

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Set values in `backend/.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CLIENT_URL` (for CORS, local frontend URL)

Run backend:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Deployment Notes (Vercel)

This repo includes:

- `vercel.json` for SPA rewrite + API routing
- `api/index.js` to expose Express app as serverless function

Set backend environment variables in Vercel project settings:

- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CLIENT_URL` (your frontend domain)

Set frontend environment variable:

- `VITE_API_URL` (your deployed backend URL, if not using same-domain API route)

## Data and Parsing Notes

- Statement parsing (`/api/analysis/parse-statement`) is designed for CAMS/KFintech statement text extracted by the upload flow.
- Parsed funds are normalized and de-duplicated before insertion.
- Uploading/parsing does not silently replace all data; portfolio updates happen through explicit API operations.

## Disclaimer

Portfolio-X-Ray provides AI-generated insights for education and decision support.
It is not SEBI-registered investment advice. Consult a SEBI-registered advisor/CA for regulated advice.
