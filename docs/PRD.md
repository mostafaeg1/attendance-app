# QR Attendance App — Product Requirements Document

> **Version:** 1.6 — Generalized from university to any course/teacher
> **Date:** March 2026
> **Status:** Draft
> **Platform:** Web (Next.js) + Mobile (Flutter)
> **Backend:** NestJS + Supabase (PostgreSQL)
> **Business Model:** SaaS — per teacher subscription (Free + Pro tiers)

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Pricing & Plans](#3-pricing--plans)
4. [User Flows](#4-user-flows)
5. [Feature Requirements](#5-feature-requirements)
6. [Database Schema](#6-database-schema)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Suggested Milestones](#8-suggested-milestones)
9. [Open Questions](#9-open-questions)

> 📄 See also: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 1. Overview

### 1.1 Problem Statement

Tracking attendance in courses, classes, and workshops is largely manual — paper sign-in sheets, verbal roll calls, or ad-hoc spreadsheets. This is time-consuming for teachers and lecturers, easy to manipulate by attendees (proxy attendance), and produces no reliable data for reporting.

### 1.2 Solution

A QR-code-based attendance SaaS platform for teachers and  lecturers. Teachers subscribe and generate a unique QR code per session. Attendees scan the code with their phone (via the Flutter app or a camera link) to mark themselves present. Teachers can add time and location constraints to prevent abuse. All data is stored centrally and available as reports.

### 1.3 Goals

- Eliminate manual attendance tracking for any course, class, or workshop
- Prevent proxy attendance through QR rotation and location constraints
- Give teachers actionable data about student attendance per course
- Provide attendees a simple, frictionless check-in experience (free for attendees always)
- Export attendance data to PDF and Excel for official records
- Generate sustainable revenue through a per-teacher subscription model

### 1.4 Out of Scope (v1.0)

- Organization/institution-wide admin panel *(future version)*
- Team/organization billing (B2B contracts) *(future version)*

---

## 2. User Roles

| Role | Description | Primary Platform | Pays? |
|---|---|---|---|
| Teacher / Lecturer  | Creates courses, manages sessions, views reports | Web (Next.js) | ✅ Yes (Free or Pro) |
| Attendee / Student | Scans QR code to mark attendance | Flutter App or Camera Link | ❌ Always free |

---

## 3. Pricing & Plans

### 3.1 Plan Tiers

| Feature | Free | Pro |
|---|---|---|
| Courses | Up to 2 | Unlimited |
| Sessions per month | Up to 10 | Unlimited |
| Students per course | Up to 30 | Unlimited |
| Static QR | ✅ | ✅ |
| Rotating QR (every 2s) | ❌ | ✅ |
| Location constraint | ❌ | ✅ |
| Export PDF / Excel | ❌ | ✅ |
| Priority support | ❌ | ✅ |

### 3.2 Billing Model

- Teachers subscribe individually — students always use the app for free
- Pro plan billed monthly or annually (annual = discount)
- Payment processed via **Stripe**
- Teachers manage their own subscription via the **Stripe Customer Portal** (cancel, update card, download invoices — no custom UI needed)

### 3.3 Upgrade Flow

```
Teacher hits a plan limit (e.g. tries to create 3rd course)
        ↓
App shows upgrade prompt with plan comparison
        ↓
Teacher clicks "Upgrade to Pro"
        ↓
Redirected to Stripe Checkout (hosted by Stripe)
        ↓
Teacher enters card details (Stripe handles this, not us)
        ↓
Stripe webhook → our API → update teacher plan in DB
        ↓
Pro features unlocked instantly
```

### 3.4 Stripe Webhook Events to Handle

| Event | Action |
|---|---|
| `customer.subscription.created` | Activate Pro plan |
| `customer.subscription.updated` | Sync plan changes |
| `customer.subscription.deleted` | Downgrade to Free |
| `invoice.payment_failed` | Flag account, notify teacher |

---

## 4. User Flows

### 4.1 Teacher Flow

1. Teacher registers / logs in to the web dashboard
2. Creates a course (name, subject code, enrolled student list)
3. Starts a new session within a course
   - Sets session date and time window (e.g. 9:00–9:15 AM)
   - Optionally enables location constraint (GPS radius in meters) *(Pro only)*
   - Chooses QR mode: **Static** or **Rotating** (every 2 seconds) *(Rotating is Pro only)*
4. QR code is displayed on screen for students to scan
5. Teacher monitors live attendance as students check in
6. Teacher can manually mark a student as present or absent
7. Session closes manually or auto-expires after the time window
8. Teacher views per-course and per-student reports and exports them *(Export is Pro only)*

### 4.2 Student Flow — Flutter App

1. Attendee downloads the Flutter app and registers / logs in (free)
2. Opens the QR scanner within the app
3. Scans the QR code displayed by the teacher
4. If constraints are met (time + location), attendance is recorded
5. Attendee sees confirmation screen

### 4.3 Student Flow — No App (Camera Link)

1. Attendee scans QR code with phone camera (no app needed)
2. Camera redirects to a web form (Next.js page)
3. Attendee enters their ID or logs in via a quick link
4. Attendance is recorded if constraints are met
5. Attendee sees a confirmation page

### 4.4 Billing Flow — New Subscription

1. Teacher signs up (Free plan by default)
2. Teacher hits a feature limit
3. Upgrade modal shown with plan comparison table
4. Teacher clicks upgrade → redirected to Stripe Checkout
5. Stripe processes payment and fires webhook
6. API receives webhook → updates `subscriptions` table
7. Teacher redirected back to dashboard with Pro features active

---

## 5. Feature Requirements

### 5.1 Course Management

- Teacher can create, edit, and archive courses
- Each course has: name, subject code, description, and student roster
- Free plan limited to 2 active courses; Pro is unlimited
- Works for any context: university, bootcamp, corporate training, tutoring, workshops
- Attendees are associated to courses via their registered account

### 5.2 Session Management

- Teacher creates a session within a course
- Each session has: date, start time, optional end time (attendance window)
- Session generates a unique token used in the QR code
- Free plan limited to 10 sessions/month; Pro is unlimited

### 5.3 QR Code Modes

| Mode | How It Works | Plan |
|---|---|---|
| Static QR | One fixed QR code for the entire session | Free + Pro |
| Rotating QR | QR token regenerates every 2 seconds | Pro only |

### 5.4 Attendance Constraints

- **Time window:** attendance only accepted within a set time range *(Free + Pro)*
- **Location:** student's GPS must be within X meters of teacher's coordinates *(Pro only)*
- Both constraints are optional and configurable per session
- If a student scans outside constraints, attendance is rejected with a clear error message

### 5.5 Manual Override

- Teacher can manually mark any student as Present, Absent, or Excused
- Manual changes are logged with a timestamp

### 5.6 Attendance Reports

- Per-course view: all sessions with attendance summary
- Per-student view: attendance history across all sessions in a course
- Absence count and attendance percentage shown per student
- Export to **PDF** and **Excel (.xlsx)** *(Pro only)*

### 5.7 Billing & Subscription Management

- Upgrade prompt shown when Free teacher hits any plan limit
- Stripe Checkout for payment (no custom card UI)
- Stripe Customer Portal for self-service billing management
- Webhook handler to sync subscription status in real time
- Graceful downgrade: if Pro lapses, teacher keeps data but Pro features are locked

---

## 6. Database Schema

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | id, name, email, role, created_at | All app users |
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
- `manual` — marked manually by teacher/instructor

### Redis Key Patterns

| Key | Value | TTL | Purpose |
|---|---|---|---|
| `qr:token:{token}` | sessionId | 2 seconds | Rotating QR token validation |
| `scan:{studentId}:{sessionId}` | timestamp | session duration | Duplicate scan prevention |
| `ratelimit:scan:{ip}` | request count | 60 seconds | Scan rate limiting per IP |

### Subscription Status Values
- `active` — paid and current
- `trialing` — in free trial period
- `past_due` — payment failed, grace period
- `canceled` — subscription ended, downgraded to Free

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Availability | 99.9% uptime during academic hours |
| Scan response time | < 1 second from scan to confirmation |
| Concurrent users | Support 500+ simultaneous scans per minute |
| Data retention | Attendance records kept for minimum 5 years |
| Security | JWT auth, HTTPS only, location data never stored beyond session |
| Export performance | PDF/Excel reports generated in < 5 seconds |
| Webhook reliability | Stripe webhooks processed idempotently (no duplicate plan changes) |
| Billing security | Card data never touches our servers (Stripe handles all PCI compliance) |

---

## 8. Suggested Milestones

| Phase | Deliverables | Target |
|---|---|---|
| Phase 1 — Foundation | Supabase setup, auth (teacher + student login), course creation | Week 1–2 |
| Phase 2 — Core QR | Session creation, static QR generation, student web scan flow | Week 3–4 |
| Phase 3 — Constraints | Rotating QR, time window enforcement, location constraint | Week 5–6 |
| Phase 4 — Mobile | Flutter app with QR scanner, attendance history | Week 7–9 |
| Phase 5 — Reporting | Teacher dashboard, per-course/student reports, PDF + Excel export | Week 10–11 |
| Phase 6 — Billing | Stripe integration, plan limits enforcement, upgrade flow, webhooks | Week 12–13 |
| Phase 7 — Polish | Manual override, edge case handling, performance testing, launch | Week 14 |

---

## 9. Open Questions

- [ ] Should students be able to view their own attendance history in the Flutter app?
- [ ] What is the maximum allowed absence percentage before an alert is triggered?
- [ ] Should location constraint use GPS only, or also support campus Wi-Fi network as a fallback?
- [ ] Is there a need for a university-wide admin role in v2.0?
- [ ] Should session QR codes be accessible only while active, or can teachers reopen them?
- [ ] Should a free trial period be offered before requiring payment (e.g. 14 days Pro free)?
- [ ] Annual billing discount — what percentage? (common: 20% off)
- [ ] What happens to a teacher's data if they cancel Pro and exceed Free limits? (read-only lockout vs grace period?)

---

*QR Attendance App — PRD v1.6*
