# Architecture: Sentinel (standalone product + client dashboard)

Date: 2026-10-13. Inputs: replica/recon.md, replica/features.csv. Defaults chosen by the user ("go with defaults").

## Shape

```
onenexora.com  (marketing, other repo)         sentinel.onenexora.com  (this repo, apps/sentinel-web)
  /products/sentinel  --"Open Sentinel"-->       /            marketing landing   (S01, S02, S03)
                                                 /app/*       client dashboard    (S05-S12), Clerk-protected
account.onenexora.com (Clerk, shared SSO) <----- sign-in, session shared across *.onenexora.com
```

One Next.js app, one Postgres. No microservices. The streaming platform in docs/SPECIFICATION.md is deferred (Connect phase); its tables (feature_windows, anomalies, model_versions, alert_policies, log_sources) are NOT in v1.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js App Router + TypeScript | one deploy for marketing + app + API |
| styling | Tailwind + tokens (replica-design) | tokens drive the Azure/Apple look |
| db | Postgres (Neon or Supabase) | already Postgres in this repo |
| ORM | Prisma (already in packages/db-client) | reuse; schema replaced by replica/schema.sql |
| auth | Clerk, orgs enabled | account.onenexora.com is already the NEXORA sign-in; cookies shared on parent domain |
| payments | Stripe Checkout + Billing + customer portal | monthly/yearly plans exist; NEXORA Console shows usage |
| jobs | Vercel Cron | sample purge, period rollover not needed (period key) |
| hosting | Vercel | sentinel.onenexora.com as custom domain |
| detection | in-process TypeScript module (packages/detector) | stateless, pure function, unit-testable |

Assumption to confirm: Sentinel creates Stripe subscriptions itself with metadata `product=sentinel`; the NEXORA Console reads the same Stripe customer. If NEXORA already owns billing, replace Stripe routes with an entitlement lookup.

## Repo layout

```
apps/sentinel-web/        Next.js (marketing + dashboard + API routes)
packages/detector/        parse -> rules -> outliers -> rank (pure, no IO)
packages/db-client/       Prisma schema regenerated from replica/schema.sql
packages/shared-types/    keep, trim to Finding/Scan/Severity
packages/config/          keep
```

## Detector (the core loop)

1. Split lines (cap 50,000 lines / 5 MB; reject above).
2. Normalise each line to a shape (mask numbers, UUIDs, IPs, timestamps, hex).
3. Rule pass: built-in keyword rules (fatal, panic, oom, segfault, error, exception, timeout, refused, denied, unauthorized, 5xx) plus org rules (regex, length-capped, safe execution).
4. Outlier pass: frequency of shapes; rare shapes score higher (score = 1 - freq/maxfreq, smoothed).
5. Combine: severity weight + outlier score, dedupe by shape, return top 10 with reason.
6. Redact secrets in returned text (tokens, passwords, keys) before storing or showing in history.

Deterministic: same input, same output. This is the trust story.

## Schema

See `replica/schema.sql`. 9 tables: organizations, members, rules, scans, findings, api_keys, usage_counters, webhook_events, audit_logs.

Access: every query takes `orgId` from the verified Clerk session and filters by it; there is no query path without it. API keys resolve to an org via sha256 lookup.
Hard constraints in the DB: unique (org_id, period) usage row, atomic conditional increment (quota cannot be exceeded by concurrent scans), unique (scan_id, rank), check constraints on plan, severity, reason.

## Routes

| method path | what | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET / | landing | public | - | page | F01 |
| GET /pricing | plans | public | - | page | F03 |
| GET /docs/* | docs | public | - | page | F04 |
| GET /go | redirect gate from NEXORA, preserves session, then /app | public | ?ref | 302 | F01 |
| GET /app | overview | member | - | usage, recent scans | F02 |
| GET /app/scan, POST action runScan | scan | member | text or file | scanId | F01 |
| GET /app/scans, /app/scans/[id] | history, result | member (own org) | - | scans, findings | F02 |
| POST action setFeedback | mark finding | member | findingId, value | ok | F02 |
| GET /app/rules, actions create/update/delete rule | rules | admin | name, pattern, severity | rule | F05 |
| GET /app/usage | quota and plan | member | - | counters | F03 |
| POST /api/billing/checkout | Stripe Checkout session | admin | plan, interval | url | F03 |
| POST /api/billing/portal | customer portal | admin | - | url | F03 |
| GET /app/keys, actions create/revoke | keys | admin | name | key shown once | F04 |
| GET /app/settings, actions | org, members, retention toggle | admin | - | - | F02 |
| POST /api/v1/scans | API scan | API key | {text} | {id, findings[]} | F04 |
| GET /api/v1/scans/{id} | API result | API key | - | scan | F04 |
| POST /api/webhooks/stripe | subscription events | Stripe signature | event | 200 | F03 |
| POST /api/webhooks/clerk | org and membership sync, deletion | Svix signature | event | 200 | F02 |
| GET /api/health | health | public | - | ok | - |

19 routes/actions. Jobs: Vercel Cron daily, purge retained samples older than 30 days; delete orphaned data for deleted orgs.

## The parts that bite

- **Quota races:** conditional upsert in one statement; charge only after validation, refund on server error.
- **Idempotency:** webhook_events primary key; insert first, skip if exists. Stripe and Clerk both retry.
- **Cross-subdomain auth:** Clerk production instance with primary domain onenexora.com; cookies on `.onenexora.com`. Verify the redirect_url allow-list. Dev uses a separate Clerk dev instance.
- **ReDoS:** custom regexes are length-capped and run via a safe engine (RE2 via `re2` package) with a time limit.
- **Privacy:** stateless by default. Sample text is not persisted unless retention is on; findings keep line numbers and shape, text only if retention on. Redact secrets either way. Never log request bodies.
- **Large input:** 5 MB / 50k lines cap, streamed read for uploads; return 413 with the limit.
- **Time zones:** all timestamptz UTC; quota period is the UTC month; show in the user's zone.
- **Rate limits:** per-key and per-IP limit on /api/v1 and public scan; per-org on web.
- **Billing/Console sync:** usage_counters is the source of truth; expose to NEXORA Console via a signed read endpoint (open question).
- **GDPR:** Clerk user deletion webhook removes member rows; org deletion cascades.
- **Abuse:** free plan scans need sign-in (no anonymous scans) to protect quota.

## Build order

1. **Vertical slice:** Clerk sign-in, POST runScan (detector v0: keyword rules + outliers), result page, usage counter. Screens S04 S06 S07, tables organizations members scans findings usage_counters.
2. **Must-haves:** landing S01, pricing S02, dashboard S05, usage S10, /go redirect S14, Stripe checkout and webhook, plan quotas, redaction, Console usage endpoint.
3. **Should-haves:** history S08, upload, export, API keys + REST S11, docs S03, custom rules S09, team S12, upgrade flow, status link.
4. **Could-haves:** feedback, sample retention opt-in, webhook alerts, format auto-detect.
5. **Entrepreneur fixes** after /replica-entrepreneur.

## Risks (top three)

1. Shared sign-in and redirect handoff across the NEXORA repo: depends on code I cannot see.
2. Detection quality: a weak top-10 kills trust; needs a labelled sample corpus and tests.
3. Billing ownership split between Sentinel and the NEXORA Console.
