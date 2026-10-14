# Deploy

Date: 2026-10-14. **Verdict: NO-GO.** Preflight was run locally. Nothing was deployed, bought, signed up for or configured on any external service. No live keys exist or were handled.

## Step 1: preflight results

| check | result |
| --- | --- |
| End-to-end tests (Playwright, Chrome) | pass, 25 of 25 (last clean full run, no code changes since besides items below) |
| App unit tests / detector tests | pass, 10 of 10 / 8 of 8 |
| Typecheck and production build | pass |
| Feature parity | 82.7 / 100; must-haves 9 of 12 done. **FAIL: 3 open** (Clerk sign-in, NEXORA redirect session check, Console usage) |
| Rebrand sweep | pass (clean) |
| Listing check | pass (0 errors, 0 warnings); web product, stores not in use |
| Open S1 or S2 bugs | none |
| `npm audit --omit=dev` | pass: 0 vulnerabilities after upgrading to Next 16.4.0 (2026-10-14); 25 of 25 e2e and 10 of 10 store tests re-run green on it; `middleware.ts` migrated to `proxy.ts` |
| Production fails closed | pass: `NODE_ENV=production` without Clerk or database returns 500 on `/app`, not the demo user |
| `/design` showcase hidden in production | fixed in this run (404 in prod); `robots.txt` added (blocks /app, /api, /go, /sign-in) |
| Trademark screening for "Lineworth" | **NOT RUN** |
| Privacy policy and terms pages | **FAIL**: NEXORA's pages are marked as an unreviewed draft; the policy must list Clerk, Stripe, the host, the database and any analytics/error tracker |
| Cookie banner | none built. Only essential cookies (Clerk session) today; add a banner if analytics with non-essential cookies are used in EU/UK |
| Account deletion | coded via Clerk webhook (user.deleted, organization.deleted); **untested against Clerk** |
| Favicon, titles, OG image | ours: generated 1200x630 OG image (`app/opengraph-image.tsx`) with metadata; placeholder mark, real logo still to do |
| Real logo | placeholder only |

Blockers to clear before any go: the 3 must-haves, trademark screening, reviewed legal pages. (npm audit fix and OG image: done.)

## What changed in the repo for deploy
Only `app/design/layout.tsx` and `app/robots.ts`. Nothing is committed or pushed (the repo has uncommitted work and no deploy remote configured from here). When you want it, say so and I will commit; the host connection is yours.

## Step 2: production services (all done by you)

1. **Database:** create a separate production Postgres (Neon or Supabase), turn on daily backups. Set `DATABASE_URL`. Run `npm run db:migrate -w @anomaly/sentinel-web` as a deploy step (it applies `db/migrations/001_init.sql`).
2. **Clerk:** production instance with primary domain `onenexora.com` (cookies shared across subdomains), organizations enabled. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`https://account.onenexora.com/sign-in`). Webhook endpoint `https://lineworth.onenexora.com/api/webhooks/clerk`, events `user.deleted`, `organization.deleted`, secret in `CLERK_WEBHOOK_SECRET`. Add `lineworth.onenexora.com` to allowed redirect URLs. NEXORA's own site/Console share this instance, so coordinate with whoever owns it.
3. **Stripe:** test mode first, end to end (checkout, decline `4000 0000 0000 0002`, portal cancel). Then live mode: create the 4 products and 8 prices from `replica/launch/pricing.md`, set `STRIPE_PRICE_*`, `STRIPE_SECRET_KEY`, a webhook at `https://lineworth.onenexora.com/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` and its secret in `STRIPE_WEBHOOK_SECRET`. Customer portal: cancellation on, plan switching on, renewal emails on. Do one real purchase and refund it. Confirm first whether NEXORA already has these prices and owns billing.
4. **Other env vars:** `APP_URL=https://lineworth.onenexora.com`, `CRON_SECRET` (random), `CONSOLE_SHARED_SECRET` (random, shared with the Console owner). Do not set `ALLOW_TEST_BILLING` in production.
5. **Email:** Lineworth sends none itself. Clerk and Stripe send theirs; verify Clerk's sender domain if you customise it.

## Step 3: host and domain

- **Host:** Vercel. Import the repo; Root Directory `apps/sentinel-web`; enable "Include source files outside of the Root Directory" (it uses `packages/detector`); install from the repo root (npm workspaces). `vercel.json` already schedules `/api/cron/purge` daily; set `CRON_SECRET` so Vercel sends it. `main` deploys, pull requests get previews.
- **RE2 native module:** confirm the first preview build installs it on Linux; if not, switch to `re2-wasm` (one file: `lib/store.ts`).
- **DNS (at the registrar that holds onenexora.com; you edit it):**

| record | name | value |
| --- | --- | --- |
| CNAME | `lineworth` | the target Vercel shows for the domain (typically `cname.vercel-dns.com`) |
| TXT | as asked by Vercel | the verification value, if requested |

  Keep `sentinel.onenexora.com` as a redirect (301) to `lineworth.onenexora.com` so existing links work; do that in Vercel's domain settings or at NEXORA's host. Update NEXORA's product card and `/products/sentinel` to point at `lineworth.onenexora.com/go`. No email DNS (SPF/DKIM/DMARC) is needed for this app, since it sends no mail.
- HTTPS is automatic on Vercel; check it. One canonical host: `lineworth.onenexora.com`.

## Step 4: watch it

None installed yet. Before launch: error tracking (Sentry or Vercel's), uptime checks on `/` and `/api/health`, log retention (never log sample text; the app does not), a privacy-friendly analytics tool, and an alert to your email. Add the processors to the privacy policy.

Then do the core flow on the live site yourself (sign in, paste, scan, result, API key, scan by API, upgrade, cancel) and on a phone.

## First week
- Scans per day, quota-hit rate, 4xx/5xx on `/api/v1/scans`.
- Stripe webhook failures and any `past_due` orgs.
- Clerk deletions actually removing rows.
- The in-memory rate limiter resets per instance: watch for abuse; move to Redis if seen.
- Ask the first ten users which lines they ignore (feeds the mute feature).

## Step 5: mobile
Not applicable. Lineworth is a web product; no TestFlight or Play steps.

## Go checklist (say "go" per step; I will not do any of it unprompted)
1. ~~Next security upgrade, OG image~~ done.
2. Run trademark screening; lawyer view on the name.
3. Clerk production setup, then verify sign-in and the three open must-haves in a preview deploy.
4. Stripe test-mode run, then live-mode setup.
5. Legal pages reviewed and linked.
6. Production DB, env vars, DNS, redirect from `sentinel.onenexora.com`.
7. Monitoring on, core flow tested by you on desktop and phone.
8. Announce (replica/launch/launch-plan.md).
