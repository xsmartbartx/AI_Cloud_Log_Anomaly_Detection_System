import Stripe from "stripe";
import { PLANS, type PlanId } from "./plans";
import type { Db } from "./db";

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  if (process.env.NODE_ENV === "production" && key.startsWith("sk_test_") && process.env.ALLOW_TEST_BILLING !== "1") {
    throw new Error("Test Stripe key in production. Use live keys at deploy.");
  }
  return new Stripe(key);
}

export type Interval = "month" | "year";
const envName = (p: PlanId, i: Interval) => `STRIPE_PRICE_${p.toUpperCase()}_${i === "month" ? "MONTH" : "YEAR"}`;
export const priceFor = (p: PlanId, i: Interval) => process.env[envName(p, i)];

export function planFromPrice(priceId: string | undefined): { plan: PlanId; interval: Interval } | null {
  if (!priceId) return null;
  for (const p of PLANS) for (const i of ["month", "year"] as const) if (priceFor(p.id, i) === priceId) return { plan: p.id, interval: i };
  return null;
}

/**
 * Idempotent: the provider event id is inserted first; a replay inserts nothing and is skipped.
 * Subscription state lives in our DB, set only from verified events, never from the client.
 */
export async function applyStripeEvent(db: Db, event: { id: string; type: string; data: { object: any } }): Promise<"applied" | "duplicate" | "ignored"> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const fresh = await db.query("insert into webhook_events (id, provider) values ($1,'stripe') on conflict do nothing returning id", [event.id]);
  if (fresh.length === 0) return "duplicate";
  const o = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const orgId = o.client_reference_id as string | undefined;
      if (orgId && o.customer) {
        await db.query("update organizations set stripe_customer_id=$2, stripe_subscription_id=coalesce($3, stripe_subscription_id), updated_at=now() where id=$1", [orgId, o.customer, o.subscription ?? null]);
      }
      return "applied";
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const hit = planFromPrice(o.items?.data?.[0]?.price?.id);
      if (!hit) return "ignored";
      const active = ["active", "trialing", "past_due"].includes(o.status);
      await db.query(
        `update organizations set plan=$2, billing_interval=$3, subscription_status=$4, stripe_subscription_id=$5, updated_at=now() where stripe_customer_id=$1`,
        [o.customer, active ? hit.plan : "free", hit.interval, o.status, o.id]);
      return "applied";
    }
    case "customer.subscription.deleted":
      await db.query("update organizations set plan='free', billing_interval='month', subscription_status='canceled', updated_at=now() where stripe_customer_id=$1", [o.customer]);
      return "applied";
    case "invoice.payment_failed":
      await db.query("update organizations set subscription_status='past_due', updated_at=now() where stripe_customer_id=$1", [o.customer]);
      return "applied";
    default:
      return "ignored";
  }
}
