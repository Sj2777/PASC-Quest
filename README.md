# QuizPop — Daily Aptitude Poll Platform

A two-sided web app: students answer one live MCQ per day, admins manage and launch questions.

## Structure

```
pasc-w/
├── backend/    # Node.js + Express + TypeScript + Prisma + PostgreSQL
└── frontend/   # React + Vite + TypeScript + Tailwind + Framer Motion
```

## Quick Start

### 1. Set up the database

1. **Create a PostgreSQL database** named `quizpop` (or any name).
2. Copy `backend/.env.example` → `backend/.env` and fill in your `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/quizpop?schema=public"
   JWT_SECRET="any-long-random-string"
   ADMIN_JWT_SECRET="another-long-random-string"
   PORT=3001
   FRONTEND_URL="http://localhost:5173"
   ```

### 2. Run the backend

```bash
cd backend
npm install
npx prisma migrate dev --name init   # Creates tables
npm run seed                          # Creates default admin: admin@quizpop.dev / admin123
npm run dev                           # Starts on http://localhost:3001
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev    # Starts on http://localhost:5173
```

## Default Admin Credentials

- **Email:** `admin@quizpop.dev`
- **Password:** `admin123`

Go to `http://localhost:5173/admin` to log in.

## Features

### Student side (`/`)
- No login required — enter any nickname, start the poll
- Circular countdown timer (the visual centrepiece)
- Server-authoritative timing (no client-side cheating)
- One attempt per browser per question (24hr anon cookie)
- Result screen: confetti (correct), shake (wrong), emoji burst (timeout)

### Admin side (`/admin`)
- Login with email + password
- Create questions as drafts (safe, won't affect students)
- Launch a question live with one click (replaces the current live question)
- View stats per poll: total, correct, wrong, timeout, avg time

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poll/current` | Get live question (no correctIndex) |
| POST | `/api/poll/:id/start` | Start attempt, get JWT token |
| POST | `/api/poll/attempts` | Submit answer, get result |
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/questions` | List questions |
| POST | `/api/admin/questions` | Create draft |
| PUT | `/api/admin/questions/:id` | Edit draft |
| POST | `/api/admin/questions/:id/launch` | Launch question |
| GET | `/api/admin/stats` | Poll stats by date |

## Tech Stack

- **Backend:** Express · TypeScript · Prisma · PostgreSQL · bcrypt · jsonwebtoken · zod
- **Frontend:** React · Vite · TypeScript · Tailwind CSS · Framer Motion · canvas-confetti · React Router
