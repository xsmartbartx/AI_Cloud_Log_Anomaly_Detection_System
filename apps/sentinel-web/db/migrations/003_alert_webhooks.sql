-- One outgoing alert webhook per organization. The payload carries counts and a link, never log text.
create table alert_webhooks (
  org_id uuid primary key references organizations(id) on delete cascade,
  url text not null,
  kind text not null default 'json' check (kind in ('json','slack')),
  min_severity text not null default 'high' check (min_severity in ('critical','high','medium','low')),
  secret text not null,                 -- signs the JSON payload (x-linegist-signature)
  enabled boolean not null default true,
  last_status text,                     -- 'ok', 'http 500', 'error: ...'
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
