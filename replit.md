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

- **Frontend**: React 18, Vite, Wouter (routing), TanStack React Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Express 5, Pino logger, bcrypt, jsonwebtoken, zod
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT stored in `localStorage` as `omnibid_token`, passed via `Authorization: Bearer <token>` header

## 4-Role Architecture

| Role | Type | Description |
|------|------|-------------|
| `retail_buyer` | B2C | Posts standard jobs, pays via UPI/Card |
| `enterprise_buyer` | B2B | Posts RFPs, gets TDS invoices, manages Approved Vendor Lists |
| `solo_provider` | Worker | Bids on jobs individually, KYC (Aadhaar/PAN) required |
| `agency_provider` | Agency | Manages team roster, bids on large contracts, GST mandatory |

Legacy roles (`buyer`, `provider`, `both`) preserved for backward compatibility.

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | All 4 roles + legacy roles; `user_role` enum has 7 values; `referralCode`, `referredBy` |
| `categories` | 20 sectors with JSONB `custom_fields` + `priceFloor` |
| `requirements` | `bidType` (standard/two_envelope), `isMegaProject`, `isSyndicate`, `jugaadMode`, `isRecurring`, `depositAmount` |
| `bids` | `envelopeAUrl`, `crewSizeOffered`, `isBackhaul`, `bidSource`, `executorType`, `subcontractorName`, `isHighlighted` |
| `negotiations` | Bhaav-Taav negotiation thread; JSONB `messages`, `counterOfferAmount`, `counterOfferStatus` |
| `payments` | UPI escrow mock; `escrowStatus`, `platformFeePercent`, `tdsAmount`, `mobilizationAdvancePct`, `milestonesCompleted` |
| `work_proofs` | Milestone proof submission + buyer approval |
| `reviews` | Star ratings post-completion |
| `provider_subscriptions` | Plan management (free/starter/pro) |
| `notifications` | In-app notification system |
| `disputes` | Dispute resolution between buyers and providers |
| `compliance_vault` | KYC/GST/PAN/Insurance per user |
| `user_settings` | JSONB per-user settings (role-aware sections) |
| `analytics_events` | Platform event tracking table |
| `referrals` | Referral engine — code, status, reward tracking |
| `rate_cards` | Enterprise rate/ceiling management per category |

## Backend Routes (`/api/*`)

### Auth
- `POST /auth/register` / `POST /auth/login` / `GET /auth/me`

### Categories & Requirements
- `GET /categories`, `GET /requirements`, `POST /requirements`
- `GET /requirements/my`, `GET /requirements/:id`, `POST /requirements/:id/accept-bid`
- `POST /requirements/:id/cancel`, `POST /requirements/:id/repost`

### Bids
- `POST /requirements/:requirementId/bids`, `GET /requirements/:requirementId/bids`
- `POST /bids/:id/withdraw`, `GET /bids/my`

### Negotiation & Payment
- `GET /negotiations/:requirementId/:providerId`, `POST /negotiations/:requirementId/:providerId`
- `GET /payments/:requirementId`, `POST /payments/:requirementId`
- `POST /payments/:requirementId/milestones/:n/complete`, `POST /payments/:requirementId/release`
- `POST /work-proofs/:requirementId/:milestoneNumber`, `POST /work-proofs/:requirementId/:milestoneNumber/approve`

### Settings (NEW)
- `GET /settings/my` — Role-aware JSONB settings
- `PUT /settings/my` — Update settings (deep merge)

### Analytics (NEW)
- `POST /analytics/events` — Track platform event (public)
- `GET /analytics/dashboard` — Role-specific stats (buyer or provider)
- `GET /analytics/funnel` — Platform conversion funnel (auth)
- `GET /analytics/admin` — Full platform analytics (admin only)

### Referrals (NEW)
- `GET /referrals/my` — Code, link, stats, history
- `POST /referrals/invite` — Send email invite, create referral record

### Enterprise Rate Cards (NEW)
- `GET /enterprise/rate-cards`, `POST /enterprise/rate-cards`
- `PUT /enterprise/rate-cards/:id`, `DELETE /enterprise/rate-cards/:id`

### Admin (NEW)
- `GET /admin/stats` — Platform-wide GMV, users, disputes
- `GET /admin/categories` — All categories with requirement/bid counts
- `PUT /admin/categories/:id/floor` — Update price floor
- `GET /admin/users?page=N` — Paginated user list
- `PUT /admin/users/:id` — Update trust score, verification, OmniScore

### Other
- `GET /compliance/my`, `PUT /compliance/my`
- `GET /disputes`, `POST /disputes`, `POST /disputes/:id/respond`, `POST /disputes/:id/resolve`
- `GET /dashboard/buyer`, `GET /dashboard/provider`
- `GET /notifications`, `POST /notifications/mark-read`
- `GET /subscriptions/my`, `POST /subscriptions/upgrade`
- `GET /users/:id`, `PATCH /users/:id/update`, `GET /users/:id/reviews`

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, category browser |
| `/login` / `/register` | Auth (4-role picker) |
| `/requirements` | Browse 20 sectors |
| `/requirements/new` | Dynamic JSONB form |
| `/requirements/:id` | Detail with bids, accept, negotiate, dispute |
| `/bid/new/:requirementId` | Place bid + executor declaration |
| `/dashboard/buyer` / `/dashboard/provider` | Role dashboards |
| `/profile/:id` | Provider profile + OmniScore |
| `/notifications` | In-app notification feed |
| `/subscriptions` | Plan management |
| `/disputes` | Raise and resolve disputes |
| `/compliance` | Compliance Vault (KYC, GST, PAN) |
| `/negotiate/:reqId/:providerId` | Bhaav-Taav negotiation room |
| `/payment/:requirementId` | UPI escrow + milestone releases |
| `/settings` | Role-aware settings (4 roles × unique sections) |
| `/analytics` | Recharts dashboards — Buyer / Provider / Admin views |
| `/referral` | Refer & Earn — share link, email invite, stats |
| `/admin` | Admin control panel — categories, users, stats |
| `/qa` | QA & Demo page — accounts, journeys, role matrix, test scenarios |

## Demo Accounts

All have seeded requirements, bids, and compliance records.

| Role | Email | Password |
|------|-------|----------|
| Retail Buyer (admin) | buyer@demo.omnibid.in | Demo@123 |
| Enterprise Buyer | enterprise@demo.omnibid.in | Demo@123 |
| Solo Provider | provider@demo.omnibid.in | Demo@123 |
| Agency Provider | agency@demo.omnibid.in | Demo@123 |

Admin access: `buyer@demo.omnibid.in` has `trustScore = 100`.

## Admin Access Check

```ts
user.trustScore >= 100 || user.email.endsWith("@omnibid.admin")
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)

## Key Commands

```bash
# Codegen (OpenAPI → React hooks + Zod)
pnpm --filter @workspace/api-spec run codegen

# DB push
pnpm --filter @workspace/db run push

# Seed categories (20 sectors)
pnpm --filter @workspace/db run seed

# Seed demo users + requirements + bids
pnpm --filter @workspace/db run seed-demo

# Full typecheck
pnpm run typecheck
```

## 20 Sectors (Dynamic Form Engine)

All sectors use `<RequirementForm />` which reads `custom_fields` JSONB from DB.

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
