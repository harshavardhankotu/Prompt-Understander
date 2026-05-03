# OmniBid India

## Bug Fixes & Improvements (Audit Session)

| Fix | File | Detail |
|-----|------|--------|
| `GavelIcon` crash | `requirement-detail.tsx` | Was imported as `Gavel` but used as `GavelIcon` — runtime crash on bid button fixed |
| Bid enrichment | `requirements.ts` GET /:id | `providerAvgRating` and `providerSubscriptionPlan` were hardcoded `null` — now joins `reviews` and `provider_subscriptions` tables |
| Search filter | `requirements.ts` GET / | `search` query param was accepted but not applied — now filters via `ilike` on title, description, city |
| Live polling | `requirement-detail.tsx` | Added 20s `refetchInterval` (active while auction is `open`) for live bid updates |
| SelectItem crash | `market-intelligence.tsx` | `<SelectItem value="">` is invalid in Radix UI — changed to `value="all"` with matching state/query logic |
| QA page Phase 9 | `qa.tsx` | Added 10 Phase 9 user journeys and 15 new test scenarios (T26–T40) covering Finance, Market, GPS, Auctions |



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
| `retail_buyer` | B2C | Posts standard jobs, pays via UPI/Card/WhatsApp Pay |
| `enterprise_buyer` | B2B | Posts RFPs, limited/sealed/multi-round auctions, multi-lot management |
| `solo_provider` | Worker | Bids on jobs individually, KYC required, embedded finance |
| `agency_provider` | Agency | Manages team roster, bids on large contracts, fleet GPS tracking |

Legacy roles (`buyer`, `provider`, `both`) preserved for backward compatibility.

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | All 4 roles; `fraudScore`, `creditScore`, `loanEligible`, `latitude`, `longitude`, `serviceRadiusKm`, `referralCode` |
| `categories` | 20 sectors with JSONB `custom_fields` + `priceFloor` |
| `requirements` | `auctionType`, `vendorQualificationRequired`, `isMultiLot`, `lotCount`, `maxRounds`, `currentRound`, `rankingMode` |
| `bids` | `roundNumber`, `lotId`, `fraudScore`, `rankingScore` |
| `negotiations` | Bhaav-Taav negotiation thread |
| `payments` | UPI escrow; `paymentMethod`, `whatsappPayStatus`, `upiOneWorldUsed`, `loanLinkedAmount` |
| `work_proofs` | Milestone proof submission + buyer approval |
| `reviews` | Star ratings post-completion |
| `provider_subscriptions` | Plan management (free/starter/pro) |
| `notifications` | In-app notification system |
| `disputes` | Dispute resolution |
| `compliance_vault` | KYC/GST/PAN/Insurance per user |

### Phase 9 Tables (New)
| Table | Purpose |
|-------|---------|
| `user_settings` | JSONB per-user settings (role-aware sections) |
| `analytics_events` | Platform event tracking |
| `referrals` | Referral engine — code, status, reward tracking |
| `rate_cards` | Enterprise rate/ceiling management per category |
| `loan_offers` | Embedded finance micro-lending — working capital, mobilization advance |
| `fraud_events` | Fraud detection flags — severity, status, review |
| `requirement_lots` | Multi-lot management — lot-wise city, budget, status |
| `auction_configs` | Advanced auction settings — limited/sealed/multi_round/multi_lot |
| `gps_tracking` | Real-time GPS events — status, ETA, speed, privacy controls |
| `sustainability_records` | Carbon footprint, fuel savings, route efficiency |
| `vendor_rankings` | AI-computed vendor ranking scores per requirement |

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
- `GET|POST /negotiations/:requirementId/:providerId`
- `GET|POST /payments/:requirementId`
- `POST /payments/:requirementId/milestones/:n/complete`
- `POST /work-proofs/:requirementId/:milestoneNumber/approve`

### Settings
- `GET /settings/my`, `PUT /settings/my`

### Analytics
- `POST /analytics/events`, `GET /analytics/dashboard`
- `GET /analytics/funnel`, `GET /analytics/admin`

### Referrals
- `GET /referrals/my`, `POST /referrals/invite`

### Enterprise Rate Cards
- `GET|POST /enterprise/rate-cards`
- `PUT|DELETE /enterprise/rate-cards/:id`

### Admin
- `GET /admin/stats`, `GET /admin/categories`
- `PUT /admin/categories/:id/floor`
- `GET /admin/users`, `PUT /admin/users/:id`

### Finance (NEW — Phase 9)
- `GET /finance/eligibility` — OmniCredit score + loan eligibility
- `GET /finance/loan-offers` — list loan offers
- `POST /finance/loan-offers/request` — request a working capital loan
- `POST /finance/loan-offers/:id/accept` — accept loan (disburse)
- `POST /finance/loan-offers/:id/decline`
- `GET /finance/whatsapp-pay/eligibility` — WhatsApp Pay eligibility check
- `GET /finance/upi-one-world/eligibility` — UPI One World eligibility

### Fraud Detection (NEW — Phase 9)
- `GET /fraud/score` — compute own fraud score from rule engine
- `GET /fraud/rules` — list all fraud detection rules and effects
- `GET /fraud/events` — admin: list fraud events
- `POST /fraud/events` — admin: manually flag a user
- `PUT /fraud/events/:id/review` — admin: clear or confirm fraud event

