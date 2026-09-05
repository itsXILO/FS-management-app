# Classroom Management System

A full-stack classroom management platform where teachers create classes, subjects, and quizzes, take attendance, and manage enrollments. Students enroll via invite codes, take timed quizzes, and view their results.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Authentication & Authorization** — Email/password auth via Better Auth with role-based access (Admin, Teacher, Student)
- **Subjects & Classes** — Create, list, filter, and paginate subjects and classes with department grouping
- **Class Banners** — Upload class banner images via Cloudinary unsigned upload widget
- **Invite Code Enrollment** — Auto-generated 12-character hex invite codes for student enrollment
- **Class Schedules** — JSON-based scheduling with day, start time, and end time per class
- **Quizzes** — Create quizzes with dynamic questions and options (2–4 options each), deadlines, and configurable durations
- **Timed Quiz Attempts** — Students get one attempt per quiz, auto-scored with per-question review
- **Attendance** — Create attendance sessions, mark students present/absent/late, and view summaries
- **Dashboard** — Refine-powered dashboard with Kbar command palette (⌘K), dark/light/system theme toggle
- **Responsive UI** — shadcn/ui components, TanStack Table with pagination, skeleton loaders, and toast notifications

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Refine 5, Vite 6, TypeScript, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, TanStack Table 8, Recharts |
| **Forms** | react-hook-form + Zod validation |
| **Backend** | Node.js 22, Express 5, TypeScript (ESM) |
| **ORM** | Drizzle ORM 0.45 |
| **Database** | PostgreSQL (Neon Serverless) |
| **Auth** | Better Auth 1.5 (email/password, session cookies) |
| **Security** | Arcjet (Shield, bot detection, rate limiting) |
| **File Uploads** | Cloudinary (unsigned presets) |
| **Containerization** | Docker, Docker Compose, nginx |
| **CI/CD** | GitHub Actions, Vercel, EC2 deployment |

---

## Architecture

```
                    ┌──────────────┐
                    │    nginx     │
                    │   (port 80)  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
   ┌──────────────────┐     ┌──────────────────────┐
   │     Backend      │     │      Frontend        │
   │  Express :4000   │     │  React/Vite :3000    │
   └────────┬─────────┘     └──────────────────────┘
            │
            ▼
   ┌──────────────────┐
   │  Neon Postgres   │
   │  (Serverless)    │
   └──────────────────┘
```

- **Local Development**: Backend runs on port 4000, frontend on port 5173
- **Docker**: nginx proxies `/api/` to backend:4000, everything else to frontend:3000
- **Vercel**: Both apps deployed independently with their own `vercel.json` configs

---

## Project Structure

