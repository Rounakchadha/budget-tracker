# Budget Tracker — Phase 1: Gmail Ingestion Pipeline

Personal, single-user budget tracker. Phase 1 (this repo, as it stands) only
does ingestion: read transaction alert emails from Gmail, parse them, and
store them in Supabase. No frontend, notifications, or bill tracking yet —
that's Phase 2+.

## How it works

```
Gmail (gmail.readonly) → search by sender → parse (regex per sender,
  Anthropic fallback for unmatched formats) → Supabase `transactions`
  (deduped on Gmail message ID) / `unparsed_emails` (anything that fails
  both parsing paths)
```

## Project structure

```
src/
  gmail/
    client.ts        OAuth2 client + authenticated Gmail API client
    email.ts          Decodes a Gmail message into { from, subject, bodyText }
  parsers/
    axis.ts            Axis Bank parser (two templates: UPI table alerts, prose-style alerts)
    index.ts            Sender → parser registry
    types.ts            Shared types (ParsedTransaction, RawEmail)
  ai/
    fallback.ts         Anthropic-based extraction for emails no parser matches
  db/
    client.ts            Supabase client (service role key)
  scripts/
    gmail-auth.ts       One-time OAuth flow — run once to get a refresh token
    gmail-test.ts        Sanity-check Gmail auth + search query
    db-test.ts            Sanity-check Supabase connectivity/schema
    fetch-transactions.ts  Main ingestion job (--dry-run to preview without writing)
supabase/
  schema.sql              Table definitions (run manually in the Supabase SQL Editor)
```

## One-time setup

### 1. Google Cloud / Gmail API
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com), enable the **Gmail API**.
2. Configure the OAuth consent screen: External user type, add scope `.../auth/gmail.readonly`, add yourself as a **test user** (keeps the app in Testing mode — no Google verification needed for personal use).
3. Create an **OAuth client ID** of type **Desktop app**. Download the JSON, copy `client_id` and `client_secret` into `.env` (see `.env.example`).

### 2. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** and **service_role** key from Project Settings → API into `.env`.
3. Run `supabase/schema.sql` in the Supabase dashboard's SQL Editor (this repo has no Supabase CLI/MCP wired up — schema changes are applied manually).

### 3. AI fallback parser — optional, free via Groq
This app runs entirely free by default: both `GROQ_API_KEY` and `ANTHROPIC_API_KEY` are left blank in `.env`, and `fetch-transactions.ts` skips the AI fallback whenever neither is set. Any email no regex parser matches goes straight to the `unparsed_emails` table instead — check that table occasionally, and if a new format shows up, write a small regex parser for it (same as `axis.ts`).

If you want the AI fallback active:
- **Groq (recommended, free tier)** — sign up at [console.groq.com](https://console.groq.com), create an API key, add it as `GROQ_API_KEY`. Uses `llama-3.3-70b-versatile`.
- **Anthropic (paid, no free tier)** — only used if `GROQ_API_KEY` is unset and `ANTHROPIC_API_KEY` is set instead.

### 4. Install & authenticate
```
npm install
npm run auth:gmail   # opens a browser once, saves a refresh token to .env
```

## Running the pipeline

```
npx tsx src/scripts/fetch-transactions.ts --dry-run   # preview, no writes
npx tsx src/scripts/fetch-transactions.ts              # actually inserts
```

Safe to re-run — inserts are deduped on Gmail's message ID (`ON CONFLICT DO NOTHING` behavior via a unique constraint).

## Current sender coverage

- **Axis Bank** (`alerts@axis.bank.in`) — two templates handled:
  - UPI table-style alerts (`Amount Debited:` / `Transaction Info: UPI/P2M/.../merchant`)
  - Prose-style alerts (`...has been debited with INR X on DATE by DESCRIPTION`)
  - "We value your feedback" survey emails are recognized and skipped (not transactions).

No other senders (GPay, PhonePe, Amex, etc.) are wired up yet. To add one:
1. Get 3–5 real (redacted) sample emails from that sender.
2. Write a parser in `src/parsers/<sender>.ts` following `axis.ts` as a template.
3. Register it in `src/parsers/index.ts`.

## What's explicitly NOT built yet (Phase 2+)

- Frontend (planned to look like Apple Health — clean, card-based, minimal)
- Notifications
- Bill tracking
- Merchant categorization UI (the `needs_review` / `merchant_clean` / `category` columns exist in the schema but nothing writes to them yet)

## Security notes

- `.env` (tokens, keys) is gitignored — never commit it.
- Only `gmail.readonly` scope is requested.
- Full email bodies are never stored — only extracted fields plus a short snippet (`raw_email_snippet`, truncated to 500 chars) for debugging.
- Before sending an email to the Anthropic fallback, the body is truncated at the first footer/legal-boilerplate marker to avoid sending unnecessary content.
