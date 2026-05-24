# Environment Setup Guide

This document explains each environment variable required for OmniBid India and where to obtain them.

## Core Variables

### `DATABASE_URL`
- **Purpose**: PostgreSQL connection string for Drizzle ORM.
- **Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`
- **Source**: Local Postgres instance or managed service (RDS, Supabase DB).

### `SUPABASE_URL` & `SUPABASE_ANON_KEY`
- **Purpose**: Frontend and backend authentication via Supabase.
- **Source**: Supabase Project Dashboard -> Settings -> API.

### `SESSION_SECRET`
- **Purpose**: Signing cookie sessions and JWTs (as backup).
- **Source**: Generate a long random string.

## Integrations

### `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- **Purpose**: Processing payments and escrow.
- **Source**: Razorpay Dashboard -> Settings -> API Keys.

### `WHATSAPP_ACCESS_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`
- **Purpose**: Sending bid alerts and receiving WhatsApp bids.
- **Source**: Meta for Developers -> WhatsApp -> Getting Started.

### `OPENAI_API_KEY`
- **Purpose**: Powering AI Vendor Ranking and bid summarization.
- **Source**: OpenAI Dashboard.

## Storage & Monitoring

### `FILE_STORAGE_ACCESS_KEY` & `SECRET_KEY`
- **Purpose**: Uploading compliance docs (Aadhaar, GST).
- **Source**: AWS IAM or S3-compatible provider.

### `SENTRY_DSN`
- **Purpose**: Error tracking and performance monitoring.
- **Source**: Sentry.io Project Settings.
