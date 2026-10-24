# Test plan

Date: 2026-10-14. Target: local Sentinel (apps/sentinel-web) with a fresh PGlite database per run. Run: `npm run test:e2e -w @anomaly/sentinel-web` (Playwright, installed Chrome), `npm test -w @anomaly/sentinel-web` (store and export, 12), `npm test -w @anomaly/detector` (8).
Every e2e spec fails on console errors, page errors and 5xx (except where a case expects one) and runs an axe WCAG 2 A/AA scan.

| case | what | result |
| --- | --- | --- |
| F01-H1 | landing to Open Sentinel to scan to result | pass |
| F01-E1 | empty input errors, not charged | pass |
| F01-E2 | double click charges once | pass |
| F01-E3 | 6,000-char line, accents, CJK, emoji | pass |
| F01-E4 | secrets masked in results | pass |
| F01-E5 | clean log shows "Nothing stood out" | pass |
| F01-E6 | over 50,000 lines rejected | pass |
| F01-E7 | finding expands by keyboard | pass |
| F01-E8 | refresh mid-flow | pass |
| F01-E9 | 390px: no horizontal scroll on 10 pages | pass |
| F02-E1 | empty states on a fresh org (4 screens) | pass |
| F02-H1 | overview to history to scan detail | pass |
| F02-H2 | retention on keeps masked findings, off stops | pass |
| F02-N1 | unknown or malformed scan id is 404 | pass |
| F02-A1 / A2 | axe on 8 screens light, 10 screens dark | pass |
| F03-H1 | pricing yearly toggle ($29 to $23.20/mo) | pass |
| F03-N1 | checkout with billing unconfigured says so | pass |
| F03-N2 | current plan marked | pass |
| F04-H1 | create key, scan by API, key never echoed, revoke then 401 | pass |
| F04-N1 | missing or wrong key is 401 | pass |
| F04-N2 | key name validation | pass |
| F04-N3 | unsigned Stripe, Clerk, Console, cron calls refused | pass |
| F05-N1 | invalid and over-long rule patterns rejected | pass |
| F05-H1 | custom rule flags a line, off stops it, delete | pass |
| F08-H1/E1/E2 | secrets masked in the browser: absent from the request body (paste and file), present when masking is off | pass |
| F08-H2 | download CSV (formula-safe) and JSON | pass |
| F09 | member role: can scan, no key/rule/retention controls, forged submit is a no-op (second dev server) | pass |
| prod | production build + real Postgres: public pages, /design 404, fails closed, API scan/charge/401/413/400/402, unsigned webhooks | pass (local Postgres 16) |
| unit | charge, refund, concurrent quota, retention, tenant isolation, roles, RE2, key hash, Stripe idempotency, cascade delete | pass |

## Not covered, needs the user's services or a human

- Sign-in, sign-out, expired session, org switching, signed-out redirect from /go (Clerk keys needed). Second user's data is covered at the data layer, not through real sessions.
- Stripe checkout end to end, declined card `4000 0000 0000 0002`, portal cancel, webhook delivery (Stripe test account needed).
- Console usage call with a valid signature.
- Two tabs at once, offline, slow network, screen reader pass, real mobile device, Safari and Firefox (only Chrome tested).
- Visual review of light theme in a browser (axe checks contrast; not looked at by eye).
- Detection quality on real logs (needs a labelled corpus).
