-- Lineworth standalone v1. Postgres 15+. Access rule: one authorisation check per query in the data layer
-- (every query is scoped by org_id from the Clerk session). No RLS: Prisma connects as one role.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text not null,
  plan text not null default 'free' check (plan in ('free','starter','pro','business','scale')),
  billing_interval text not null default 'month' check (billing_interval in ('month','year')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,                        -- mirrors Stripe: active, past_due, canceled...
  retain_samples boolean not null default false,   -- opt-in only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  clerk_user_id text not null,
  email text not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, clerk_user_id)
);
create index on members (clerk_user_id);

create table rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,  -- null = built-in
  name text not null,
  pattern text not null,                       -- case-insensitive regex, length-capped, run with a timeout
  severity text not null check (severity in ('critical','high','medium','low')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(pattern) <= 200)
);
create index on rules (org_id);

create table scans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  api_key_id uuid,                              -- fk added below
  source text not null check (source in ('web','api')),
  line_count integer not null check (line_count >= 0),
  byte_count integer not null check (byte_count >= 0),
  flagged_count integer not null default 0,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on scans (org_id, created_at desc);
create index on scans (member_id);

create table findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,  -- denormalised for scoped queries
  rank smallint not null check (rank between 1 and 10),
  line_no integer not null,
  text text not null,                           -- rows exist only when organizations.retain_samples (redacted line); never the full sample
  severity text not null check (severity in ('critical','high','medium','low')),
  reason text not null check (reason in ('rule','outlier')),
  rule_id uuid references rules(id) on delete set null,
  score numeric(5,4) not null,
  feedback text check (feedback in ('true_positive','false_positive')),
  created_at timestamptz not null default now(),
  unique (scan_id, rank)
);
create index on findings (scan_id);
create index on findings (org_id, severity);
create index on findings (rule_id);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references members(id) on delete set null,
  name text not null,
  prefix text not null,                         -- first 8 chars, shown in UI
  key_hash text not null unique,                -- sha256 of the key; key shown once
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on api_keys (org_id);
alter table scans add constraint scans_api_key_fk foreign key (api_key_id) references api_keys(id) on delete set null;
create index on scans (api_key_id);

-- Quota. Charge atomically:
--   insert into usage_counters (org_id, period, scans_used) values ($1, $2, 1)
--   on conflict (org_id, period) do update set scans_used = usage_counters.scans_used + 1, updated_at = now()
--   where usage_counters.scans_used < $limit  returning scans_used;   -- no row = over quota
create table usage_counters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  period char(7) not null check (period ~ '^\d{4}-\d{2}$'),   -- UTC month
  scans_used integer not null default 0 check (scans_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, period)
);

create table webhook_events (                    -- idempotency for Stripe and Clerk
  id text primary key,                           -- provider event id
  provider text not null check (provider in ('stripe','clerk')),
  received_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on audit_logs (org_id, created_at desc);
