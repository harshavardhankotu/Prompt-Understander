# OmniBid India

A full-stack real-time reverse auction marketplace where buyers post problems and verified service providers bid competitively — prices go DOWN as providers compete.

## Architecture

**Monorepo (pnpm workspaces)**

- `artifacts/omnibid` — React+Vite frontend (port 21059, preview path `/`)
- `artifacts/api-server` — Express 5 backend (port 8080, preview path `/api`)
- `lib/db` — Drizzle ORM + PostgreSQL schema
- `lib/api-spec` — OpenAPI 3.1 specification (`openapi.yaml`)
- `lib/api-zod` — Generated Zod validators from OpenAPI spec
- `lib/api-client-react` — Generated React Query hooks from OpenAPI spec

## Tech Stack

- **Frontend**: React 18, Vite, Wouter (routing), TanStack React Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui
- **Backend**: Express 5, Pino logger, bcryptjs, jsonwebtoken, zod
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT stored in `localStorage` as `omnibid_token`, passed via `Authorization: Bearer <token>` header

## 4-Role Architecture (Limber UK Model)

| Role | Type | Description |
|------|------|-------------|
| `retail_buyer` | B2C | Posts standard jobs, pays via UPI/Card |
| `enterprise_buyer` | B2B | Posts RFPs, gets TDS invoices, manages Approved Vendor Lists |
| `solo_provider` | Worker | Bids on jobs individually, KYC (Aadhaar/PAN) required |
| `agency_provider` | Agency | Manages team roster, bids on large contracts, GST mandatory |

Legacy roles (`buyer`, `provider`, `both`) are preserved for backward compatibility.

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | All 4 roles + legacy roles; `user_role` enum has 7 values |
| `categories` | 20 sectors with JSONB `custom_fields` + `priceFloor` |
| `requirements` | Buyer-posted problems; `isRecurring`, `recurringInterval`, `depositAmount` |
| `bids` | Provider bids; `executorType`, `subcontractorName`, `isHighlighted` (new provider boost) |
| `reviews` | Star ratings post-completion |
| `provider_subscriptions` | Plan management (free/starter/pro) — auto-created for provider roles |
| `notifications` | In-app notification system |
| `disputes` | Dispute resolution between buyers and providers |
| `compliance_vault` | KYC/GST/PAN/Insurance per user; `aadhaarStatus`, `panNumber`, `gstNumber`, `mcaRegistration`, `insuranceUploadUrl`, `isEmpanelled` |

## 20 Sectors (Dynamic Form Engine)

All sectors use the shared `<RequirementForm />` which reads `custom_fields` JSONB from the DB and renders inputs dynamically. No hardcoded sector-specific components.

| Sector | Slug | Price Floor |
|--------|------|-------------|
| Healthcare | healthcare | ₹500 |
| Logistics | logistics | ₹200 |
| Legal & Gov | legal | ₹1,000 |
| Tech & IT | tech | ₹500 |
| Home Services | home | ₹200 |
| Agriculture | agriculture | ₹300 |
| Education | education | ₹200 |
| Construction & Civil | construction | ₹2,000 |
| Event Management | events | ₹5,000 |
| Manufacturing | manufacturing | ₹1,000 |
| Creative & Media | creative | ₹500 |
| Consulting & Finance | consulting | ₹1,000 |
| Auto Fleet Repair | auto-fleet | ₹300 |
| Real Estate Services | real-estate | ₹1,000 |
| Retail Merchandising | retail | ₹500 |
| Hospitality & Catering | hospitality | ₹1,000 |
| Security Services | security | ₹500 |
| Beauty & Wellness | beauty | ₹300 |
| Export / Customs | customs | ₹2,000 |
| Heavy Machinery | heavy-machinery | ₹3,000 |

## Features

### Core
- Reverse auction bidding (price goes down)
- 20 service sectors with JSONB-driven dynamic form fields
- Provider subscription tiers (Free / Starter / Pro)
- JWT authentication, buyer and provider dashboards
- Live notifications system

### Strategic Features (v2)
1. **Dispute Resolution** — Raise, respond, resolve disputes. `/disputes` page.
2. **Anti-Ghost-Contractor Declaration** — Executor declaration on every bid (self/partial).
3. **Price Floors per Category** — Per-sector minimum bid; warning shown in bid form.
4. **New Provider Boost** — Auto-highlight bids from providers with < 10 total bids.
5. **Recurring Requirements** — Toggle + interval picker; one-click repost.
6. **Buyer Deposit Tracking** — 10% deposit shown for requirements > ₹10,000.

### Enterprise Features (v3 — Steps 1–5)
1. **4-Role Architecture** — Retail Buyer, Enterprise Buyer, Solo Provider, Agency Provider.
2. **Compliance Vault** — GST/PAN/Aadhaar/MCA/Insurance per user. GST mandatory for enterprise/agency roles. Accessible at `/compliance`.
3. **20-Sector Dynamic Engine** — One universal form, sectors defined in DB as JSONB.

### Pending (awaiting confirmation)
- **Two-Envelope Bidding** — Technical bid + financial bid for requirements > ₹1L.

## Routes (Backend — `/api/*`)

### Auth
- `POST /auth/register` — Register; accepts all 4 new + 3 legacy roles
- `POST /auth/login` — Login, returns JWT token
- `GET /auth/me` — Get current user

### Categories & Requirements
- `GET /categories` — List all 20 categories
- `GET /requirements` — List open requirements
- `POST /requirements` — Create requirement; supports `isRecurring`, `recurringInterval`
- `GET /requirements/my` / `GET /requirements/:id` / `POST /requirements/:id/accept-bid`
- `POST /requirements/:id/cancel` / `POST /requirements/:id/repost`

### Bids
- `POST /requirements/:requirementId/bids` — Place bid; requires `executorType`
- `GET /requirements/:requirementId/bids` / `POST /bids/:id/withdraw` / `GET /bids/my`

### Compliance
- `GET /compliance/my` — Get current user's compliance vault
- `PUT /compliance/my` — Upsert compliance vault (validates GST for enterprise/agency)

### Disputes
- `GET /disputes` / `POST /disputes` / `POST /disputes/:id/respond` / `POST /disputes/:id/resolve`

### Other
- `GET /dashboard/buyer` / `GET /dashboard/provider`
- `GET /notifications` / `POST /notifications/mark-read`
- `GET /subscriptions/my` / `POST /subscriptions/upgrade`
- `GET /users/:id` / `PATCH /users/:id/update` / `GET /users/:id/reviews`

## Frontend Pages

- `/` — Home
- `/login` / `/register` — Auth (4-role picker)
- `/requirements` — Browse 20 sectors
- `/requirements/new` — Dynamic form (sector → JSONB fields render automatically)
- `/requirements/:id` — Detail with bids, accept, repost, dispute
- `/bid/new/:requirementId` — Place bid with executor declaration
- `/dashboard/buyer` / `/dashboard/provider`
- `/profile/:id` / `/notifications` / `/subscriptions`
- `/disputes` — Raise and resolve disputes
- `/compliance` — Compliance Vault (KYC, GST, PAN, Insurance)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)

## Codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB Operations

```bash
# Push schema changes to DB
pnpm --filter @workspace/db run push

# Seed categories (all 20 sectors)
pnpm --filter @workspace/db exec tsx src/seed.ts
```
