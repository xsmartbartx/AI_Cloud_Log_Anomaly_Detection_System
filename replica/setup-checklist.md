# Setup checklist: Clerk, Stripe, Console, database, host

For you to do. Claude does not create accounts, type passwords or keys, or buy anything. Do the steps in order; each ends with a check I can run once the values are in `apps/sentinel-web/.env.local`.

**Rules for keys:** put them only in `.env.local` (gitignored) and in the host's environment settings. Never paste a key into chat, a commit, a PR or an issue. Use **test mode** for Stripe and a **development** Clerk instance until step 7.

Product name in the examples: **Linegist**, host `linegist.onenexora.com`. If you change the name, change the host consistently.

---

## 0. Decide first (10 minutes)

1. **Who owns billing?** If NEXORA already has Stripe products for the Sentinel plans, reuse that Stripe account and prices; otherwise create them in step 3. The code assumes Linegist creates subscriptions itself. If NEXORA's Console should own billing instead, tell me and I will swap checkout for an entitlement lookup.
2. **Who owns the Clerk instance?** The NEXORA account site (`account.onenexora.com`) already signs people in. Linegist must use the **same Clerk instance** so one session works across `*.onenexora.com`. Ask whoever runs it before changing anything there.
3. **Name:** a trademark lawyer's view on Linegist (see `replica/brand.md`) before you spend on domains or assets.

## 1. Database (Neon or Supabase)

1. Create a **separate production** Postgres project. Turn on daily backups.
2. Copy the connection string (with `sslmode=require`). Put it in `.env.local` as `DATABASE_URL`.
3. Run migrations: `npm run db:migrate -w @anomaly/sentinel-web`. Expect `Applied: 001_init.sql`, then `Database is up to date.` on a second run.
4. For serverless hosting, use the provider's **pooled** connection string and set `PG_POOL_MAX=3` (the default is 10 per instance).

**Check:** I can run the production-build smoke test against it with `DATABASE_URL` set, using a throwaway test database, not production.

## 2. Clerk (sign-in, organizations, deletion webhook)

1. In the existing NEXORA Clerk app (or a new development instance to test first):
   - Enable **Organizations**.
   - Under **Domains**, the production instance's primary domain is `onenexora.com`. Add `linegist.onenexora.com` as an allowed origin and redirect URL.
2. Copy **Publishable key** and **Secret key** to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://account.onenexora.com/sign-in`.
4. **Webhook:** Clerk dashboard, Webhooks, add endpoint `https://linegist.onenexora.com/api/webhooks/clerk` (use a tunnel URL for local testing). Subscribe to `user.deleted` and `organization.deleted`. Copy the signing secret to `CLERK_WEBHOOK_SECRET`.
5. Roles: the app maps Clerk `org:admin` to owner and every other member to member. Members can scan but not create keys, edit rules, change settings or touch billing. If you want a middle "admin" role, tell me and I will map a custom Clerk role.

**Check, with the dev server and keys in place:** sign in; open `/app`; confirm you land on the dashboard as the right role; delete a test user in Clerk and confirm their member row disappears (`select * from members`); confirm `/app` signed out redirects to sign-in. Then the three open must-haves can be closed: SSO sign-in, the `/go` redirect, and org roles.

## 3. Stripe (test mode first)

1. Stripe account, **test mode**. Copy the secret key to `STRIPE_SECRET_KEY` (`sk_test_...`).
2. Create 4 products and 8 recurring prices in USD (yearly is monthly x12 x 0.8):

| plan | monthly | yearly | env vars |
| --- | --- | --- | --- |
| Starter | $9.00 | $86.40 | `STRIPE_PRICE_STARTER_MONTH`, `STRIPE_PRICE_STARTER_YEAR` |
| Pro | $29.00 | $278.40 | `STRIPE_PRICE_PRO_MONTH`, `STRIPE_PRICE_PRO_YEAR` |
| Business | $79.00 | $758.40 | `STRIPE_PRICE_BUSINESS_MONTH`, `STRIPE_PRICE_BUSINESS_YEAR` |
| Scale | $249.00 | $2,390.40 | `STRIPE_PRICE_SCALE_MONTH`, `STRIPE_PRICE_SCALE_YEAR` |

   Use each price's `price_...` id as the value. The free plan needs no Stripe object.
