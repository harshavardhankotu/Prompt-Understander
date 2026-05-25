# OmniBid India — Production Deployment Guide

> **Stack**: Vite/React → **Vercel** · Express/Node.js → **Render** · Database → **Supabase**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Supabase Configuration](#3-supabase-configuration)
4. [Deploy Backend → Render](#4-deploy-backend--render)
5. [Deploy Frontend → Vercel](#5-deploy-frontend--vercel)
6. [Connect Frontend ↔ Backend](#6-connect-frontend--backend)
7. [Razorpay Live Mode Switch](#7-razorpay-live-mode-switch)
8. [Full Environment Variable Reference](#8-full-environment-variable-reference)
9. [Post-Deployment Smoke Test](#9-post-deployment-smoke-test)
10. [Rollback Procedure](#10-rollback-procedure)

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 20.x LTS | Required for both build environments |
| pnpm | 9.x | Workspace manager (`npm i -g pnpm`) |
| Git | Any | Monorepo must be pushed to GitHub |
| Supabase account | — | Free tier is sufficient to start |
| Render account | — | Free tier OK; upgrade for always-on |
| Vercel account | — | Hobby tier is free |
| Razorpay account | — | Live keys required for production |

---

## 2. Repository Setup

```bash
# Push your monorepo to GitHub (if not already done)
git remote add origin https://github.com/<your-org>/omnibid-india.git
git push -u origin main
```

> **Important**: Ensure `.env` is listed in `.gitignore`. Never commit secrets.

---

## 3. Supabase Configuration

### 3a. Create a New Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose region: **ap-south-1 (Mumbai)** for lowest latency in India
3. Note down: **Project URL**, **anon key**, **service_role key**

### 3b. Run Migrations
```bash
# From monorepo root — push all Drizzle migrations to production DB
pnpm --filter @omnibid/server exec drizzle-kit push
```

### 3c. Enable Row Level Security
- In Supabase Dashboard → **Database → Tables**
- Verify RLS is **ON** for: `requirements`, `bids`, `payments`, `profiles`
- Apply the RLS policies from `/drizzle/` migration files if not already applied

---

## 4. Deploy Backend → Render

### 4a. Connect Repository
1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your **GitHub repo** → Select branch `main`
3. Render auto-detects `render.yaml` — click **Apply**

### 4b. Manual Service Settings (if not using render.yaml)
| Setting | Value |
|---------|-------|
| **Runtime** | Node |
| **Build Command** | `pnpm install --no-frozen-lockfile && pnpm --filter @omnibid/server build` |
| **Start Command** | `pnpm --filter @omnibid/server start` |
| **Node Version** | 20 |
| **Port** | `10000` |
| **Plan** | Starter ($7/mo) for always-on |

### 4c. Set Environment Variables on Render
Navigate to your service → **Environment** tab → add each variable:

```
NODE_ENV                   = production
PORT                       = 10000
DATABASE_URL               = postgresql://...  (from Supabase → Settings → Database)
SUPABASE_URL               = https://<ref>.supabase.co
SUPABASE_ANON_KEY          = eyJ...
SUPABASE_SERVICE_ROLE_KEY  = eyJ...
RAZORPAY_KEY_ID            = rzp_live_...
RAZORPAY_KEY_SECRET        = <your_live_secret>
JWT_SECRET                 = <random 64-char string>
CLIENT_URL                 = https://<your-app>.vercel.app
SESSION_SECRET             = <random 32-char string>
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4d. Confirm Deployment
- Render build logs: Watch for `Server listening on port 10000`
- Health check: `GET https://<render-service>.onrender.com/api/health`
- Expected response: `{ "status": "ok" }`

---

## 5. Deploy Frontend → Vercel

### 5a. Import Project
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your **GitHub repo**
3. Set **Root Directory** to `client`

### 5b. Build Settings
| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install --no-frozen-lockfile` |

> **Note**: Vercel may need the monorepo root's `pnpm-workspace.yaml`. If builds fail, set **Root Directory** to `.` (root) and override build command to `pnpm --filter @omnibid/client build`.

### 5c. Set Environment Variables on Vercel
Navigate to Project → **Settings → Environment Variables**:

```
VITE_API_URL               = https://<render-service>.onrender.com
VITE_SUPABASE_URL          = https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJ...
VITE_RAZORPAY_KEY_ID       = rzp_live_...
```

> **Rule**: Only `VITE_` prefixed variables are exposed to the browser bundle. Never put `RAZORPAY_KEY_SECRET` here.

### 5d. Configure SPA Routing
Create `client/public/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This ensures React Router / Wouter routes work on hard refresh.

---

## 6. Connect Frontend ↔ Backend

### 6a. Update CORS on Backend
Ensure `server/src/app.ts` has your Vercel URL in the allowed origins:
```
CLIENT_URL = https://<your-app>.vercel.app
```
The CORS middleware already reads `process.env.CLIENT_URL` — no code change needed.

### 6b. Update Frontend API Base URL
In `client/src/lib/api-client.ts` (or equivalent), confirm:
```typescript
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
```

### 6c. Re-deploy Both Services After Variable Changes
- Render: **Manual Deploy** → **Deploy latest commit**
- Vercel: Push any commit to `main` or click **Redeploy**

---

## 7. Razorpay Live Mode Switch

### 7a. Activate Live Mode
1. Log in to [razorpay.com](https://razorpay.com) → **Settings → API Keys**
2. Switch from **Test Mode** to **Live Mode**
3. Generate new **Key ID** and **Key Secret**

### 7b. Complete KYC
Razorpay requires business KYC before live payments:
- GST Registration Certificate
- Bank Account Details (cancelled cheque)
- Business PAN Card
- Typical approval: 2–5 business days

### 7c. Update Environment Variables
Replace test keys with live keys in **both** Render and Vercel:
```
RAZORPAY_KEY_ID     → rzp_live_...   (Render + Vercel)
RAZORPAY_KEY_SECRET → <live_secret>  (Render only — never expose to frontend)
```

### 7d. Configure Razorpay Webhooks
1. Razorpay Dashboard → **Settings → Webhooks → Add Webhook**
2. **Webhook URL**: `https://<render-service>.onrender.com/api/webhooks/razorpay`
3. **Events to subscribe**: `payment.captured`, `payment.failed`, `order.paid`
4. Set a **Webhook Secret** and add it to Render env as `RAZORPAY_WEBHOOK_SECRET`

---

## 8. Full Environment Variable Reference

### Backend (Render) — Complete List

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Set to `production` |
| `PORT` | ✅ | `10000` (Render default) |
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin key — never expose publicly |
| `JWT_SECRET` | ✅ | 64-char random hex string |
| `SESSION_SECRET` | ✅ | 32-char random hex string |
| `CLIENT_URL` | ✅ | `https://<your-app>.vercel.app` |
| `RAZORPAY_KEY_ID` | ✅ | Live: `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | ✅ | Live Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Webhook signature secret from Razorpay |
| `FILE_STORAGE_BUCKET` | ⚠️ | S3-compatible bucket name |
| `FILE_STORAGE_REGION` | ⚠️ | e.g., `ap-south-1` |
| `FILE_STORAGE_ACCESS_KEY` | ⚠️ | S3 access key |
| `FILE_STORAGE_SECRET_KEY` | ⚠️ | S3 secret key |
| `WHATSAPP_VERIFY_TOKEN` | ⚠️ | Meta webhook verify token |
| `WHATSAPP_ACCESS_TOKEN` | ⚠️ | Meta Graph API token |
| `WHATSAPP_PHONE_NUMBER_ID` | ⚠️ | Meta Business phone number ID |
| `OPENAI_API_KEY` | ⚠️ | For AI-assisted bid summaries |
| `SENTRY_DSN` | ⚠️ | Error monitoring |
| `RESEND_API_KEY` | ⚠️ | Transactional email |
| `DIGILOCKER_CLIENT_ID` | ⚠️ | Government ID verification |
| `DIGILOCKER_CLIENT_SECRET` | ⚠️ | Government ID verification |

> ✅ = Required for core app to function · ⚠️ = Required for specific features

### Frontend (Vercel) — Complete List

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | `https://<render-service>.onrender.com` |
| `VITE_SUPABASE_URL` | ✅ | Same as backend `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same as backend `SUPABASE_ANON_KEY` |
| `VITE_RAZORPAY_KEY_ID` | ✅ | Public Razorpay key only — no secret |

---

## 9. Post-Deployment Smoke Test

Run these checks immediately after every deployment:

```bash
# 1. Backend health
curl https://<render>.onrender.com/api/health

# 2. Auth — Register new user
curl -X POST https://<render>.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Smoke@1234","name":"Smoke Test"}'

# 3. Create a requirement
curl -X POST https://<render>.onrender.com/api/requirements \
  -H "Authorization: Bearer <jwt_from_step_2>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Project","description":"Deployment smoke test","budget":50000}'

# 4. Frontend — open browser
open https://<your-app>.vercel.app
# → Verify login, create requirement, see Razorpay modal
```

**Checklist:**
- [ ] Backend `/api/health` returns 200
- [ ] User registration and JWT generation work
- [ ] Requirements can be created and listed
- [ ] Razorpay checkout modal loads (key visible in Network tab)
- [ ] Supabase Realtime — bid list updates live on a second browser tab
- [ ] Vercel routes work on hard refresh (SPA routing)

---

## 10. Rollback Procedure

### Render (Backend)
1. Go to **Deploys** tab → find last stable deploy
2. Click **Redeploy** on that specific commit

### Vercel (Frontend)
1. Go to **Deployments** tab → find last stable deploy
2. Click `···` → **Promote to Production**

### Database Rollback
```bash
# Only if a migration caused data issues
pnpm --filter @omnibid/server exec drizzle-kit drop
# Then re-apply migrations up to the safe version
```

> ⚠️ Database rollbacks are destructive. Always take a **Supabase backup** (Dashboard → Database → Backups) before pushing schema changes to production.

---

## Quick Reference URLs

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Render Dashboard | https://dashboard.render.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Razorpay Dashboard | https://dashboard.razorpay.com |
| Live App (Frontend) | `https://<your-app>.vercel.app` |
| Live API (Backend) | `https://<render-service>.onrender.com` |

---

*Generated for OmniBid India — Monorepo v1.0 · Last updated: May 2026*
