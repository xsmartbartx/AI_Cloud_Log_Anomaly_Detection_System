/**
 * Verifies the Stripe test-mode setup against the plan table. Prints PASS/FAIL lines only:
 * never a key, secret, price id or customer detail. Safe to paste the output anywhere.
 *
 *   npm run check:stripe -w @anomaly/sentinel-web
 */
import { loadEnvConfig } from "@next/env";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Stripe from "stripe";
import { PLANS, yearlyPrice } from "../lib/plans";

loadEnvConfig(process.cwd());

let failed = 0;
const pass = (m: string) => console.log(`PASS  ${m}`);
const fail = (m: string) => { failed++; console.log(`FAIL  ${m}`); };
const check = (ok: boolean, m: string) => (ok ? pass(m) : fail(m));

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) {
    // Existence and names only, never contents.
    const dirs = [process.cwd(), join(process.cwd(), "..", "..")];
    for (const d of dirs) {
      const found = [".env", ".env.local", ".env.development", ".env.development.local"].filter((f) => existsSync(join(d, f)));
      console.log(`INFO  env files in ${d === process.cwd() ? "apps/sentinel-web" : "repo root"}: ${found.join(", ") || "none"}`);
    }
    const names = Object.keys(process.env).filter((k) => k.startsWith("STRIPE_")).sort();
    console.log(`INFO  STRIPE_* variables the app can see: ${names.join(", ") || "none"}`);
    console.log("INFO  Next only loads apps/sentinel-web/.env.local (not the repo root). Put the keys there, or export them in this shell.");
    return fail("STRIPE_SECRET_KEY is not set");
  }
  check(key.startsWith("sk_test_"), key.startsWith("sk_live_") ? "STRIPE_SECRET_KEY is a LIVE key: use test mode" : "STRIPE_SECRET_KEY is a test key");
  if (!key.startsWith("sk_test_")) return;
  const stripe = new Stripe(key);

  try { await stripe.balance.retrieve(); pass("Stripe accepts the key"); } catch { return fail("Stripe rejected the key"); }

  check((process.env.STRIPE_WEBHOOK_SECRET ?? "").startsWith("whsec_"), "STRIPE_WEBHOOK_SECRET is set and looks like a signing secret");

  for (const plan of PLANS.filter((p) => p.monthly > 0)) {
    for (const interval of ["month", "year"] as const) {
      const name = `STRIPE_PRICE_${plan.id.toUpperCase()}_${interval === "month" ? "MONTH" : "YEAR"}`;
      const id = process.env[name] ?? "";
      if (!id) { fail(`${name} is not set`); continue; }
      try {
        const price = await stripe.prices.retrieve(id, { expand: ["product"] });
        const want = Math.round((interval === "month" ? plan.monthly : yearlyPrice(plan)) * 100);
        const product = price.product as Stripe.Product;
        const problems: string[] = [];
        if (!price.active) problems.push("price is archived");
        if (price.currency !== "usd") problems.push(`currency is ${price.currency}`);
        if (price.unit_amount !== want) problems.push(`amount is ${price.unit_amount} cents, expected ${want}`);
        if (price.recurring?.interval !== interval) problems.push(`interval is ${price.recurring?.interval ?? "one-time"}, expected ${interval}`);
        if (price.recurring?.interval_count !== 1) problems.push("interval count is not 1");
        if (!product.active) problems.push("product is archived");
        check(problems.length === 0, problems.length ? `${name}: ${problems.join("; ")}` : `${name}: ${plan.name} ${interval}ly $${want / 100} OK`);
      } catch { fail(`${name}: Stripe could not find that price in test mode`); }
    }
  }

  const need = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed"];
  const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
  const best = hooks.data.map((h) => ({ h, missing: need.filter((e) => !h.enabled_events.includes("*") && !h.enabled_events.includes(e as never)) })).sort((a, b) => a.missing.length - b.missing.length)[0];
  if (!best) fail("no webhook endpoint exists in test mode (a local `stripe listen` forwarder is fine for dev)");
  else {
    check(best.missing.length === 0, best.missing.length ? `webhook endpoint at ${new URL(best.h.url).host} is missing events: ${best.missing.join(", ")}` : `webhook endpoint at ${new URL(best.h.url).host} has all 5 events`);
    check(best.h.status === "enabled", "webhook endpoint is enabled");
  }

  const portals = await stripe.billingPortal.configurations.list({ limit: 5, active: true });
  const portal = portals.data.find((p) => p.is_default) ?? portals.data[0];
  if (!portal) fail("no active customer portal configuration (save the portal settings in the dashboard)");
  else {
    check(portal.features.subscription_cancel.enabled, "portal: customers can cancel their subscription");
    check(portal.features.subscription_update.enabled, "portal: customers can switch plans");
    check(portal.features.invoice_history.enabled, "portal: invoice history is on");
  }
}

main()
  .catch((e) => { failed++; console.log(`FAIL  unexpected error: ${e instanceof Error ? e.message.replace(/(sk|rk|whsec)_[A-Za-z0-9_]+/g, "[redacted]") : "unknown"}`); })
  .finally(() => {
    console.log(failed ? `\n${failed} check(s) failed.` : "\nAll Stripe checks passed.");
    process.exit(failed ? 1 : 0);
  });
