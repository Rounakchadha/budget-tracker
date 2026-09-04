# Budget Tracker — Frontend

Next.js PWA for the budget tracker, styled after Apple Health (soft cards,
system font, generous spacing). Reads/writes the same Supabase `transactions`
table the root ingestion pipeline (`../src/`) populates.

## Features

- **Activity** (`/`) — dashboard stats (total received, total spent, net balance, bills to pay) plus a scrollable feed of all transactions, grouped by day. Total received/spent are all-time sums from ingested transactions. Net Balance defaults to that same net cash flow (labeled "Net Balance (est.)") until you tap it and set your real current balance — from then on it's anchored: shown as "Balance", computed as that value plus every transaction since the moment you set it (`account_balance` table). Re-tap it anytime to re-anchor.
- **Bills** (`/bills`, linked from the "Bills to Pay" stat) — manually add bills (name, amount, due date), mark paid/unpaid, delete. Simple list, no recurring/auto-generation.
- **Splits** (`/splits`, linked from the "You're Owed"/"You Owe" stat) — manual Splitwise-like IOU ledger (Splitwise's real API is Pro-only now, so this is self-hosted instead): add entries per person (amount, direction, what for), grouped by person with a running net, settle individually or all-at-once per person. No external account/API involved.
- **Review** (`/review`) — queue of transactions flagged `needs_review` (low parse confidence, e.g. bank reference codes with no readable name). Tap one to set its merchant name and category.
- **Summary** (`/summary`) — monthly spend/income totals and a category breakdown, with month navigation.
- **Reconcile** (`/reconcile`) — upload an Axis Bank statement CSV export; matches its rows against ingested transactions by amount/date/direction and shows what's missing from either side.

Tapping any transaction (Activity or Review) opens a sheet to set its merchant name and category — this writes `merchant_clean`, `category`, and clears `needs_review`. Checking "Apply to similar transactions" there does two things: relabels other transactions with a matching/similar `merchant_raw` (free local fuzzy string matching, `src/lib/similarity.ts` — no AI API call), and saves a `merchant_rules` row so future transactions from that vendor get auto-suggested. Auto-suggested matches are pre-filled but land in Review with `needs_review: true` rather than being silently applied, since fuzzy matching can occasionally be wrong — one tap to confirm. Rules are applied lazily (`applyPendingMerchantRules` in `src/lib/merchant-rules.ts`, called from `GET /api/transactions`) rather than by the ingestion pipeline, so `../src/` stays untouched.

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

## Instant ingestion (Gmail push)

By default, transactions only appear after the root project's local poller (`../src/scripts/fetch-transactions.ts`, run every 5 min via `launchd`) runs. `/api/gmail/webhook` + `/api/gmail/watch` add a second, near-instant path: Gmail notifies a Google Cloud Pub/Sub topic the moment a new email lands, Pub/Sub pushes it to `/api/gmail/webhook`, which diffs the mailbox history and inserts anything the fast regex Axis parser (`src/lib/gmail-webhook/`) recognizes — usually within a few seconds of the email arriving.

This is additive, not a replacement: the webhook only has the regex parser (no AI fallback, to stay fast), so anything it can't parse is left for the local poller to catch on its next run (both paths insert with `email_message_id` as a unique key, so there's no double-counting either way).

**One-time setup** (needs a Google Cloud project — the same one your `GOOGLE_CLIENT_ID` OAuth client lives in — and the app deployed to Vercel first, since Pub/Sub needs a public HTTPS URL to push to):

1. In Google Cloud Console for that project: enable the **Cloud Pub/Sub API**.
2. Create a Pub/Sub topic, e.g. `gmail-tx-notifications`.
3. On that topic, grant **Pub/Sub Publisher** to the principal `gmail-api-push@system.gserviceaccount.com` (this is Gmail's own service account — required for any Gmail watch to publish to your topic).
4. Create a **push subscription** on the topic:
   - Endpoint URL: `https://<your-vercel-domain>/api/gmail/webhook`
   - Enable authentication — pick/create a service account for this, set it as the subscription's push auth service account, and set the **audience** to the endpoint URL above (or any fixed string, as long as it matches `PUBSUB_PUSH_AUDIENCE` below).
5. In Vercel project settings, add env vars:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` — same values as the root `.env`
   - `GMAIL_PUBSUB_TOPIC` — full resource name, e.g. `projects/<gcp-project-id>/topics/gmail-tx-notifications`
   - `PUBSUB_PUSH_SERVICE_ACCOUNT` — the service account email from step 4
   - `PUBSUB_PUSH_AUDIENCE` — the audience string from step 4
   - `CRON_SECRET` — any random string (`openssl rand -hex 32`); Vercel automatically sends this as a bearer token on Vercel Cron requests once it's set, which `/api/gmail/watch` checks
6. Deploy. `vercel.json` schedules `/api/gmail/watch` daily (Gmail watches expire after 7 days) — but it won't have run yet, so kick it off once manually: `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<your-vercel-domain>/api/gmail/watch`.

From then on, new Axis alert emails should show up in the app within seconds. If nothing shows up, check the Vercel function logs for `/api/gmail/webhook` — most likely cause is a mismatched `PUBSUB_PUSH_AUDIENCE`/`PUBSUB_PUSH_SERVICE_ACCOUNT` (401s) or the subscription's endpoint URL being wrong.

## Statement CSV format

The reconciler auto-detects common Indian bank statement column names (`Date`/`Tran Date`, `Withdrawal Amt.`/`Debit`, `Deposit Amt.`/`Credit`, `Particulars`/`Narration`). If your actual Axis netbanking CSV export uses different headers, the upload will fail with a "couldn't recognize columns" error showing the headers it found — share those so `src/lib/statement.ts` can be updated with the real format, rather than guessing.
