# Parity report

Date: 2026-10-14. Baseline: NEXORA's current public Sentinel (onenexora.com/products/sentinel, sentinel.onenexora.com, pricing page). Public pages only; the logged-in Console and `/app` were not viewed.

## Feature parity: 82.7 / 100 (see `python3 replica/parity.py replica/features.csv`)

Must-haves: 9 of 12 done, 3 partial (all blocked on the user's accounts, not on code):

| must-have | state | what unblocks it |
| --- | --- | --- |
| Sign in via NEXORA SSO | coded, untested | Clerk keys, production instance on onenexora.com |
| Redirect from NEXORA product card | `/go` works, session check untested | same Clerk setup, plus the NEXORA site pointing "Open Sentinel" at `sentinel.onenexora.com/go` |
| Usage reported to NEXORA Console | endpoint coded, untested | `CONSOLE_SHARED_SECRET`, a Console caller |

Weakest areas: auth, handoff, integration (all above), results export (not built), team members (read-only), billing (coded, needs Stripe).

## Layout diff

Not run. There is no reference screenshot set: the original is your own product, which this build deliberately redesigns (Azure-style app shell, Apple-style marketing), and the diff tool ignores colour but not structure, so a low score here would be the point, not a defect. Use `imgdiff.py --mode pixel` for clone-against-clone regressions once screenshots are saved in `replica/clone-screens/`.

## Behaviour differences against the current Sentinel

| flow | current Sentinel (public info) | new Sentinel | decision |
| --- | --- | --- | --- |
| Product entry | card on onenexora.com, app at `/app` on subdomain | same entry, own site with landing, pricing, docs, dashboard | keep |
| Scan | paste, run, ~10 lines, stateless | same, plus file upload, example sample, expandable reasons | keep |
| Result | "ranked by severity" | rank, severity, rule or outlier reason, line number, secrets masked | keep |
| Usage | logged in Console, Usage view | dashboard quota meter + Console endpoint (unproven) | verify with Console owner |
| Plans | Free 20 ... Scale 40,000 scans | identical limits and prices; yearly -20% | keep |
| API | docs mention quickstart | `POST /api/v1/scans` with keys | verify the doc page at docs.onenexora.com matches |
| Storage | nothing stored | counts only; masked findings only if org opts in | keep, state it on the site |
| Click count | not measurable without login | landing to result: 5 clicks first time, 2 after (New scan, Run) | at target |

## Verdict: not shippable

Reason: 3 must-haves are not done (they need Clerk, the Console and the NEXORA site change). No open S1 or S2 bug. Once Clerk is live and verified, the score is about 88 and the verdict becomes shippable. "Better than the original" needs the replica-entrepreneur fixes.

## Top five to do next

1. Create the Clerk app and verify sign-in, the signed-out `/go` redirect and org roles (unblocks 2 must-haves).
2. Agree the Console contract (usage endpoint, who owns Stripe) and run it once with a real signature.
3. Stripe test mode: prices, webhook, one real checkout and cancel.
4. Export results (copy / JSON / CSV) on the result screen.
5. Read-only members list to a real list from Clerk, with invites linked to the NEXORA organization page.
