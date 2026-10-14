# Brand

Date: 2026-10-14. Angle (replica/fixes.md): "paid by the scan, flat price, hard cap, ten lines each with a reason".

## Decision (2026-10-14): renamed to Lineworth

The code, copy, API key prefix (`lwk_`), Console product id (`lineworth`) and docs host (`lineworth.onenexora.com`) now say Lineworth. Internal names stay (`apps/sentinel-web`, `@anomaly/sentinel-web`) to avoid churn; rename the folder when convenient. Trademark searches for Lineworth are still **to run**.

## Why: the name "Sentinel" is a risk

"Sentinel" is also the name of **Microsoft Sentinel** (Azure's cloud security and log analytics service), **SentinelOne** (security), and HashiCorp Sentinel (policy as code). Microsoft Sentinel is in the same category as this product (cloud log analysis for security and operations), and this build borrows layout ideas from the Azure portal. That combination is the situation trademark offices and customers confuse. This is a screening concern, not a legal opinion: ask a trademark lawyer before spending on the name, and consider renaming before launch. It is cheap now, expensive after launch.

Also: the checks marked "to run" below need the trademark databases' own search pages (they are JavaScript apps I could not drive reliably). Nothing is marked clear that was not checked.

## Name candidates

Generated 20: Skimlog, Tenlog, Tenline, Logbrief, Lineworth, Readworthy, Trimlog, Keyline, Loglens, Logwise, Signalten, Linegist, Worthlog, Gistlog, Topten, Logdigest, Skimline, Lumenlog, Linepick, Clearlog. Cut to 5 for sound, spelling, no clash with the original, and fit with the angle. Dropped on sight: Logwise, Loglens, Keyline (crowded or taken).

| name | idea | .com | .io | .dev | .app | US TM | EU TM | WIPO | stores | handles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Lineworth** | "lines worth reading", echoes the existing tagline | has DNS, parked at a name broker | no DNS, whois "not found" | no DNS | no DNS | to run | to run | to run | to run | to run |
| Tenlog | ten lines of a log | for sale (Afternic) | whois "not found" | no DNS | no DNS | to run | to run | to run | to run | to run |
| Logbrief | a briefing from your logs | in use (Cloudflare) | in use | no DNS | no DNS | to run | to run | to run | to run | to run |
| Skimlog | skim a log fast | in use | whois "not found" | no DNS | in use (Vercel) | to run | to run | to run | to run | to run |
| Readworthy | what is worth reading | in use | whois "not found" | no DNS | in use (Vercel) | to run | to run | to run | to run | to run |

Domain results are from DNS and whois lookups on 2026-10-14. "No DNS" means no records, not proof the domain is free; confirm at a registrar. Nothing was bought or registered. The product does not need its own domain to launch: it lives at `sentinel.onenexora.com` (or `<name>.onenexora.com`) under NEXORA.

**Recommendation: Lineworth.** It says what the product does, is short, spells itself after one hearing, matches NEXORA's tagline, and has the cleanest domain picture. Runner-up: Tenlog. If you keep "Sentinel", at least run the trademark searches first and get a lawyer's view on Microsoft Sentinel.

### To rename later (one command, after you choose)
```bash
grep -rl "Sentinel" apps/sentinel-web/app apps/sentinel-web/components apps/sentinel-web/lib apps/sentinel-web/e2e | xargs sed -i '' 's/Sentinel/Lineworth/g'
```
Then update `<title>` and metadata in `app/layout.tsx`, the e2e tests that look for "Open Sentinel", the host name, and `replica/brand.json`. Nothing in the code was renamed yet because the name is your decision.

## Palette

Primary: deep teal `#0b7a75` (light) and `#3fb8b0` (dark). The references are blue (Microsoft `#0078d4`, Apple `#0071e3`) and purple (SentinelOne), so teal is a different family. Neutrals are cool greys; severity colours are the only warm hues. Already in `replica/design/tokens.json` and `tokens.dark.json`, both at 0 AA failures (19 pairs each). The original's colours are in `brand.json` for the sweep.

## Logo brief

- Idea: a column of log lines with one line picked out. "The line worth reading."
- Type: symbol plus wordmark. Symbol is five thin horizontal bars, the middle one heavy and bright.
- Must work at 16px (favicon): the heavy bar stays legible, the thin ones may drop out.
- Deliverables: SVG, 1024x1024 app icon, no transparency, favicon set (16, 32, 180), social image 1200x630.
- Must not resemble: Microsoft Sentinel's shield mark or any security shield (the earlier placeholder shield was replaced for this reason), the Windows four-pane logo, the Apple mark, SentinelOne's glyph. Put those next to every draft.
- Placeholder in use now: `app/icon.svg` and a Lucide "align left" glyph. Replace with the real mark.

## Voice

- **Plain, not casual.** Say the thing. No jokes in errors.
- **Exact, not cold.** Numbers and reasons, in a friendly register.
- **Calm, not cheerful.** No exclamation marks, no "Oops".

| do | don't |
| --- | --- |
| "Paste at least one log line." | "Oops! Looks like your box is empty." |
| "Nothing stood out in this sample." | "All clear! You're good to go!" |
| "You have used every scan in your plan this month." | "Uh oh, you hit your limit." |
| "Findings are shown once. Turn on retention to keep them." | "We don't store your stuff!" |
| "Sample is larger than 5 MB." | "That file is way too big." |

The ten most-seen strings (hero, primary button, empty states, quota, error, privacy note, pricing line, docs lead) are already written fresh in this voice; none echo Microsoft, Apple or any competitor.

## Sweep

`python3 replica/sweep.py . --config replica/brand.json`: clean (no Microsoft, Azure, Microsoft Sentinel, SentinelOne, their domains or colours in code, names or contents). By-eye check still to do once real assets exist: favicon, OG image, app icon, email templates (none yet).

Not checked: the word "Sentinel" itself, because it is the current product name; see the warning at the top.