```
classroom-fullstack/
├── docker-compose.yml              # Multi-container orchestration
├── nginx/
│   └── default.conf                # Reverse proxy config
├── .github/workflows/
│   ├── ci.yml                      # CI: typecheck, lint, build, docker build
│   └── deploy.yml                  # CD: rsync to EC2 + docker compose up
│
├── management-backend/             # Express API server
│   ├── Dockerfile                  # Multi-stage build (node:20-alpine)
│   ├── vercel.json                 # Vercel routing → api/index.ts
│   ├── drizzle.config.ts           # Drizzle Kit config
│   ├── package.json
│   ├── .env.example
│   ├── api/
│   │   └── index.ts                # Vercel serverless entry
│   ├── drizzle/                    # 7 migration files (0000–0006)
│   ├── scripts/
│   │   ├── seed.sh                 # Seed via curl/jq
│   │   ├── seed.mjs                # Seed via fetch
│   │   └── verify-arcjet.sh        # Arcjet smoke test
│   └── src/
│       ├── index.ts                # Express app, middleware, routing
│       ├── express.d.ts            # Express type augmentation
│       ├── config/
│       │   └── arcjet.ts           # Arcjet clients (shield, bot, rate limiters)
│       ├── lib/
│       │   └── auth.ts             # Better Auth server config
│       ├── middleware/
│       │   ├── security.ts         # Arcjet middleware
│       │   ├── session.ts          # Session hydration
│       │   └── require-role.ts     # Role guard
│       ├── routes/
│       │   ├── subject.ts
│       │   ├── classes.ts
│       │   ├── users.ts
│       │   ├── quizzes.ts
│       │   ├── quizAttempts.ts
│       │   └── attendance.ts
│       └── db/
│           ├── index.ts            # DB connection
│           └── schema/
│               ├── index.ts
│               ├── auth.ts         # User, Session, Account, Verification
│               └── app.ts          # All application tables
│
└── management-refine-based-frontend/  # React SPA
    ├── Dockerfile                  # Multi-stage (node:20 build → serve:alpine)
    ├── vercel.json                 # Vercel SPA rewrite
    ├── vite.config.ts
    ├── package.json
    ├── .env.example
    └── src/
        ├── App.tsx                 # Refine app with providers
        ├── main.tsx                # Entry point
        ├── index.ts
        ├── providers/
        │   ├── auth.ts             # Refine authProvider
        │   └── data.ts             # Refine dataProvider
        ├── constants/
        │   └── index.ts            # Roles, departments, Cloudinary config
        ├── types/
        │   └── index.ts            # TypeScript interfaces
        ├── lib/
        │   ├── auth-client.ts      # Better Auth client
        │   ├── schema.ts           # Zod schemas
        │   └── utils.ts            # cn() utility
        ├── components/
        │   ├── refine-ui/          # Refine-specific UI wrappers
        │   ├── ui/                 # shadcn/ui components
        │   └── upload-widget.tsx   # Cloudinary upload
        └── pages/
            ├── dashboard/          # Dashboard page
            ├── login/              # Login page
            ├── register/           # Register page
            ├── subjects/           # Subject CRUD pages
            ├── classes/            # Class CRUD + enrollment pages
            ├── quizzes/            # Quiz create/take/results pages
            └── attendance/         # Attendance session + marking pages
```

---

## Prerequisites

- **Node.js** 22.x (backend) / 20.x (Docker/CI)
- **npm** (or your preferred package manager)
- **Docker & Docker Compose** (for containerized deployment)
- A **Neon** PostgreSQL database (or any PostgreSQL instance)
- A **Cloudinary** account (for class banner uploads)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/classroom-fullstack.git
cd classroom-fullstack
```

### 2. Backend Setup

```bash
cd management-backend
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
npm install
npm run dev
```

Backend runs at `http://localhost:4000`. Health check: `GET /` returns `{ "message": "Server is running" }`.

### 3. Frontend Setup

```bash
cd management-refine-based-frontend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (or 5174 if the port is taken).

---

## Environment Variables

### Backend (`management-backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `BETTER_AUTH_SECRET` | Auth secret key (min 32 chars) | `your-super-secret-key-min-32-chars` |
| `BETTER_AUTH_URL` | Backend public URL (required on Vercel) | `https://your-app.vercel.app` |
| `FRONTEND_URL` | Allowed CORS origin (comma-separated) | `http://localhost:5173` |
| `ARCJET_KEY` | Arcjet API key | `ajkey_...` |
| `ARCJET_ENV` | Set to `development` for DRY_RUN mode | `development` |
| `PORT` | Server port (default: 4000) | `4000` |
| `ARCJET_DEBUG` | Enable Arcjet debug logging | `true` |

### Frontend (`management-refine-based-frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_BASE_URL` | Backend URL | `http://localhost:5173` (local) / `same-origin` (Docker) / full URL (Vercel) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `dmnu03v9k` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset | `classroom_app` |

---

## Database Setup

### Run Migrations

```bash
cd management-backend
npm run db:generate   # Generate migration files from schema
npm run db:migrate    # Apply migrations to database
```

### Seed Demo Data

