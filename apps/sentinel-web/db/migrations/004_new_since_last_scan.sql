-- Opt-in "new since last scan". Off by default. Only salted hashes of the latest scan's finding shapes are kept
-- (never log text), one row per org, replaced on every scan and deleted when the option is turned off.
alter table organizations add column track_new boolean not null default false;
create table scan_baseline (
  org_id uuid primary key references organizations(id) on delete cascade,
  salt text not null,
  hashes text[] not null default '{}',
  updated_at timestamptz not null default now()
);
