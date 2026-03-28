# Architecture — QR Attendance App

> 📄 See also: [PRD.md](./PRD.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [System Diagram](#2-system-diagram)
3. [Scale Considerations](#3-scale-considerations)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Redis Key Patterns](#6-redis-key-patterns)
7. [Key Technical Decisions](#7-key-technical-decisions)

---

## 1. Stack Overview

| Layer | Technology | Rationale |
|---|---|---|
| Web Frontend | Next.js (App Router) + Tailwind CSS | Fast, SEO-ready, teacher-facing dashboard |
| Mobile App | Flutter (Dart) | Superior performance, consistent UI, excellent QR scanning |
| Backend API | NestJS (Node.js) | Scalable, structured, built-in WebSockets & background jobs |
| Database | Supabase (PostgreSQL) | Auth, real-time, connection pooling via PgBouncer |
| QR Generation | `qrcode` (npm) | Server-side QR image generation |
| QR Scanning | `mobile_scanner` (Flutter) / `html5-qrcode` (web) | Mobile and web scanning respectively |
| Auth | Supabase Auth + JWT | Works across web and mobile |
| Cache / Queue | Redis (Upstash) | QR token storage, duplicate scan prevention, rate limiting |
| Payments | Stripe (Checkout + Webhooks + Customer Portal) | Industry standard, minimal custom UI needed |
| Report Export | `pdfkit` + `exceljs` | PDF and Excel generation server-side |

---

## 2. System Diagram

```
┌─────────────────────┐        ┌──────────────────────┐
│   Next.js (Web)     │        │   Flutter (Mobile)   │
│   Teacher Dashboard │        │   Student QR Scanner │
└────────┬────────────┘        └──────────┬───────────┘
         │                                │
         └──────────────┬─────────────────┘
                        │ HTTPS REST API
                        ▼
             ┌─────────────────────┐
             │   NestJS (Railway)  │
             │   REST API          │
             └──┬──────────┬───────┘
                │          │
       ┌────────▼──┐   ┌───▼────────────┐
       │ Supabase  │   │ Upstash Redis  │
       │ PostgreSQL│   │ QR tokens      │
       │ + Auth    │   │ Rate limiting  │
       └───────────┘   └────────────────┘
                │
       ┌────────▼──────┐
       │ Stripe        │
       │ Billing       │
       └───────────────┘
```

---

## 3. Scale Considerations

The primary load spike occurs when multiple classes end simultaneously and hundreds of students scan within a 2-minute window:

- **Supabase PgBouncer** enabled for connection pooling — prevents DB connection exhaustion during scan spikes
- **Rotating QR tokens** stored in Redis with a 2s TTL — auto-expire without any DB writes
- **Duplicate scan prevention** via Redis key per `studentId:sessionId` — rejected instantly in-memory before hitting the DB
- **Rate limiting** enforced at the API level using Redis counters per IP
- **NestJS on Railway** runs as a persistent server — no cold starts, always warm
- Attendance writes are simple `INSERT` operations — optimized for high throughput

---

## 4. Project Structure

### Monorepo Layout

```
/
├── web/                  ← Next.js frontend
├── backend/              ← NestJS API
├── mobile/               ← Flutter app
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── DEPLOYMENT.md
```

### Web Frontend (Next.js)

```
web/
├── app/
│   ├── dashboard/        ← Teacher web dashboard
│   ├── session/[id]/     ← QR code display page
│   ├── scan/[token]/     ← Student landing page after scan
│   └── billing/          ← Upgrade page, plan comparison
└── lib/
    └── api.ts            ← HTTP client pointing to NestJS API
```

### Backend (NestJS)

```
backend/src/
├── courses/              ← Course module (controller, service, dto)
├── sessions/             ← Session module + QR generation
├── attendance/           ← Attendance module + constraint validation
├── reports/              ← PDF / Excel export module
├── billing/              ← Stripe webhooks + subscription management
├── auth/                 ← JWT guard, Supabase auth integration
└── common/
    ├── supabase.ts       ← DB client
    ├── qr.ts             ← QR token generation logic
    ├── geo.ts            ← Location constraint validation
    ├── stripe.ts         ← Stripe client + plan helpers
    ├── plans.ts          ← Plan limit enforcement logic
    └── redis.ts          ← Upstash Redis client
```

### Mobile App (Flutter)

```
mobile/lib/
├── screens/
│   ├── login/            ← Auth screen
│   ├── scanner/          ← QR scanner screen
│   └── history/          ← Attendance history
├── services/
│   ├── api.dart          ← HTTP client
│   └── auth.dart         ← Auth state
└── models/               ← Shared data models
```

---

## 5. Database Schema

| Table | Key Fields | Purpose |
|---|---|---|
| `students` | id, legal_student_id , name ,phone_number, created_at | All app users |
| `teachers`| id , name , email 
| `courses` | id, teacher_id, name, subject_code, created_at | Courses created by teachers |
| `course_enrollments` | id, course_id, student_id | Links students to courses |
| `sessions` | id, course_id, teacher_id, date, start_time, end_time, qr_mode, location_lat, location_lng, location_radius_m, token, expires_at | Individual class sessions |
| `qr_tokens` | id, session_id, token, created_at, expires_at | Rotating QR token history |
| `attendance` | id, session_id, student_id, status, scanned_at, scan_method, location_valid, time_valid | Attendance records |
| `plans` | id, name (free/pro), price_monthly, price_annual, features (JSON) | Available subscription plans |
| `subscriptions` | id, teacher_id, plan_id, stripe_customer_id, stripe_subscription_id, status, current_period_end | Teacher billing state |

### Attendance Status Values
- `present` — valid scan within all constraints
- `absent` — did not scan or scan was rejected
- `excused` — manually set by teacher

### Scan Method Values
- `app` — scanned via Flutter mobile app
- `web` — scanned via camera link (no app)
- `manual` — marked manually by teacher

### Subscription Status Values
- `active` — paid and current
- `trialing` — in free trial period
- `past_due` — payment failed, grace period
- `canceled` — subscription ended, downgraded to Free

---

## 6. Redis Key Patterns

| Key | Value | TTL | Purpose |
|---|---|---|---|
| `qr:token:{token}` | sessionId | 2 seconds | Rotating QR token validation |
| `scan:{studentId}:{sessionId}` | timestamp | session duration | Duplicate scan prevention |
| `ratelimit:scan:{ip}` | request count | 60 seconds | Scan rate limiting per IP |

---

## 7. Key Technical Decisions

**Why NestJS over Next.js API Routes?**
NestJS runs as a persistent server (no cold starts), has native WebSocket support for live attendance dashboards, and built-in support for background jobs via Bull/BullMQ — needed for auto-closing sessions and marking absences. The structured module system also enforces clean separation of concerns as the codebase grows.

**Why Flutter over React Native?**
Flutter renders its own UI (no native bridge) giving better performance and consistency across iOS and Android. The `mobile_scanner` package is one of the most performant QR scanning implementations available. Since the mobile app is student-facing and QR scanning is the core interaction, performance matters here.

**Why Supabase over raw PostgreSQL?**
Supabase gives us auth, real-time subscriptions, PgBouncer connection pooling, and a managed PostgreSQL instance in one service. This eliminates the need to manage auth infrastructure separately and PgBouncer solves the concurrent scan spike problem out of the box.

**Why Redis for QR tokens?**
Rotating QR tokens change every 2 seconds. Writing every token to PostgreSQL would generate unnecessary DB writes and table bloat. Redis TTL handles expiry natively — tokens simply vanish after 2 seconds with zero cleanup needed.

**Why Stripe for billing?**
Stripe Checkout and the Customer Portal mean we build zero custom billing UI. Card data never touches our servers, making PCI compliance trivial. Stripe's webhook system is reliable and well-documented for subscription lifecycle management.
