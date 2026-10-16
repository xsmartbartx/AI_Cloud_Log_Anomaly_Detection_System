# Recon map: Sentinel standalone product (web)

Scope: Spin Sentinel (AI Cloud Log Sentinel) out of the NEXORA marketing/platform site into its own product site + client dashboard at sentinel.onenexora.com. NEXORA keeps a product card and redirects clients in.
For: the user's own business (NEXORA). SMB devs/SREs/small SOC teams who want fast log triage.
Date: 2026-10-13

This is a split of the user's own product, not a clone of someone else's. Azure and Apple are design-pattern references only (layout, nav, hierarchy). No assets, copy, icons or fonts are taken.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | NEXORA home | https://onenexora.com | "Build. Secure. Operate." Nav: Platform, Products, Marketplace, Solutions, Pricing, Developers, Labs, Company |
| 2 | Products | https://onenexora.com/products | 5 products, all Beta: Sentinel, CSPM, Gateway, Vigilo, NeuraWall |
| 3 | Sentinel page | https://onenexora.com/products/sentinel | Paste sample, get ~10 lines. Stateless. Rules + statistical outliers. AI + live connections = roadmap |
| 4 | Sentinel landing (exists) | https://sentinel.onenexora.com | Hero, 3 steps (Paste/Analyze/Review), "What's real today", roadmap. App at /app |
| 5 | Pricing | https://onenexora.com/pricing | Sentinel: Free $0/20, Starter $9/150, Pro $29/1500, Business $79/7500, Scale $249/40000 scans/mo; yearly -20% |
| 6 | Console | https://console.onenexora.com | 307 to account.onenexora.com/sign-in (SSO). Usage view mentioned |
| 7 | Repo | this repo, docs/SPECIFICATION.md, docs/CONTEXT.md, Prisma schema | Planned full pipeline (ingest, features, model, alerts). Only packages/ exist, no apps/ |
| 8 | ChatGPT share link | chatgpt.com/share/6acdf8b8... | NOT READABLE: page is JS-rendered, only title returned ("Analiza AI_Cloud_Log_Anomaly_Detection_System"). Needs pasted text or export |
| 9 | Design refs | Azure portal, Apple.com | Patterns only: left-rail resource nav, blade/breadcrumbs, quiet product-page hero, big type, whitespace |

Not reachable without login: the live Console, Docs site, API. Not logged in; no credentials requested.

## Core loop

Paste a log sample, run it, get the ten lines worth reading with severity and reason.

## Current state vs. target

- Today: Sentinel is one product card on NEXORA; a thin landing + /app tool exists on a subdomain; stateless; auth via NEXORA account (Clerk-style SSO); usage metered in NEXORA Console.
- Repo: spec for a large streaming anomaly platform (Kafka, ES, models). Zero apps built. Only types, config and a Prisma schema (14 tables, multi-tenant).
- Gap: the live product (paste-and-scan, rules + outliers) and the repo (streaming ML platform) are different products. Target: ship the paste-scan product as the real v1; keep the streaming platform as roadmap (Connect phase).

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Product landing | / | Pitch Sentinel as its own product | hero, 3-step cards, what's real today, pricing teaser, CTA | default, mobile |
| S02 | Pricing | /pricing | Plans and quotas | plan table, monthly/yearly toggle, FAQ | default |
| S03 | Docs/Quickstart | /docs (or docs.onenexora.com) | How to use, API | sidebar, code blocks | default |
| S04 | Sign in / SSO | account.onenexora.com/sign-in | Shared NEXORA identity | Clerk form | default, error |
| S05 | Dashboard overview | /app | Scans this month, quota meter, recent scans, top findings | stat tiles, quota bar, recent table | empty, filled, quota-exhausted |
| S06 | New scan | /app/scan | Paste/upload sample, run | textarea, file drop, run button, limits hint | empty, loading, error (too large) |
| S07 | Scan result | /app/scans/:id | Ranked flagged lines with reason | finding list, severity chips, rule/outlier tag, copy/export | filled, no-findings |
| S08 | Scan history | /app/scans | Past scans (metadata, optional stored) | table, filters | empty, filled |
| S09 | Rules | /app/rules | View/toggle keyword rules, custom rules (should) | rule list, editor | default |
| S10 | Usage and plan | /app/usage | Quota, plan, upgrade | meter, plan card, billing link | default, over-quota |
| S11 | API keys | /app/keys | Keys for API scans | key table, create modal | empty, filled |
| S12 | Settings and team | /app/settings | Org, members, retention toggle | form, member table | default |
| S13 | Status link | status.onenexora.com | External | - | - |
| S14 | Redirect gate | onenexora.com/products/sentinel to sentinel.onenexora.com | Handoff from NEXORA | CTA, session carry-over | signed-in, signed-out |

