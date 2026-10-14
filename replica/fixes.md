# Fixes and positioning

Date: 2026-10-14.

## How much evidence this is

28 Hacker News comments (2016 to 2026), one source, no star ratings, collected through HN's public Algolia search API. They are about log platforms in general (Splunk, Datadog, CloudWatch, Papertrail, ELK), not about paste-a-sample tools, because Sentinel is too new to have reviews and I found no direct competitor reviews I could read within the rules. Every theme is therefore **thin** (one source). Read this as a direction, not a ranking. Before betting the roadmap: add App Store/G2/Capterra/Trustpilot reviews of Datadog Logs, Papertrail, Better Stack and similar, plus Reddit threads, via the browser, at human speed. `replica/reviews.csv` takes more rows; rerun `python3 replica/reviews.py replica/reviews.csv --themes replica/themes-logs.json --out replica/feedback.md`.

Counter-evidence exists and is kept in the sheet: one commenter says Datadog log ingest "isn't too expensive" (45921416), and others say logs are worth the money (48588932).

## 1. What they hate

| # | problem | comments | sources | quotes |
| --- | --- | --- | --- | --- |
| 1 | Log tooling gets expensive, often by volume, with surprise bills (thin) | 17 | 1 | "Found it super useful but it got really expensive." [12683098](https://news.ycombinator.com/item?id=12683098) · "Cloudwatch can also get ludicrously expensive." [37587389](https://news.ycombinator.com/item?id=37587389) · CloudWatch Logs "has no ingestion rate limits" [23136582](https://news.ycombinator.com/item?id=23136582) |
| 2 | Noise and false positives from anomaly tools (thin) | 5 | 1 | "...to basically inundate people with false positives." [17506703](https://news.ycombinator.com/item?id=17506703) · "The signal-to-noise ratio in CI logs is brutal though." [47195036](https://news.ycombinator.com/item?id=47195036) |
| 3 | Nobody knows which lines are worth reading or keeping (thin) | 3 | 1 | "We cut down a lot of unnecessary logging and sent only the things that were needed." [20707738](https://news.ycombinator.com/item?id=20707738) |
| 4 | AI will be wrong, and users want a way to correct it (thin) | 2 | 1 | "No matter how good your AI, it will make mistakes." [23491097](https://news.ycombinator.com/item?id=23491097) |

## 2. What is missing

- "there's no great smart AI log analysers to reduce the signal:noise" ([18997944](https://news.ycombinator.com/item?id=18997944), quoted again in [18993600](https://news.ycombinator.com/item?id=18993600): one idea, counted once). 2019, so dated.
- "Still I haven't found an alternative with instant text search and infinite scroll." ([32111214](https://news.ycombinator.com/item?id=32111214)). Search is not Sentinel's job; listed so it is not mistaken for a gap.

## 3. What is unsolved

- Small teams that need to read a log **once, now** (a failed deploy, a CI run) are served by platforms built for continuous ingest, billed by volume. Evidence: the cost theme plus the CI comment. Thin.
- Engineers already paste stack dumps into chatbots ([46035322](https://news.ycombinator.com/item?id=46035322)) and worry about leaking secrets while doing it ([47335836](https://news.ycombinator.com/item?id=47335836), written by someone selling a tool for it). 2 comments: a hypothesis to test, not a trend.

## Fix plan (evidence times cheapness)

| # | change | size | skill | evidence | added to features.csv |
| --- | --- | --- | --- | --- | --- |
| 1 | Spend guarantee: flat per-scan price, hard cap, no overage, stated on landing and pricing | S | /replica-launch | cost, 17 | yes |
| 2 | Mark finding useful or not, then "ignore lines like this" (exclude rule per org; store rule id or shape hash, not text) | M | /replica-build | noise 5, what-to-read 3, AI mistakes 2 | yes (feedback row raised to should) |
| 3 | Mask secrets in the browser before the sample leaves the machine (detector runs client-side) | M | /replica-build | paste-into-AI, 2 | yes |
| 4 | Show why every line was chosen (already built) and keep the top-ten cap visible | done | n/a | noise, AI trust | no |
| 5 | New since last scan (compare shape hashes to the previous scan) | L | /replica-build | what-to-read, 3 | yes, could; needs a privacy decision |

Pricing complaints (1) go to `/replica-launch`. Not planned: search UX, long-term storage, dashboards over time. That is a different product and the reviews show why it costs so much.

## Angle: pick one

A. **Cost.** For small teams who get billed by the gigabyte just to read a log, Sentinel is paid by the scan: flat price, hard cap, nothing stored. Evidence: cost, 17 comments, 1 source.
B. **Noise.** For engineers burned by anomaly tools that cry wolf, Sentinel returns ten lines and says why each was picked, and lets you mute the ones that are not. Evidence: noise, 5 comments, 1 source.
C. **Safe to paste.** For engineers who already paste logs into chatbots, Sentinel masks secrets before anything leaves the browser. Evidence: 2 comments. Weakest.

**Recommend A with B as the proof.** A matches what Sentinel already does and what NEXORA's pricing already says (flat scan tiers, no overage), so it costs nothing to claim and nothing to fake. B is the product promise behind it. Skip C until it has more evidence. This drives `/replica-brand` and `/replica-launch`.

Rules kept: no quote above goes on the landing page (reviewers are research, not testimonials); no competitor is named in the product name, ads or store text; a factual comparison page is a question for a lawyer in your country.
