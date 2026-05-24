# API Map (Phase A)

## Auth (via Supabase)
- `POST /api/auth/register`: Initialize user in local DB after Supabase signup
- `POST /api/auth/login`: Verify user and sync session
- `GET /api/auth/me`: Get current authenticated user details

## Categories
- `GET /api/categories`: List all sectors with custom fields
- `GET /api/categories/:slug`: Detailed category config

## Requirements
- `POST /api/requirements`: Create a new problem/requirement
- `GET /api/requirements`: List requirements (role-filtered)
- `GET /api/requirements/:id`: Requirement detail

## Compliance
- `GET /api/compliance/me`: Current user compliance status
- `POST /api/compliance/upload`: Mock endpoint for doc upload

## Settings (Phase A Skeletons)
- `GET /api/settings/:role`: Get role-specific settings
- `PATCH /api/settings/:role`: Update role-specific settings

## QA/Demo
- `POST /api/qa/seed`: Trigger demo data seeding
- `GET /api/qa/health`: Platform health check
