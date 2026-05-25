# 🚢 OmniBid India: Production Cloud Deployment Guide

This guide details the complete configuration, environment variables, GitHub Secrets, and automated pipelines required to deploy the OmniBid monorepo to production cloud hosting platforms:
*   **Client (Frontend SPA):** Hosted on **Vercel** for lightning-fast edge delivery.
*   **Server (Backend API):** Hosted on **Render** (or Railway/AWS) with continuous deployment.
*   **Database (PostgreSQL):** Deployed on **Supabase** Sydney Region (`ap-southeast-2`).

---

## 🚀 1. Continuous Integration (GitHub Actions)

We have configured a continuous integration workflow inside [`.github/workflows/production.yml`](file:///.github/workflows/production.yml). 

On every `push` and `pull_request` to the `main` branch, the pipeline will:
1.  Spin up an `ubuntu-latest` VM.
2.  Set up **Node.js 20** and install **pnpm** using cached dependencies.
3.  Execute `pnpm install` verifying absolute lockfile parity.
4.  Run typechecks across all monorepo workspaces via `pnpm run typecheck`.
5.  Execute the global testing suite using `npx vitest run`.

If any step fails, merging is blocked, ensuring absolute branch integrity.

---

## 💻 2. Client Deployment (Vercel)

The React SPA client (`@omnibid/client`) compiles into static assets and is optimized for Vercel's Edge Network.

### Vercel Project Configuration
*   **Framework Preset:** `Vite`
*   **Root Directory:** `client`
*   **Build Command:** `pnpm run build`
*   **Output Directory:** `dist/public`
*   **Node.js Version:** `20.x`

### Required Client Environment Variables
Configure these variables in your Vercel Project Dashboard under **Settings > Environment Variables**:

| Variable Name | Description / Value |
| :--- | :--- |
| `VITE_API_URL` | The live backend API base URL (e.g., `https://omnibid-api.onrender.com/api`). |
| `VITE_SUPABASE_URL` | The public Supabase project URL (e.g., `https://mrjmsmhhzkinvmljxqsk.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | The public Supabase anonymous API key for WebSocket Realtime bindings. |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay API Key ID (Sandbox/Live) for client checkout integration. |

---

## ⚡ 3. Server Deployment (Render)

The Express backend server (`@omnibid/server`) requires a persistent Node.js environment to handle HTTP requests, webhooks, and process LLM-matching operations.

### Render Web Service Configuration
*   **Runtime:** `Node`
*   **Node Version:** `20`
*   **Build Command:** `pnpm install && pnpm --filter @omnibid/server run build`
*   **Start Command:** `pnpm --filter @omnibid/server start` (runs the bundled `node dist/index.mjs` entry point).

### Required Server Environment Variables
Configure these variables in your Render Web Service Dashboard under **Environment**:

| Variable Name | Description / Value |
| :--- | :--- |
| `DATABASE_URL` | The Supabase PostgreSQL pooler connection string (IPv4 Pooler on Port `6543`). |
| `NODE_ENV` | Set to `production`. |
| `PORT` | Set to `3001` (Render binds this dynamically to their web ingress). |
| `CLIENT_URL` | Your live Vercel frontend URL (used to configure CORS security headers). |
| `JWT_SECRET` | A secure, cryptographically random string used to sign session tokens. |
| `RAZORPAY_KEY_ID` | Your Razorpay API Key ID. |
| `RAZORPAY_KEY_SECRET` | Your Razorpay API Key Secret (secure, server-only credentials). |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature validation key to authenticate captured/paid webhooks cryptographically. |
| `GEMINI_API_KEY` | Your Google Gemini API Key for running the Smart Match AI recommendation engine. |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` (if required to connect to the cloud pooler bypassing certificate authority handshakes). |

---

## 🔑 4. Automating Continuous Deployment (GitHub Secrets)

To enable zero-downtime, fully automated deployment after CI pipelines pass successfully, add the following secrets to **GitHub Repository Settings > Secrets and Variables > Actions**:

### 1. Vercel Automated Deployments
*   `VERCEL_TOKEN`: Your Vercel Personal Access Token.
*   `VERCEL_PROJECT_ID`: The project ID linked to your Vercel deployment.
*   `VERCEL_ORG_ID`: Your Vercel Organization/User ID.
*   *Action:* Trigger `vercel-deploy` actions on CI success.

### 2. Render Automated Deployments
*   `RENDER_DEPLOY_HOOK`: The secure deploy hook URL generated in your Render service dashboard.
*   *Action:* Trigger a POST request to this hook upon successful completion of main branch CI checks:
    ```bash
    curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
    ```
