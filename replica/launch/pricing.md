# Pricing

## Public pricing read on 2026-10-14

| product | what they charge | URL |
| --- | --- | --- |
| Datadog Log Management | from $0.10 per GB ingested; indexing $1.70 per million events (15-day retention, annual) or $2.55 on demand; usage over a commit billed at +50%; page text only partly read (first 100k of 235k characters) | https://www.datadoghq.com/pricing/?product=log-management |
| Better Stack Logs | free 3 GB, 3-day retention; bundles from $30/mo (EU, 40 GB, monthly) to $500/mo (700 GB); ingestion $0.10 (EU) to $0.35 (Singapore) per GB | https://betterstack.com/pricing |
| Papertrail | from $5.00 per GB per month; free tier and included GB not stated on the plans page; at the limit: stop logging or continue at up to +30% per GB | https://www.papertrail.com/plans/ |
| Lineworth (NEXORA) | Free $0 / 20 scans; Starter $9 / 150; Pro $29 / 1,500; Business $79 / 7,500; Scale $249 / 40,000; yearly -20%; no overage | https://onenexora.com/pricing |

Prices change; the date above is when they were read. These are public pages, read once by hand. They are context, not claims to put on the site.

## What this says, honestly

- The others bill by volume, so cost scales with how much you log. Lineworth bills by scans, so cost scales with how often you ask. That is the real difference, and the one to state.
- **It is not "cheaper".** A scan can be up to 5 MB. At the maximum size, Scale works out to about $1.25 per GB scanned ($249 / 200 GB), well above the $0.10 per GB ingest rates above. Lineworth wins when you need to read a few samples, not stream everything. Do not publish a "cheaper than X" claim; it would be false for heavy users.
- Evidence from reviews (replica/feedback.md, thin: 1 source): 17 of 28 comments complain about log tooling cost, including surprise bills from tools with no ingestion cap, and a hard overage uplift is exactly what two of the above sell. Lineworth's answer is a hard cap.

## Model and tiers

Keep NEXORA's published model: free plan, flat monthly price, yearly 20% off (about 2.4 months free), scans per month, hard cap, no overage. Do not change published prices from here.

Five tiers is two more than the three-tier guideline. They are live on NEXORA, so keep them, and add who each is for on the pricing page:

| tier | for |
| --- | --- |
| Free | trying it on a real log |
| Starter | one person, occasional incidents |
| Pro | a small team, custom rules |
| Business | several teams, CI on every deploy, priority support |
| Scale | heavy CI use, SLA available |

## Billing complaints fixed in the product

- No overage billing: scans pause at the cap (built, tested).
- One-click cancel: Stripe customer portal (coded; needs Stripe test keys to verify, enable cancellation in the portal settings).
- No surprise seat jumps: pricing is per organization, not per seat.
- Renewal emails: Stripe sends receipts and renewal reminders; enable "upcoming renewal" emails in Stripe settings.

## Stripe objects to create (you create them; test mode first)

Products: Lineworth Starter, Pro, Business, Scale. Prices (8): each monthly and yearly in USD. Starter $9 / $86.40, Pro $29 / $278.40, Business $79 / $758.40, Scale $249 / $2,390.40. Put the price IDs in `STRIPE_PRICE_<PLAN>_<MONTH|YEAR>`. Customer portal: allow cancel and plan switching. Webhook events as listed in replica/backend.md. NEXORA already sells these plans: confirm whether Stripe prices already exist to reuse (billing ownership question).
