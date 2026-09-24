create extension if not exists "pgcrypto";

create table transactions (
  id uuid primary key default gen_random_uuid(),
  email_message_id text not null unique,
  amount numeric not null,
  currency text not null default 'INR',
  direction text not null check (direction in ('debit', 'credit')),
  merchant_raw text not null,
  merchant_clean text,
  category text,
  source text not null,
  transaction_date timestamptz not null,
  parsed_confidence text not null check (parsed_confidence in ('high', 'low')),
  needs_review boolean not null default true,
  raw_email_snippet text,
  created_at timestamptz not null default now(),
  -- Money passing through you, not real income/expense (split-bill repayments,
  -- paying/getting paid back for someone else, refunds). Excluded from
  -- Total Received/Total Spent, still counted in Net Balance since it did
  -- move money. transfer_note is a free-text label, e.g. "Vihaan".
  is_transfer boolean not null default false,
  transfer_note text,
  -- Overrides which month (format 'YYYY-MM') this transaction counts toward
  -- in Summary/dashboard totals — for salary etc. landing near month-end
  -- but conceptually belonging to the next month. Null = use transaction_date.
  attributed_month text,
  -- Hidden everywhere (Activity, Review, Summary, dashboard totals) without
  -- being deleted — the record and its history stay intact, just invisible.
  archived boolean not null default false
);

create index on transactions (transaction_date desc);
create index on transactions (needs_review) where needs_review;

create table unparsed_emails (
  id uuid primary key default gen_random_uuid(),
  email_message_id text not null unique,
  source_guess text,
  reason text not null,
  raw_email_snippet text,
  created_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  due_date date not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index on bills (paid, due_date);

-- Singleton row: the balance you last told the app, and when. Net Balance
-- is computed as this + all transactions after `as_of` — so editing it
-- re-anchors the calculation and everything after keeps deriving automatically.
create table account_balance (
  id text primary key default 'singleton',
  balance numeric not null,
  as_of timestamptz not null default now()
);

-- "Rename this vendor permanently" rules. sample_raw anchors a fuzzy-match
-- comparison (see web/src/lib/similarity.ts) against merchant_raw on any
-- future uncategorized transaction — matches get merchant_clean/category
-- pre-filled but stay needs_review=true pending a one-time confirmation.
create table merchant_rules (
  id uuid primary key default gen_random_uuid(),
  sample_raw text not null,
  merchant_clean text not null,
  category text not null,
  created_at timestamptz not null default now()
);

-- Manual IOU ledger (Splitwise-like, entirely self-hosted — no external API).
create table splits (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  amount numeric not null,
  direction text not null check (direction in ('i_owe', 'owed_to_me')),
  description text,
  date date not null default current_date,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  -- When settling links to the actual bank transaction that paid it back,
  -- so the split and the transaction stop being two disconnected ledgers.
  linked_transaction_id uuid references transactions(id) on delete set null
);

create index on splits (person_name, settled);
