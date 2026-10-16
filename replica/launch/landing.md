# Landing page (built: apps/sentinel-web/app/(marketing)/page.tsx)

Voice: plain, exact, calm. Angle A (cost) with B (noise, reasons) as proof. No testimonials, user counts, press logos or "trusted by": none exist. No competitor or reviewer named or quoted.

1. **Hero.** "The ten lines worth reading." / "Paste a log sample and get the lines that matter, with the reason for each. Flat price per scan. A hard cap instead of an overage bill. Nothing stored by default." / buttons: Open Lineworth, Read the docs. Below: an example result card, labelled "Example" (static, not a real customer scan).
2. **Why this exists** (top two hate themes, paraphrased): reading one log should not need a pipeline and a volume-based bill; a flagged line with no reason is noise.
3. **How it works:** Paste, Analyze, Review.
4. **What you get** (only what exists today): paid by the scan, every line has a reason, nothing kept by default, your own rules, API for CI. Then a "Coming next" box: mute lines, mask in the browser, new since last scan; deeper AI and live connections further out, "none available yet".
5. **Pricing:** the five NEXORA tiers, scans per month, no overage.
6. **Questions:** is this a log platform (no), what happens at the limit, do you keep my logs, how big, is it deterministic.
7. **Final call:** "Try it on a real log", free plan 20 scans.

Not claimed because not built: muting, browser-side masking, baseline compare, Console usage, SSO. Not on the page: anything cheaper-than-X claim (see pricing.md for why).

Contrast: the page uses only design tokens; all text pairs pass AA (`python3 replica/design/contrast.py replica/design/tokens.json`, light and dark) and the e2e axe scan covers `/` in both themes.