3. **Webhook:** endpoint `https://linegist.onenexora.com/api/webhooks/stripe` (or `stripe listen --forward-to localhost:3000/api/webhooks/stripe` locally; its `whsec_...` goes in `STRIPE_WEBHOOK_SECRET`). Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. **Customer portal:** Settings, Billing, Customer portal. Turn on **cancel subscription** (immediately or at period end), **update plan**, and invoice history. Turn on **upcoming renewal** emails (Settings, Billing, Subscriptions and emails).
5. Test cards: `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002` is declined.

**Check:** with keys in `.env.local`, sign in, Usage and plan, Choose Pro, pay with the test card, return; confirm the org's plan becomes `pro` (`select plan, subscription_status from organizations`). Try a second checkout while subscribed: expect the "use Manage billing" message. Cancel in the portal and confirm the plan returns to `free`. Decline test: no plan change. I can run the webhook replay and idempotency checks against your test account.

## 4. Console contract (with whoever owns the NEXORA Console)

Linegist exposes a read-only usage endpoint for the Console:

`GET https://linegist.onenexora.com/api/internal/usage?org=<clerk org id>`

Headers: `x-nexora-timestamp` (unix seconds, within 5 minutes) and `x-nexora-signature` (hex HMAC-SHA256 of `"<timestamp>.<org id>"` with the shared secret).

1. Generate a long random secret (`openssl rand -hex 32`). Give it to the Console owner through a password manager, not chat. Set it as `CONSOLE_SHARED_SECRET` here.
2. The response is `{ product, period, plan, scansUsed, scansLimit }`.
3. Agree: product id `linegist`, what the Console does with it, and whether billing for these plans lives in Stripe via Linegist or in the Console.

**Check (local, replace the values):**
```bash
TS=$(date +%s); ORG=org_demo; SIG=$(printf "%s.%s" "$TS" "$ORG" | openssl dgst -sha256 -hmac "$CONSOLE_SHARED_SECRET" -hex | awk '{print $NF}')
curl -s -H "x-nexora-timestamp: $TS" -H "x-nexora-signature: $SIG" "http://localhost:3000/api/internal/usage?org=$ORG"
```
Expect JSON; a wrong signature must return 401.

## 5. Host (Vercel)

1. Import the GitHub repo. **Root Directory:** `apps/sentinel-web`. Enable **Include source files outside of the Root Directory** (it uses `packages/detector`). Install command from the repo root (npm workspaces).
2. Set every variable from `.env.example` in the host's **Production** and **Preview** settings. Also `APP_URL=https://linegist.onenexora.com`, `CRON_SECRET` (random), and `PG_POOL_MAX`.
3. `vercel.json` already schedules `/api/cron/purge` daily; Vercel sends the `CRON_SECRET` automatically.
4. First preview deploy: confirm the build passes. The native regex module (RE2) must install on Linux; if it does not, tell me and I will switch to `re2-wasm` (one file).
5. Do **not** set `ALLOW_TEST_BILLING` in production.

## 6. DNS and redirect

Edit DNS where `onenexora.com` is managed (you, or whoever owns it):

| record | name | value |
| --- | --- | --- |
| CNAME | `linegist` | the target Vercel shows for the domain (typically `cname.vercel-dns.com`) |
| TXT | as Vercel asks | its verification value, if requested |

Add a 301 from `sentinel.onenexora.com` (and the old Lineworth host if ever used) to `linegist.onenexora.com`. Point NEXORA's product card and `/products/sentinel` at `https://linegist.onenexora.com/go`. No email DNS is needed; the app sends no email.

**Check:** `curl -I https://linegist.onenexora.com/api/health` returns 200 over HTTPS; the old host redirects.

## 7. Go-live gate (nothing here is done by me without your explicit go)

- [ ] Steps 1 to 6 verified in a preview deploy with test keys
- [ ] Trademark: lawyer's view on Linegist (Lingvist is one letter away), Canadian search
- [ ] Legal: Terms and Privacy reviewed and listing every processor (Clerk, Stripe, host, database, analytics, error tracking)
- [ ] Stripe **live** mode: recreate the 4 products and 8 prices, new live webhook and secret, one real purchase and refund
- [ ] Production Clerk instance on `onenexora.com` with the production keys
- [ ] Error tracking, uptime checks on `/` and `/api/health`, analytics (privacy-friendly), alerts to your email
- [ ] Real logo, regenerate the OG image (`app/opengraph-image.tsx`)
- [ ] You do the full flow on desktop and phone: sign in, scan, result, API key, scan by API, upgrade, cancel

## What to tell me when each step is done

"Clerk done" or "Stripe test done" is enough; the keys stay in `.env.local` on your machine. Then I run the checks above against your test accounts, fix what they find, and update `replica/parity.md` and `replica/deploy.md`.
