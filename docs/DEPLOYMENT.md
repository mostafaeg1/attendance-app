# Deployment — QR Attendance App

> 📄 See also: [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Environments](#2-environments)
3. [Deployment Per Service](#3-deployment-per-service)
4. [Environment Variables](#4-environment-variables)
5. [CI/CD Strategy](#5-cicd-strategy)
6. [Rollout Order](#6-rollout-order)

---

## 1. Infrastructure Overview

| Service | Platform | Purpose | Cost |
|---|---|---|---|
| Next.js Frontend | Vercel | Web dashboard, attendee scan pages | Free tier / Pro |
| NestJS Backend | Railway | Persistent API server | ~$5/mo |
| PostgreSQL | Supabase Cloud | Primary database | Free tier / Pro |
| Redis | Upstash | QR tokens, rate limiting, caching | Free tier |
| Mobile App (iOS) | Apple App Store | Student Flutter app | $99/year |
| Mobile App (Android) | Google Play Store | Student Flutter app | $25 one-time |

---

## 2. Environments

| Environment | Purpose | Notes |
|---|---|---|
| Local | Development | All services run locally or point to dev Supabase project |
| Staging | Testing before release | Separate Supabase project, Stripe test mode |
| Production | Live users | Production Supabase, Stripe live keys, monitored |

---

## 3. Deployment Per Service

### Vercel — Next.js Frontend

- Connect GitHub repo to Vercel — auto-deploys on every push to `main`
- Environment variables set in Vercel dashboard
- Custom domain configured via Vercel DNS settings
- No manual deployment steps needed

### Railway — NestJS Backend

- Connect GitHub repo to Railway — auto-deploys on every push to `main`
- Point Railway to the `/backend` folder in the monorepo
- Exposes a public URL consumed by the Next.js frontend (`NEXT_PUBLIC_API_URL`)
- Environment variables set in Railway dashboard

### Supabase Cloud

- Hosted PostgreSQL — no deployment steps beyond project creation
- Enable PgBouncer for connection pooling in Supabase project settings
- Apply Row Level Security (RLS) policies via Supabase dashboard or migrations
- Use separate Supabase projects for staging and production

### Upstash — Redis

1. Create a database at [upstash.com](https://upstash.com)
2. Copy the `REDIS_URL` connection string
3. Add to NestJS environment variables
4. No infrastructure to manage — fully serverless

### Flutter — Mobile App

**iOS (App Store)**
```bash
flutter build ipa
# Submit via Xcode or Transporter to App Store Connect
```

**Android (Google Play)**
```bash
flutter build appbundle
# Upload to Google Play Console
```

| Platform | Review Time | Developer Account |
|---|---|---|
| iOS App Store | 1–3 days | $99/year (Apple Developer Program) |
| Google Play | Few hours – 1 day | $25 one-time |

Plan for review time before releases — don't ship a backend change that requires a simultaneous app update without accounting for the review window.

---

## 4. Environment Variables

### NestJS (`/backend/.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
REDIS_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
JWT_SECRET=
PORT=3001
```

### Next.js (`/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=              # Railway NestJS public URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Flutter (`/mobile/.env`)

```env
API_URL=                          # Same Railway NestJS public URL
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

> ⚠️ Never commit `.env` files to git. Use `.env.example` files with placeholder values instead.

---

## 5. CI/CD Strategy

Vercel and Railway both watch the GitHub repo natively — no CI configuration needed for web or API deployments. Flutter is the only manual step.

```
Push to main branch
        ↓
├── Vercel detects change → builds + deploys Next.js automatically
├── Railway detects change → builds + deploys NestJS automatically
└── Flutter → manual build + App Store / Play Store submission
```

### Stripe Webhook Configuration

After deploying NestJS to Railway, register your webhook endpoint in the Stripe dashboard:

- **Staging:** `https://your-railway-url.railway.app/billing/webhook`
- **Production:** `https://your-production-url.railway.app/billing/webhook`

Events to listen for:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### Future: Automate Flutter with Fastlane

Once release cadence increases, use [Fastlane](https://fastlane.tools) to automate Flutter builds and app store submissions:

```bash
fastlane ios release
fastlane android release
```

---

## 6. Rollout Order

Follow this order exactly — each step depends on the previous one being verified.

### Staging

- [ ] Create Supabase project (staging) and run schema migrations
- [ ] Deploy NestJS to Railway (staging) — verify API responds at public URL
- [ ] Deploy Next.js to Vercel (staging) — verify frontend calls NestJS API correctly
- [ ] Create Upstash Redis database — verify QR token flow end to end
- [ ] Configure Stripe webhooks pointing to staging Railway URL
- [ ] Run full QA: teacher creates course → session → QR → student scans → attendance recorded
- [ ] Test billing flow with Stripe test card `4242 4242 4242 4242`

### Production

- [ ] Repeat all staging steps with production services and live keys
- [ ] Point custom domain to Vercel
- [ ] Switch Stripe to live mode
- [ ] Submit Flutter app to App Store + Google Play
- [ ] Monitor Railway logs and Supabase dashboard after first real sessions
