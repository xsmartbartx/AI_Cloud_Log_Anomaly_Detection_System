-- Rules can now mute lines as well as flag them. 'flag' is the existing behaviour.
alter table rules add column kind text not null default 'flag' check (kind in ('flag','ignore'));
create index on rules (org_id, kind);