```bash
# Option 1: Using curl/jq
bash scripts/seed.sh

# Option 2: Using Node.js fetch
node scripts/seed.mjs
```

Both scripts create: 2 teachers, 4 students, 3 subjects, 3 classes, enrollments, quizzes with attempts, and attendance records. The backend must be running on `localhost:4000`.

---

## Docker Deployment

### Start All Services

```bash
docker compose up -d --build
```

This starts:
- **backend** — Express API (internal port 4000)
- **frontend** — React SPA served via `serve` (internal port 3000)
- **proxy** — nginx reverse proxy (host port 80)

### Access

- Application: `http://localhost`
- API: `http://localhost/api/`

### Production Notes

- The `.env` file for the backend must exist on the host machine
- Uses `COMPOSE_PARALLEL_LIMIT=1` in CI to avoid OOM on small instances
- Creates a 1GB swapfile on first deploy for memory-constrained servers

---

## CI/CD Pipeline

### CI (`.github/workflows/ci.yml`)

Runs on every push/PR:
1. **Backend**: `tsc --noEmit` (typecheck) + `npm run build`
2. **Frontend**: `npm ci` → `tsc -b` (typecheck) → `eslint src` (lint) → `npm run build`
3. **Docker**: Builds both images with GitHub Actions cache

### Deploy (`.github/workflows/deploy.yml`)

Triggers on push to `main`:
1. Rsyncs code to EC2 at `/opt/classroom` (excludes `.git`, `node_modules`, `dist`, `.env`)
2. Installs Docker + creates 1GB swapfile (first-time only)
3. Runs `docker compose up -d --build`
4. Normalizes `.env` quoted values
5. Runs smoke tests against `/api/users` and `/`

**Required Secrets**: `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER`

### Vercel

Both apps have independent `vercel.json` configs:
- **Backend**: Routes all traffic to `api/index.ts` (Express on serverless)
- **Frontend**: Vite SPA with rewrite to `/index.html`

---

## API Reference

All routes are under `/api` prefix. Authentication uses session cookies via Better Auth.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-up/email` | Register a new user |
| POST | `/api/auth/sign-in/email` | Sign in with email/password |
| POST | `/api/auth/sign-out` | Sign out (destroy session) |
| GET | `/api/auth/session` | Get current session |

### Users

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List users (paginated, filterable by role) |

### Subjects

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/subjects` | Any | List subjects (paginated, search by name/code, filter by department) |
| POST | `/api/subjects` | Teacher/Admin | Create subject (auto-creates department if needed) |

### Classes

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/classes` | Any | List classes (paginated, search, filter by subject/teacher) |
| POST | `/api/classes` | Teacher | Create class (auto-generates invite code) |
| POST | `/api/classes/:classId/enroll` | Student | Join class via invite code |
| POST | `/api/classes/:classId/students` | Teacher/Admin | Add student directly |

### Quizzes

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/quizzes` | Any | List quizzes (role-scoped) |
| GET | `/api/quizzes/:quizId` | Teacher (owner) | Get quiz with answer key |
| DELETE | `/api/quizzes/:quizId` | Teacher (owner) | Delete quiz |
| POST | `/api/classes/:classId/quizzes` | Teacher | Create quiz with questions |
| GET | `/api/classes/:classId/quizzes` | Any | List quizzes for a class |

### Quiz Attempts

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/quizzes/:quizId/attempt/start` | Student | Start quiz attempt (returns questions without answers) |
| POST | `/api/quizzes/:quizId/attempt/submit` | Student | Submit answers and get score |
| GET | `/api/quizzes/:quizId/attempt/result` | Student | Get own attempt result with per-question review |
| GET | `/api/quizzes/:quizId/attempts` | Teacher/Admin | Get all student attempts for a quiz |

### Attendance

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/classes/:classId/attendance` | Any | List attendance sessions |
| POST | `/api/classes/:classId/attendance` | Teacher/Admin | Create attendance session |
| GET | `/api/classes/:classId/attendance/:sessionId` | Any | Get session detail with student statuses |
| POST | `/api/classes/:classId/attendance/:sessionId/mark` | Teacher/Admin | Mark attendance (present/absent/late) |
| GET | `/api/my-attendance` | Student | Get attendance summary across all enrolled classes |

