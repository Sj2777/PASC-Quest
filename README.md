# QuizPop — Daily Aptitude Poll Platform

A two-sided web app: students answer live MCQs each day, admins manage and launch questions.

## Structure

```
AptitudeQuizPlatformPASC/
├── backend/    # Node.js · Express · TypeScript · Prisma · PostgreSQL · WebSocket
└── frontend/   # React · Vite · TypeScript
```

---

## Local Development Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # Fill in DATABASE_URL and secrets
npx prisma migrate dev        # Apply migrations (creates tables)
npm run seed                  # Seed the database (see Seed section below)
npm run dev                   # Start dev server on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
# Optional: cp .env.example .env.local and set VITE_API_BASE if backend is not on port 3001
npm run dev                   # Start on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

See `backend/.env.example` for a fully annotated reference. Key variables:

| Variable | Required in production | Secret | Description |
|---|---|---|---|
| `DATABASE_URL` | YES | YES | PostgreSQL connection string |
| `JWT_SECRET` | YES | YES | Signs poll attempt tokens |
| `ADMIN_JWT_SECRET` | YES | YES | Signs admin session cookies |
| `STUDENT_JWT_SECRET` | YES | YES | Signs 30-day student session cookies |
| `FRONTEND_URL` | YES | NO | Allowed CORS origin for the frontend |
| `NODE_ENV` | YES | NO | Set to `production` to enable secure cookies |
| `PORT` | NO | NO | HTTP/WS port (fallback: 3001) |
| `ADMIN_EMAIL` | NO | NO | Super-admin email for seed (fallback: admin@quizpop.dev) |
| `ADMIN_PASSWORD` | YES (if seeding) | YES | Super-admin password for seed — required in production |

### Frontend (`frontend/.env.local`)

See `frontend/.env.example` for reference.

| Variable | Required in production | Secret | Description |
|---|---|---|---|
| `VITE_API_BASE` | YES | NO | Full backend URL, e.g. `https://api.example.com`. Falls back to `http://localhost:3001` in development. WebSocket URL is derived automatically (`http→ws`, `https→wss`). |

---

## Seed Script

```bash
cd backend
npm run seed
```

- **Development** (no `NODE_ENV=production`): Creates super admin, staff admin, sample students, and draft questions. Falls back to `admin123` if `ADMIN_PASSWORD` is unset.
- **Production** (`NODE_ENV=production`): Creates only the super admin. `ADMIN_PASSWORD` is **required** — the script will throw immediately if it is missing. No sample data is inserted.

> **Security note:** After the first production seed, it is recommended to delete or rotate the `ADMIN_PASSWORD` environment variable on your hosting platform.

---

## Production Deployment

### Backend requirements

- **Runtime:** Persistent Node.js process (e.g. Render Web Service, Railway, Fly.io)
- **Not suitable for:** Purely serverless/function runtimes (Lambda, Vercel Functions) because:
  - `node-cron` requires a continuously running process to auto-launch and expire questions.
  - The WebSocket server (`ws`) shares the same persistent HTTP server.
- **Start command:** `npm run build && node dist/index.js` (or `npm start` after build)
- **Migration command:** `npm run prisma:deploy` (`prisma migrate deploy` — safe for production)

### Frontend requirements

- **Hosting:** Any static/SPA hosting (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.)
- **Build command:** `npm run build`
- **Output directory:** `frontend/dist`
- **SPA rewrite required:** All routes must fall back to `index.html`.

#### Routes requiring SPA fallback

| Route | Page |
|---|---|
| `/` | Student login/register |
| `/student` | Student home |
| `/play` | Question page |
| `/result` | Result page |
| `/stats` | Personal stats |
| `/social` | Social hub |
| `/student/leaderboard` | Overall leaderboard |
| `/leaderboard/:pollLaunchId` | Per-question leaderboard |
| `/leaderboard/q/:questionId` | Leaderboard by question |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/questions/new` | Create question |
| `/admin/questions/:id/edit` | Edit question |
| `/admin/admins` | Admin management |

Configure your hosting provider to serve `index.html` for all unmatched paths. Examples:

- **Vercel:** `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Netlify:** `_redirects` file: `/* /index.html 200`
- **Nginx:** `try_files $uri $uri/ /index.html;`

### Prisma migration (production)

```bash
# Run AFTER setting DATABASE_URL in production environment
npm run prisma:deploy   # = prisma migrate deploy (applies committed migrations only, never resets)
```

Do NOT run `npm run prisma:migrate` (= `prisma migrate dev`) in production.

---

## Tech Stack

- **Backend:** Express · TypeScript · Prisma · PostgreSQL · bcrypt · jsonwebtoken · zod · ws · node-cron
- **Frontend:** React · Vite · TypeScript · React Router

## API Overview

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/poll/current` | Get all available live launches |
| POST | `/api/poll/:id/start` | Start attempt, get JWT token |
| POST | `/api/poll/attempts` | Submit answer, get result |
| GET | `/api/leaderboards/overall` | Overall leaderboard (daily/weekly/all-time) |
| GET | `/api/poll/:id/leaderboard` | Per-question leaderboard |
| GET | `/api/leaderboards/branch-battle` | Branch standings |
| GET | `/api/leaderboards/hall-of-fame` | Hall of fame |
| POST | `/api/student/register` | Student registration |
| POST | `/api/student/login` | Student login |
| POST | `/api/student/logout` | Student logout |
| GET | `/api/student/me` | Current student session |
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/questions` | List questions |
| POST | `/api/admin/questions` | Create draft |
| PUT | `/api/admin/questions/:id` | Edit draft |
| POST | `/api/admin/questions/:id/launch` | Launch question |
| GET | `/api/admin/stats` | Poll stats |