## Flows

```
F01 Visitor tries Sentinel from NEXORA
    S14 NEXORA product card -> S01 landing -> S04 sign in -> S06 new scan -> S07 result
    happy path clicks: 5 (card, Open, sign in, Run, view)
    edge: signed-in already (skip S04), quota exhausted, sample too large, empty paste

F02 Returning client reviews activity
    S04 -> S05 overview -> S08 history -> S07 result
    edge: no scans yet (empty state), org with several members

F03 Client upgrades
    S05/S10 quota warning -> S02 pricing -> checkout (NEXORA billing) -> S10
    edge: payment fails, yearly vs monthly

F04 Developer scans via API
    S11 create key -> curl POST /v1/scans -> S07 result
    edge: revoked key, rate limit

F05 Tune rules (should)
    S09 -> toggle/add rule -> S06 rescan
```

Beat: paste to result in 2 clicks once signed in.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Top nav (Apple-style slim) | marketing, app | default, scrolled | S01-S03 |
| Left rail + breadcrumb (Azure-style) | collapsed, expanded | active, hover | S05-S12 |
| Button | primary, secondary, ghost, danger | default, hover, focus, disabled, loading | all |
| Stat tile | number, delta | loading, empty | S05, S10 |
| Quota meter | normal, warn, full | - | S05, S10 |
| Log paste area | mono, line numbers | empty, filled, error | S06 |
| Finding row | critical, high, medium, low | collapsed, expanded | S07 |
| Severity chip | 4 levels | - | S05, S07, S08 |
| Data table | sortable, filterable | empty, loading | S05, S08, S11, S12 |
| Modal / toast / empty state | - | - | all app screens |
| Plan card | current, recommended | - | S02, S10 |

## Inferred data model

```
Organization  id, clerk_org_id, name, plan, created_at
              evidence: SSO account, "organisation" in Sentinel copy; repo Tenant
              confidence: high
Member        user_id (Clerk), org_id, role (owner|admin|member)
              evidence: repo User/Role, S12; confidence: medium (Clerk may own it)
Scan          id, org_id, user_id, source (web|api), line_count, flagged_count, duration_ms, created_at, sample_ref? (nullable)
              evidence: usage in Console, "nothing is stored"; confidence: high for metadata, guess for storing samples (default OFF)
Finding       id, scan_id, line_no, text (redacted/optional), severity, reason (rule|outlier), rule_id, score
              evidence: "ranked by severity", rules+outliers; confidence: high
Rule          id, org_id|null (null=built-in), name, pattern, severity, enabled
              evidence: "keyword rules"; confidence: medium
ApiKey        id, org_id, name, hash, last_used_at, revoked_at; confidence: medium
UsageCounter  org_id, period (YYYY-MM), scans_used; evidence: quotas; confidence: high
AuditLog      from repo; confidence: medium
```

Relationships: Organization 1-n Member, Organization 1-n Scan, Scan 1-n Finding, Organization 1-n Rule, Organization 1-n ApiKey, Organization 1-1 UsageCounter per period.
Repo's feature_windows, anomalies, model_versions, alert_policies, log_sources are for the streaming phase; keep dormant.

## Feature matrix

See `features.csv`.

## Out of scope (cannot or should not be built now)

- Live cloud log connections, streaming, Kafka/ES pipeline (roadmap "Connect" phase)
- LLM/deep-learning analysis (roadmap; needs a model decision)
- Compliance claims (SOC2 etc.): NEXORA says no badge wall; keep honest
- Shared NEXORA billing/identity internals: integrate, don't rebuild (account.onenexora.com owns them)
- Microsoft/Apple logos, icons, fonts (SF), copy: take layout principles only

## Open questions for the user

1. ChatGPT share link was unreadable. Paste the key parts or export it.
2. Where is NEXORA's codebase (separate repo)? Redirect and shared SSO depend on it.
3. Is sentinel.onenexora.com/app current code yours, and is it in this repo? (repo has no apps/)
4. Stack for the new site: default proposal Next.js + Clerk (matches account.onenexora.com) + Postgres/Prisma (already here) + Stripe.
5. Store pasted samples? Default: no, metadata only.

## Size

Screens 14, flows 5, entities 8. Hard parts: shared SSO and session handoff with NEXORA, usage metering/billing sync with NEXORA Console, a detection engine that earns trust (rules + outliers, explainable). Size: M (few weeks) for paste-scan site + dashboard; the streaming platform is XL, deferred.