---

## Database Schema

### Auth Tables

- **user** — `id`, `name`, `email` (unique), `role` (student/teacher/admin), `image`, `imageCldPubId`, timestamps
- **session** — `token` (unique), `ip`, `userAgent`, `userId` FK
- **account** — Provider auth data, password hash
- **verification** — Email verification tokens

### Application Tables

- **departments** — `code` (unique, varchar 10), `name`, `description`
- **subjects** — `code` (unique), `name`, `description`, `departmentId` FK
- **classes** — `name`, `inviteCode` (unique), `description`, `capacity` (default 50), `status` (active/inactive/archived), `schedules` (JSONB), `bannerUrl`, `bannerCldPubId`, `subjectId` FK, `teacherId` FK
- **enrollments** — `studentId` + `classId` (composite unique)
- **quizzes** — `title`, `description`, `durationMinutes`, `deadline`, `classId` FK
- **questions** — `questionText`, `position`, `quizId` FK
- **question_options** — `optionText`, `isCorrect`, `position`, `questionId` FK
- **quiz_attempts** — `quizId` + `studentId` (one attempt per student), `startedAt`, `submittedAt`, `score`, `totalQuestions`
- **quiz_answers** — `selectedOptionId`, `isCorrect`, `attemptId` FK, `questionId` FK
- **attendance_sessions** — `title`, `date`, `classId` FK
- **attendance_records** — `status` (present/absent/late), `markedAt`, `sessionId` FK, `studentId` FK

---

## Security

- **Arcjet Shield** — Protects against SQL injection, XSS, and other attacks
- **Bot Detection** — Allows search engines, uptime monitors, and preview tools; blocks others
- **Rate Limiting** — Per-role sliding window limits:
  - Admin: 20 requests/min
  - Teacher: 10 requests/min
  - Student: 10 requests/min
  - Guest: 5 requests/min
- **CORS** — Restricted to `FRONTEND_URL` + localhost development origins
- **Session Auth** — HTTP-only cookies with `credentials: "include"`
- **Role Guards** — `requireRole()` middleware on all protected routes
- **Trust Proxy** — Enabled behind nginx for correct IP resolution

---

## Available Scripts

### Backend (`management-backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with tsx watch |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations to database |
| `npm run verify:arcjet` | Test Arcjet integration |

### Frontend (`management-refine-based-frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Refine dev server |
| `npm run build` | Build for production |
| `npm start` | Serve production build |

---

## Troubleshooting

### Backend won't start
- Ensure `DATABASE_URL` is set and the database is reachable
- Check that `BETTER_AUTH_SECRET` is at least 32 characters
- Verify port 4000 is not already in use

### Frontend can't connect to backend
- Verify `VITE_BACKEND_BASE_URL` matches your backend URL
- For local development, ensure both servers are running
- For Docker, use `same-origin` (nginx proxies `/api/` to backend)

### Database migrations fail
- Ensure `DATABASE_URL` points to the correct database
- Run `npm run db:generate` before `npm run db:migrate`
- Check that the Neon database is active (serverless may pause on inactivity)

### Docker build fails
- Ensure `.env` file exists in `management-backend/`
- Check Docker has enough memory (swapfile helps on small instances)
- Run with `COMPOSE_PARALLEL_LIMIT=1` to avoid OOM

### Arcjet rate limiting in development
- Set `ARCJET_ENV=development` to enable DRY_RUN mode (no actual blocking)
- Set `ARCJET_DEBUG=true` to log Arcjet decisions

---

## License

MIT
