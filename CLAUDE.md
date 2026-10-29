# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

QR-based attendance tracking SaaS. Teachers create courses and sessions, display a QR code (static or rotating), and attendees scan it to check in. Teachers subscribe via Stripe (Free vs Pro tiers); see [docs/PRD.md](docs/PRD.md) for full product spec, plan limits, and DB schema reference.

## Monorepo layout

Turborepo with two independent apps — **only `web/` is actively built out**; treat `mobile/` as unstarted scaffolding, not working reference code. (A `backend/` NestJS starter existed early on but was removed since it was never wired up — `web/` and `mobile/` both talk to Supabase directly.)

- `web/` — Next.js 16 (App Router) teacher dashboard. This is where nearly all work happens today.
- `mobile/` — Flutter student app, currently just `flutter create` boilerplate (default counter app).
- `supabase/migrations/` — canonical SQL schema + RLS policies, run manually via the Supabase SQL editor (see below).

There's a stray `web/supabase/` directory (from running `supabase` CLI inside `web/`) with its own `.branches`/`.temp`/`migrations` — the real source-of-truth migrations are at the repo root `supabase/migrations/`, not there.

## Commands

Root (Turborepo, orchestrates `web`):
```bash
npm install       # installs root + workspaces
npm run dev        # runs dev for all apps via turbo
```

`web/` (run from `web/`):
```bash
npm run dev        # next dev
npm run build       # next build
npm run lint        # eslint
```

`mobile/` (run from `mobile/`):
```bash
flutter pub get
flutter run
flutter test
```

Database: there is no migration runner wired up. Apply `supabase/migrations/*.sql` in order by pasting into the Supabase project's SQL editor.

## Web app architecture (`web/`)

- **Auth & data**: Supabase (Postgres + Auth), accessed directly from Next.js — no REST API layer sits in between despite `web/lib/api.ts` existing for that purpose (points at `NEXT_PUBLIC_API_URL`, unused by any current feature). New teacher-dashboard features should follow the existing pattern (Server Actions + Supabase client).
- **Supabase clients** (`web/lib/supabase/`): three separate client constructors, each for a different execution context — `client.ts` (browser, `createBrowserClient`), `server.ts` (Server Components/Actions, `createServerClient` using `next/headers` cookies), `middleware.ts` (`updateSession`, used inside `web/middleware.ts` to refresh the session cookie and gate routes). Always use the one matching the context; mixing them breaks cookie handling.
- **Auth flow**: `web/middleware.ts` matches `/dashboard/:path*`, `/login`, `/signup`, `/auth/callback`, and redirects unauthenticated users to `/login` (and authenticated users away from `/login`/`/signup`). `web/app/auth/callback/route.ts` handles the Supabase email-confirmation redirect. `web/lib/supabase/profile.ts` (`ensureTeacherProfile`) upserts a row into the `users` table on signup — every teacher must have a corresponding `users` row before other tables' FKs/RLS work.
- **Mutations**: `"use server"` Server Actions in `web/actions/*.ts` (e.g. `signIn`/`signUp`/`signOut` in `auth.ts`, `getCourses`/`createCourse` in `courses.ts`), typically used with `useActionState` from form components in `web/components/**`. Actions return a `{ error?, message? }` state shape rather than throwing, except for lookups like `getCourses` which throw on Supabase errors.
- **Plan limits**: enforced app-side, not DB-side. `web/constants/plans.ts` (`PLAN_LIMITS`) mirrors the `free`/`pro` limits seeded into the `plans` table in `supabase/migrations/001_schema.sql` — check both if changing tier limits. Server Actions that create resources (e.g. `createCourse`) must count existing rows and compare against `PLAN_LIMITS` before inserting.
- **Types**: `web/types/index.ts` defines the app-facing domain types (`Course`, `Session`, `AttendanceRecord`, `Plan`, etc., camelCase). DB rows are snake_case; each action module maps row → domain type manually (see `mapCourse` in `web/actions/courses.ts`) rather than relying on generated Supabase types.
- **Path alias**: `@/*` maps to `web/*` (see `web/tsconfig.json`).
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`), no component library — `web/components/ui/` holds hand-rolled primitives (e.g. `button.tsx`).
- Next.js 16 / React 19 — APIs and conventions may differ from older Next.js knowledge (e.g. `cookies()` in `server.ts` is `async`). When unsure, check `node_modules/next/dist/docs/` before assuming pre-16 behavior.

## Database (`supabase/migrations/`)

- `001_schema.sql`: tables — `users`, `courses`, `course_enrollments`, `sessions`, `attendance`, `plans`, `subscriptions`. Users have `role` (`teacher`|`attendee`); attendance `status` is `present`|`absent`|`excused`; sessions have `qr_mode` `static`|`rotating`.
- `002_rls.sql`: Row Level Security — teachers get `FOR ALL` on rows they own (`teacher_id = auth.uid()`), attendees get scoped `SELECT`/enrollment access. Any new table holding teacher or attendee data needs an equivalent RLS policy added here, or Supabase will deny access by default.
- No `id`/`down` migration tooling — files are applied by number order manually; if adding a new migration, name it `003_*.sql` and append, don't edit existing files.
