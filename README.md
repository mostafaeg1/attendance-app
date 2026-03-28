# 📋 Attendance App

> QR-based attendance tracking for teachers, lecturers, and instructors — for any course, class, or workshop.

Teachers generate a QR code per session. Attendees scan it with their phone to mark themselves present. Simple, fast, tamper-resistant.

---

## Apps

| App       | Tech               | Description                                           |
| --------- | ------------------ | ----------------------------------------------------- |
| `web`     | Next.js + Tailwind | Teacher dashboard — manage courses, sessions, reports |
| `backend` | NestJS             | REST API — shared by web and mobile                   |
| `mobile`  | Flutter            | Student app — QR scanner, attendance history          |

---

## Docs

| Document                                 | Description                                              |
| ---------------------------------------- | -------------------------------------------------------- |
| [PRD](./docs/PRD.md)                     | What we're building and why                              |
| [Architecture](./docs/ARCHITECTURE.md)   | Stack overview, system diagram, project structure        |
| [System Design](./docs/SYSTEM_DESIGN.md) | API endpoints, database schema, auth flow, Redis, Stripe |
| [Deployment](./docs/DEPLOYMENT.md)       | How to deploy every service, environments, CI/CD         |

---

## Tech Stack

- **Web** — Next.js (App Router), Tailwind CSS, Vercel
- **Backend** — NestJS, Railway
- **Mobile** — Flutter, App Store + Google Play
- **Database** — Supabase (PostgreSQL + Auth + PgBouncer)
- **Cache** — Upstash Redis
- **Payments** — Stripe

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Flutter SDK
- Supabase account
- Upstash account
- Stripe account

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/attendance-app.git
cd attendance-app
```

### 2. Install dependencies

```bash
# Install root + web + backend dependencies
npm install
```

### 3. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env

# Web
cp web/.env.example web/.env.local
```

Fill in the values — see [Deployment docs](./docs/DEPLOYMENT.md#4-environment-variables) for what each variable is.

### 4. Run Supabase migrations

Go to your Supabase project → SQL Editor → paste the schema from [System Design](./docs/SYSTEM_DESIGN.md#2-database-schema-detailed) and run it.

### 5. Start development servers

```bash
# Run web + backend simultaneously
npm run dev
```

### 6. Flutter (mobile)

```bash
cd mobile
flutter pub get
flutter run
```

---

## Branch Strategy

| Branch      | Purpose                         | Auto-deploys to               |
| ----------- | ------------------------------- | ----------------------------- |
| `main`      | Production — stable, live users | Vercel + Railway (production) |
| `staging`   | Pre-release testing             | Vercel + Railway (staging)    |
| `dev`       | Active development              | —                             |
| `feature/*` | Individual features             | —                             |

**Never push directly to `main`.** All work goes through `feature/* → dev → staging → main`.

---

## Project Structure

```
/
├── web/              ← Next.js teacher dashboard
├── backend/          ← NestJS REST API
├── mobile/           ← Flutter student app
├── packages/
│   └── types/        ← Shared TypeScript types
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SYSTEM_DESIGN.md
│   └── DEPLOYMENT.md
├── README.md
├── turbo.json
├── tsconfig.base.json
└── package.json
```

---

## License

Private — All rights reserved.
