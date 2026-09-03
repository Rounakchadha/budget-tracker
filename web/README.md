# Budget Tracker — Frontend

Next.js PWA for the budget tracker, styled after Apple Health (soft cards,
system font, generous spacing). Reads/writes the same Supabase `transactions`
table the root ingestion pipeline (`../src/`) populates.

## Features

- **Activity** (`/`) — scrollable feed of all transactions, grouped by day.
- **Review** (`/review`) — queue of transactions flagged `needs_review` (low parse confidence, e.g. bank reference codes with no readable name). Tap one to set its merchant name and category.
- **Summary** (`/summary`) — monthly spend/income totals and a category breakdown, with month navigation.
- **Reconcile** (`/reconcile`) — upload an Axis Bank statement CSV export; matches its rows against ingested transactions by amount/date/direction and shows what's missing from either side.

Tapping any transaction (Activity or Review) opens a sheet to set its merchant name and category — this writes `merchant_clean`, `category`, and clears `needs_review`.

## Architecture

- All Supabase access happens server-side, in Next.js route handlers (`src/app/api/**`), using the **service role key**. The key never reaches the browser — the frontend only ever calls its own `/api/*` routes.
- A lightweight password gate (`src/proxy.ts` — Next 16's middleware, cookie-based) protects every route except `/login`, since this will be deployed to a public Vercel URL and shows real financial data. There's one shared password (`APP_PASSWORD`), not per-user accounts — this is a single-user app.
- Categories are a fixed preset list in `src/lib/categories.ts`, not a DB table — edit that file to add/change categories.
- Statement reconciliation is stateless: each upload re-computes matches against the DB on the fly, nothing is persisted from the CSV itself.

## Setup

```
cd web
npm install
```

Create `.env.local`:
```
SUPABASE_URL=...                  # same as the root .env
SUPABASE_SERVICE_ROLE_KEY=...      # same as the root .env
APP_PASSWORD=...                    # pick your own login password
SESSION_SECRET=...                   # random string, e.g. `openssl rand -hex 32`
```

Run locally:
```
npm run dev
```

## Deploying (Vercel, free tier)

1. Push this repo to GitHub (if not already).
2. Go to [vercel.com](https://vercel.com), **New Project**, import the repo.
3. Set the **Root Directory** to `web` (important — this is a subfolder of the repo, not the repo root).
4. Add the four env vars above under Project Settings → Environment Variables.
5. Deploy. Open the URL on your iPhone in Safari → Share → **Add to Home Screen** for the PWA install.

## Statement CSV format

The reconciler auto-detects common Indian bank statement column names (`Date`/`Tran Date`, `Withdrawal Amt.`/`Debit`, `Deposit Amt.`/`Credit`, `Particulars`/`Narration`). If your actual Axis netbanking CSV export uses different headers, the upload will fail with a "couldn't recognize columns" error showing the headers it found — share those so `src/lib/statement.ts` can be updated with the real format, rather than guessing.
