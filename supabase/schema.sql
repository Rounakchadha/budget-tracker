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
  created_at timestamptz not null default now()
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
