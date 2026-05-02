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

## Key Design Decisions

- **Reverse auction**: Buyers set a max budget; providers bid lower to win
- **No Supabase**: Pure JWT auth, bcryptjs for password hashing
- **Contract-first**: OpenAPI spec → codegen → Zod schemas + React Query hooks
- **7 categories**: Healthcare, Logistics, Legal, Travel, Tech & IT, Education, Home Services
- **Subscription plans**: Free (5 bids/mo), Starter ₹499 (30 bids/mo), Pro ₹999 (unlimited)

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Buyers and providers; roles: buyer/provider/both |
| `categories` | 7 service categories with custom dynamic fields + `priceFloor` |
| `requirements` | Buyer-posted problems; `isRecurring`, `recurringInterval`, `depositAmount` |
| `bids` | Provider bids; `executorType` (self/partial), `subcontractorName`, `isHighlighted` (new provider boost) |
| `reviews` | Star ratings post-completion |
| `provider_subscriptions` | Plan management (free/starter/pro) |
| `notifications` | In-app notification system |
| `disputes` | Dispute resolution between buyers and providers |

## Features

### Core
- Reverse auction bidding (price goes down)
- 7 service categories with category-specific dynamic fields
- Provider subscription tiers (Free / Starter / Pro)
- JWT authentication, buyer and provider dashboards
- Live notifications system

### Strategic Features (v2)
1. **Dispute Resolution** — Buyer or provider can raise a dispute on any requirement. Respondent can reply with evidence; admin can resolve (buyer_wins / provider_wins / mutual). `/disputes` page in nav.
2. **Anti-Ghost-Contractor Declaration** — Every bid requires executor declaration: "I'll do it myself" or "Partial sub-work". Shown as a badge on requirement detail.
3. **Price Floors per Category** — Each category has a minimum bid price (Healthcare ₹500, Legal ₹1000, Logistics ₹200, Travel ₹500, Tech ₹500, Education ₹200, Home ₹200). Warning shown if bid is below floor.
4. **New Provider Boost** — Providers with fewer than 10 total bids are automatically highlighted (`isHighlighted=true`), shown with a gold badge "New — Highlighted".
5. **Recurring Requirements** — Buyers can mark a requirement as recurring (daily/weekly/fortnightly/monthly). One-click repost clones the requirement with a fresh auction window.
6. **Buyer Deposit Tracking** — Requirements with budget > ₹10,000 show a 10% deposit amount on the detail page as a trust signal.

## Routes (Backend — `/api/*`)

- `POST /auth/register` — Register with role (buyer/provider/both)
- `POST /auth/login` — Login, returns JWT token
- `GET /auth/me` — Get current user (requires auth)
- `GET /categories` — List all 7 categories
- `GET /requirements` — List open requirements (filterable)
- `POST /requirements` — Create new requirement (buyer); supports `isRecurring`, `recurringInterval`
- `GET /requirements/my` — Buyer's own requirements
- `GET /requirements/:id` — Requirement detail with all bids
- `POST /requirements/:id/accept-bid` — Accept a winning bid
- `POST /requirements/:id/cancel` — Cancel a requirement
- `POST /requirements/:id/repost` — Repost a recurring requirement with fresh auction window
- `GET /requirements/stats/:id` — Bid statistics for a requirement
- `GET /requirements/:requirementId/bids` — List bids (sortable)
- `POST /requirements/:requirementId/bids` — Place a bid (provider); requires `executorType`
- `POST /bids/:id/withdraw` — Withdraw a bid
- `GET /bids/my` — Provider's own bids
- `POST /reviews` — Submit a review
- `GET /users/:id/reviews` — Get reviews for a user
- `GET /users/:id` — Public user profile
- `PATCH /users/:id/update` — Update own profile
- `GET /notifications` — Current user's notifications
- `POST /notifications/mark-read` — Mark notifications read
- `GET /subscriptions/my` — Provider subscription status
- `POST /subscriptions/upgrade` — Upgrade plan
- `GET /dashboard/buyer` — Buyer stats + recent requirements
- `GET /dashboard/provider` — Provider stats + recent bids
- `GET /disputes` — List disputes for current user
- `POST /disputes` — Raise a dispute
- `POST /disputes/:id/respond` — Respondent replies to dispute
- `POST /disputes/:id/resolve` — Resolve dispute (admin/buyer)

## Frontend Pages

- `/` — Home with hero, category grid, live requirements feed, how-it-works
- `/login` — Login form
- `/register` — Registration with role picker
- `/requirements` — Browse open requirements (filterable)
- `/requirements/new` — Post a new requirement (buyer); recurring toggle + interval picker
- `/requirements/:id` — Requirement detail; executor badge, dispute button, repost button, deposit info
- `/bid/new/:requirementId` — Place a bid; executor declaration, price floor warning
- `/dashboard/buyer` — Buyer stats, recent requirements
- `/dashboard/provider` — Provider stats, subscription status, recent bids
- `/profile/:id` — Public user profile with reviews
- `/notifications` — Notification inbox
- `/subscriptions` — Provider plan upgrade page
- `/disputes` — Raise, respond to, and resolve disputes

## Color Theme

- **Primary**: Deep indigo/blue (`226 58% 39%`)
- **Accent**: Amber/orange (`38 92% 50%`)
- **Background**: White

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)

## Codegen

To regenerate API clients after changing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB Operations

```bash
# Push schema changes to DB
pnpm --filter @workspace/db run push

# Seed categories (includes price floors)
pnpm --filter @workspace/db exec tsx src/seed.ts
```
