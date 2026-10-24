# Backend

Date: 2026-10-14. Everything below runs locally with no accounts. Pieces that need the user's own Clerk and Stripe projects are coded and unit-tested but not exercised against the real services.

## What exists

| area | state |
| --- | --- |
| Database | Postgres via `pg` (prod) or PGlite (dev/tests, no server). SQL migration `apps/sentinel-web/db/migrations/001_init.sql` (= replica/schema.sql), runner `npm run db:migrate -w @anomaly/sentinel-web`, seed `db:seed`. Deviation from the plan: raw SQL instead of Prisma (Prisma 7 vs 5 mismatch in this repo, and the atomic quota upsert is plainer in SQL). `packages/db-client` is untouched (streaming roadmap). |
| Access rules | Every query scoped by `org_id` from the verified session. `lib/authz.ts` is the one "can this role do this" function. Test: a second org gets nothing back and cannot revoke, toggle or delete another org's key or rule. |
| Auth | Clerk (`lib/auth.ts`, provider, middleware, `/api/webhooks/clerk` for user/org deletion). Org and member rows are created on first sight. No Clerk keys: demo user, dev only; production refuses to run without Clerk. Mapping: Clerk `org:admin` = owner, `org:member` = member, no org = personal workspace owner. |
| Quota | Atomic conditional upsert; concurrent scans cannot exceed the plan (tested); invalid input is refunded. |
| Privacy | Full samples are never stored. Findings stored (secrets masked) only if the org turns retention on; purged after 30 days by cron. Request bodies are never logged. |
| API | `POST /api/v1/scans` with Bearer key (sha256 stored, shown once), zod-validated, per-key and per-IP rate limits. Verified: 200, 401, 400. |
| Payments | `/api/billing/checkout`, `/api/billing/portal` (owner only), `/api/webhooks/stripe` (signature check, idempotent by event id; handles subscription created/updated/deleted, `invoice.payment_failed`, `checkout.session.completed`). Plan and status live in our DB. Test key refused in production. |
| Console | `GET /api/internal/usage` HMAC-signed (5 min window). |
| Email | None sent by Sentinel in v1. Clerk sends sign-in emails, Stripe sends receipts. Resend not needed yet. |
| Jobs | Vercel Cron `/api/cron/purge` daily, `CRON_SECRET`. |

## Tests

`npm test -w @anomaly/sentinel-web`: 10 pass (charge, no-charge on invalid, concurrent quota, retention redaction, tenant isolation, roles, RE2 safety, key hashing, Stripe idempotency and plan mapping, cascade deletion). `npm test -w @anomaly/detector`: 7 pass.

## What the user must do (Claude does not create accounts or keys)

1. Create a Clerk app (production instance on onenexora.com, organizations on). Fill `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (account.onenexora.com/sign-in), and `CLERK_WEBHOOK_SECRET` (endpoint `/api/webhooks/clerk`, events user.deleted, organization.deleted).
2. Create a Stripe account in test mode: 4 paid plans x month/year prices (8), put IDs in `STRIPE_PRICE_*`; webhook endpoint `/api/webhooks/stripe` with the 5 events above; Customer Portal enabled with cancellation on.
3. Create a Postgres (Neon or Supabase), set `DATABASE_URL`, run `npm run db:migrate -w @anomaly/sentinel-web`. Turn on daily backups.
4. Set `APP_URL`, `CRON_SECRET`, `CONSOLE_SHARED_SECRET` (share the last with the NEXORA Console).
All names are in `apps/sentinel-web/.env.example`.

## Checklist

- [x] secrets only in env vars; `.env*.local` and `.data/` in .gitignore; nothing secret in client bundles (only the publishable Clerk key is `NEXT_PUBLIC_`)
- [x] input validated on the server (zod on API, actions, billing)
- [x] authorisation on every read and write, tested with a second org
- [x] rate limits: scan action, API per key and IP, checkout. Not on sign-up (Clerk handles). In-memory: swap for Redis/Upstash before relying on it across instances
- [x] webhooks verify signatures (Stripe, Clerk/svix); Console endpoint verifies HMAC
- [x] uploads: 5 MB cap, text read in memory only, nothing stored
- [x] no user data in URLs; no sample text in logs
- [ ] dependencies audited: `npm audit --omit=dev` shows 2 (postcss via next 15, moderate/high). Fix needs Next 16 (breaking); upgrade before deploy
- [ ] privacy policy lists processors (Clerk, Stripe, host, DB): NEXORA's draft Terms and Privacy are unreviewed by a lawyer
- [ ] Clerk, Stripe and Console paths exercised against the real services
- [ ] backups confirmed on the production DB

## Risks and notes

- RE2 is a native module. Vercel installs prebuilt binaries for Linux; confirm on the first preview deploy (fallback: `re2-wasm`).
- PGlite dev data lives in `apps/sentinel-web/.data` (gitignored).
- Console usage and billing ownership are still the open question from architecture: if NEXORA owns Stripe, replace the checkout routes with an entitlement lookup.
- Stripe 23 and Clerk 7 were newer than my reference knowledge; they typecheck and build, but the real-service paths are the first thing to test.
