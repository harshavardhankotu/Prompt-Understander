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
- **Backend**: Express 5, Pino logger, bcryptjs, jsonwebtoken
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
| `categories` | 7 service categories with custom dynamic fields |
| `requirements` | Buyer-posted problems with auction end time |
| `bids` | Provider bids on requirements; can be highlighted |
| `reviews` | Star ratings post-completion |
| `provider_subscriptions` | Plan management (free/starter/pro) |
| `notifications` | In-app notification system |

## Routes (Backend — `/api/*`)

- `POST /auth/register` — Register with role (buyer/provider/both)
- `POST /auth/login` — Login, returns JWT token
- `GET /auth/me` — Get current user (requires auth)
- `GET /categories` — List all 7 categories
- `GET /requirements` — List open requirements (filterable)
- `POST /requirements` — Create new requirement (buyer)
- `GET /requirements/my` — Buyer's own requirements
- `GET /requirements/:id` — Requirement detail with all bids
- `POST /requirements/:id/accept-bid` — Accept a winning bid
- `POST /requirements/:id/cancel` — Cancel a requirement
- `GET /requirements/stats/:id` — Bid statistics for a requirement
- `GET /requirements/:requirementId/bids` — List bids (sortable)
- `POST /requirements/:requirementId/bids` — Place a bid (provider)
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

## Frontend Pages

- `/` — Home with hero, category grid, live requirements feed, how-it-works
- `/login` — Login form
- `/register` — Registration with role picker
- `/requirements` — Browse open requirements (filterable)
- `/requirements/new` — Post a new requirement (buyer)
- `/requirements/:id` — Requirement detail with live bids, accept bid
- `/bid/new/:requirementId` — Place a bid (provider)
- `/dashboard/buyer` — Buyer stats, recent requirements
- `/dashboard/provider` — Provider stats, subscription status, recent bids
- `/profile/:id` — Public user profile with reviews
- `/notifications` — Notification inbox
- `/subscriptions` — Provider plan upgrade page

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

# Seed categories
pnpm --filter @workspace/db exec tsx src/seed.ts
```
