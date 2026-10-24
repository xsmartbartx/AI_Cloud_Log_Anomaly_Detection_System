# Linegist

Paste a log sample, get the ten lines worth reading, with a reason for each. Flat price per scan, a hard cap instead of an overage bill, nothing stored by default.

Linegist is a NEXORA product (formerly a card on onenexora.com, earlier named Sentinel, then Lineworth). **Status: built and tested, not deployed.** See [Before go-live](#before-go-live).

## What it does

- **Scan:** paste or upload up to 50,000 lines or 4 MB. Built-in rules plus frequency analysis return a ranked top ten, each with the rule or "unusual shape" that picked it and its line number. The same input always gives the same output.
- **Privacy:** samples are analysed and discarded. Secrets are masked in the browser before sending and again on the server. Findings are kept only if an organization turns retention on, with secrets masked, for 30 days.
- **Dashboard:** usage and plan, history, custom rules, "ignore lines like this" (stores only a pattern), API keys, roles (owners and admins manage; members scan), settings.
- **API:** `POST /api/v1/scans` with a Bearer key. See `/docs` in the app.
- **Billing:** Free (20 scans a month), Starter, Pro, Business, Scale, monthly or yearly. Scans pause at the limit; there is no overage billing.

## Layout

| path | what |
| --- | --- |
| `apps/sentinel-web` | the Next.js app: marketing site, dashboard, API, webhooks (folder name predates the product name) |
| `packages/detector` | the pure detector: rules, outlier scoring, secret masking, ignore patterns |
| `replica/` | planning and evidence: recon, architecture, design tokens, backend notes, test plan, parity, brand and trademark screening, launch, deploy, setup checklist |
| `packages/db-client`, `packages/shared-types`, `packages/config`, `docs/` | the earlier streaming-platform spec (Kafka, Elasticsearch, models). Not part of Linegist today; kept as the roadmap's "Connect" phase |

## Run it locally

Needs Node 22 or newer. No accounts or database are required: dev mode uses an in-process Postgres (PGlite) and a demo user.

```bash
npm ci
npm run dev -w @anomaly/sentinel-web        # http://localhost:3000
```

Useful variants: `DEMO_ROLE=member` signs in as a member, `DEMO_PLAN=scale` starts the demo org on the biggest plan. Both only apply in development.

## Test

```bash
npm test -w @anomaly/detector                 # detector unit tests
npm test -w @anomaly/sentinel-web             # store, billing, auth, export, pattern tests
npm run test:e2e -w @anomaly/sentinel-web     # Playwright (uses your installed Chrome); 38 tests incl. axe in light and dark
npm run test:e2e:prod -w @anomaly/sentinel-web  # production build against a real Postgres (needs DATABASE_URL, migrations applied)
npm run check:stripe -w @anomaly/sentinel-web   # checks your Stripe test setup; prints pass/fail only, never keys
```

CI (`.github/workflows/ci.yml`) runs the unit tests, build, typecheck, `npm audit` on production dependencies, the e2e suite, and the production-build smoke against Postgres 16 on every PR.

## Configure

Copy `apps/sentinel-web/.env.example` to `apps/sentinel-web/.env.local` and fill it in. Keys go only there and in the host's settings, never in git. Full step-by-step for Clerk, Stripe, the Console contract, database, host and DNS: [`replica/setup-checklist.md`](replica/setup-checklist.md). Production requires Clerk and `DATABASE_URL`; without them the app refuses to start rather than falling back to the demo user.

Database migrations are plain SQL in `apps/sentinel-web/db/migrations`, applied with `npm run db:migrate -w @anomaly/sentinel-web`.

## Before go-live

Everything that does not need an account is done. Still open, and needs people or accounts:

- Clerk sign-in, the `/go` redirect from NEXORA and organization roles tested against a real instance
- Stripe checkout, portal, cancel and webhooks tested against a real test account (products and prices exist in the NEXORA test sandbox; ids and keys go in `.env.local`)
- The NEXORA Console contract for the signed usage endpoint (`GET /api/internal/usage`)
- A trademark lawyer's view on the name (see [`replica/brand.md`](replica/brand.md): no exact match at USPTO, EUIPO or WIPO, one letter from Lingvist; Canada not searched)
- NEXORA's Terms and Privacy reviewed, listing every processor
- A real logo, production database, host and DNS

Details: [`replica/deploy.md`](replica/deploy.md) and [`replica/parity.md`](replica/parity.md).

## License

Proprietary. See [`LICENSE`](LICENSE).
