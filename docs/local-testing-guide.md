# Local Testing Guide

## Prerequisites
- Node.js 18+
- pnpm (installed via `npx pnpm`)
- PostgreSQL instance
- Supabase Project (for Auth)

## Setup
1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in:
    - `DATABASE_URL`
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
3. Install dependencies:
   ```bash
   npx pnpm install
   ```
4. Push Database Schema:
   ```bash
   pnpm --filter @omnibid/db run push
   ```
5. Seed Data:
   ```bash
   pnpm --filter @omnibid/db run seed
   pnpm --filter @omnibid/db run seed-demo
   ```

## Running the Platform
Start both servers simultaneously:
```bash
pnpm dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **QA Dashboard**: [http://localhost:3000/qa](http://localhost:3000/qa)

## Running Tests
```bash
pnpm run typecheck
# Phase A API Tests (Coming Soon)
# Phase A E2E Tests (Coming Soon)
```