### Market Intelligence (NEW — Phase 9)
- `GET /market/intelligence` — competitor intel (provider: bid windows, saturation; buyer: supplier depth)
- `GET /market/vendor-ranking/:requirementId` — AI vendor ranking with mode selection
- `GET /market/post-auction/:requirementId` — post-auction analysis (buyer + provider views)
- `GET /market/sustainability/:requirementId` — sustainability record for a requirement

### Advanced Auctions (NEW — Phase 9)
- `GET|POST /auctions/:requirementId/config` — auction type, rounds, qualification, ranking mode
- `POST /auctions/:requirementId/advance-round` — advance multi-round (shortlist + reject others)
- `POST /auctions/:requirementId/reveal` — reveal sealed bids
- `GET /auctions/:requirementId/lots` — list lots
- `POST /auctions/:requirementId/lots` — create/replace lots (enterprise only)

### GPS Tracking (NEW — Phase 9)
- `POST /tracking/gps` — provider posts location update
- `GET /tracking/gps/:requirementId` — get live tracking feed (+ SLA status for enterprise)
- `POST /tracking/gps/stop` — stop location sharing
- `POST /tracking/sustainability` — compute carbon footprint from coordinates (Haversine)

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
| `/finance` | Embedded Finance — OmniCredit score, loan offers, WhatsApp Pay, UPI One World |
| `/market` | Market Intelligence — competitor data, bid windows, saturation, post-auction analysis |
| `/tracking/:requirementId` | GPS Tracking — live feed, SLA dashboard, sustainability |
| `/auction/:requirementId` | Advanced Auction Config — limited/sealed/multi-round/multi-lot + AI vendor ranking |

## Phase 9 Feature Access Matrix

| Feature | retail_buyer | enterprise_buyer | solo_provider | agency_provider |
|---------|:---:|:---:|:---:|:---:|
| WhatsApp Pay | ✅ | Optional | — | — |
| UPI One World | ✅ (travel/events) | ✅ | — | — |
| Embedded Finance Loans | — | — | ✅ | ✅ |
| Fraud Score | — | — | ✅ | ✅ |
| Limited Reverse Auction | Premium only | ✅ Core | If qualified | If qualified |
| Sealed Bid Auction | ✅ | ✅ | ✅ | ✅ |
| Multi-Round Bidding | Limited | ✅ Core | — | ✅ |
| Multi-Lot Management | — | ✅ Core | Single lot only | ✅ |
| Competitor Intelligence | — | ✅ | ✅ | ✅ |
| Post-Auction Analysis | ✅ | ✅ | ✅ (own bids) | ✅ |
| AI Vendor Ranking | ✅ (simplified) | ✅ (full modes) | Visible | Visible |
| GPS Tracking | View ETA | SLA Dashboard | Share location | Fleet tracking |
| Sustainability | Simple message | Full export | Efficiency score | Efficiency score |

## Fraud Detection Rule Engine

7 rules computed in real-time:
1. Abnormal bid velocity (>5 bids/hour) → medium
2. High withdrawal rate (>60%) → medium
3. Suspicious payout routing (>8 payouts/day) → high
4. New account + aggressive bidding (<2 days + >3 bids/hour) → high
5. Collusive bidding (same device) → critical
6. Duplicate accounts → critical
7. Location mismatch (>500km) → low

Effects: `payout_hold`, `manual_review`, `ranking_suppression`, `account_suspension`

## OmniCredit Score Model

Score range: 300–900, based on:
- OmniScore contribution (max +100)
- Completed payments × 15 (max +150)
- Completion rate × 100
- Withdrawal rate penalty
- Dispute rate penalty (−150)
- Verified identity +30, Aadhaar +20

Minimum to unlock loans: 550. Max loan: 40% of avg earnings, capped ₹50,000.

## AI Vendor Ranking Modes

4 modes selectable by enterprise buyers:
- **Balanced** — equal weight across price, compliance, trust, rating, completion, disputes
- **Lowest Cost** — 55% price weight
- **Best Compliance** — 40% compliance weight (GST/PAN/KYC/empanelment)
- **Fastest Start** — 25% completion history weight

Retail buyer sees simplified labels: Best Price · Trusted Choice · Fastest Available · Nearby Best Match

## GPS & Sustainability

- Haversine formula for distance calculation
- Carbon: 0.21 kg CO₂/km (standard vehicle)
- Labels: eco_winner (<5km) · local_match (<15km) · regional (<40km) · national
- Privacy: location auto-stops on job completion

## Demo Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Retail Buyer (admin) | buyer@demo.omnibid.in | Demo@123 | trustScore=100, admin access |
| Enterprise Buyer | enterprise@demo.omnibid.in | Demo@123 | 2 requirements, sealed auction config |
| Solo Provider | provider@demo.omnibid.in | Demo@123 | OmniScore 380 |
| Agency Provider | agency@demo.omnibid.in | Demo@123 | Crew of 12, OmniScore 620 |

## Admin Access

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

# DB push (apply schema changes)
pnpm --filter @workspace/db run push

# Seed categories (20 sectors)
pnpm --filter @workspace/db run seed

# Seed demo users + requirements + bids
pnpm --filter @workspace/db run seed-demo

# Full typecheck
pnpm run typecheck
```
