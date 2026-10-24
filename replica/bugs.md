# Bugs

| ID | sev | title | status |
| --- | --- | --- | --- |
| BUG-001 | S4 | Every page requests a missing favicon (404 in console) | fixed (uncommitted): app/icon.svg |
| BUG-002 | S4 | `Authorization: Bearer x` masked as `Authorization: [redacted] [redacted]` | fixed (uncommitted): redaction rule split, test added in detect.test.ts |
| BUG-003 | S2 | Dev server returned 500 on first DB use: `.data/` directory not created | fixed (uncommitted): mkdir in createPgliteDb |
| BUG-004 | S3 | Dev server kept a failed DB start cached until restart | fixed (uncommitted): failed promise cleared |
| BUG-005 | S2 | `npm run db:migrate` and `db:seed` crashed (top-level await in a CommonJS package); the production deploy step had never been run | fixed: wrapped in main(); verified on real Postgres 16, idempotent. Found by the new production smoke job |

### BUG-001: Missing favicon
- Severity: S4 · Flow: all · Screen: every · Browser: Chrome, 1440px
Steps: open `/` with devtools console.
Expected: no errors. Actual: `Failed to load resource: 404`. Evidence: f00-empty-states and F01-H1 failed on console-error guard.
Status: fixed, all 25 e2e pass.

### BUG-002: Authorization header masking
Steps: scan a line containing `Authorization: Bearer abcdef1234567890`.
Expected: `Authorization: Bearer [redacted]`. Actual: `Authorization: [redacted] [redacted]`. Evidence: failing unit test first, then fix.
Status: fixed.

### BUG-003 / BUG-004: found while smoke-testing the backend
Steps: first load of /app/keys on a clean checkout. Expected: page. Actual: 500 (ENOENT mkdir .data/pglite), and later requests kept failing until restart.
Status: fixed. The e2e run (fresh `.data/e2e`) exercises this path every time.

## To check (not reproduced)
- axe passes, but contrast of text on the translucent sticky marketing header over scrolled content was not measured.
- RE2 native module on Vercel Linux (deploy-time).
- Clerk `org:admin` to owner mapping means a plain org member cannot create keys; confirm that is the intended product rule.
- In-memory rate limiter resets per instance and on restart.
- `npm audit`: postcss advisory via Next 15 (fix needs Next 16).

## Flake fixed in CI simulation (2026-10-15)
F01-H1 failed once in a clean clone: axe reported `document-title` while the page was mid-render after a server action on a cold dev compile. Not reproduced in 5 local full runs. The a11y helper now waits for a non-empty title before scanning. If it returns in production builds, treat it as a real S3 (title missing after scan).

## Code review round 2 (2026-10-15): the six remaining findings
- Per-request Clerk call and writes: `lib/provision.ts` does reads only for a returning member and calls Clerk only when creating the member row; `requireCtx` is wrapped in React `cache()` so a request resolves it once. Unit test proves no second Clerk call and untouched rows.
- 5xx rule: needs an HTTP or `status=`/`code=` context. 429 got the same treatment. Tests for "processed 500 items" (not flagged) and real status lines (flagged).
- Role errors: revoke, toggle, delete and retention are no-ops for roles that cannot use them, and the controls are hidden or disabled. A second dev server signed in as a member (`DEMO_ROLE=member`, dev only) runs 3 e2e tests, including a forged submit.
- Lookbehind regex removed from the detector (it runs in the browser). Test fails if one returns.
- Upload dispatch is now inside `startTransition`; the upload e2e has a console-error guard. I did not confirm the old code produced a warning, so this one is a fix by reasoning, not a reproduced bug.
- Production-build coverage: `playwright.prod.config.ts` and `e2e-prod/` run against `next start` with real Postgres (CI job `e2e-prod`, Postgres 16 service). Verified locally against a Postgres 16 container.
