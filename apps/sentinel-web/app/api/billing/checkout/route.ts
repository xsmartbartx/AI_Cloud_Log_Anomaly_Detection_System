import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCtx } from "@/lib/auth";
import { assertCan, ForbiddenError } from "@/lib/authz";
import { getDb } from "@/lib/db";
import { canStartCheckout, priceFor, stripe, stripeEnabled } from "@/lib/billing";
import { rateLimit } from "@/lib/ratelimit";

const body = z.object({ plan: z.enum(["starter", "pro", "business", "scale"]), interval: z.enum(["month", "year"]) });

export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "billing_unavailable", message: "Billing is not connected yet." }, { status: 503 });
  const ctx = await requireCtx();
  try { assertCan(ctx.member.role, "billing:write"); } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden", message: e.message }, { status: 403 });
    throw e;
  }
  if (!rateLimit(`checkout:${ctx.org.id}`, 10, 60_000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Choose a plan and interval." }, { status: 400 });
  if (!canStartCheckout(ctx.org.subscriptionStatus)) {
    return NextResponse.json({ error: "already_subscribed", message: "You already have a subscription. Use Manage billing to change or cancel it." }, { status: 409 });
  }
  const { plan, interval } = parsed.data;
  const price = priceFor(plan, interval);
  if (!price) return NextResponse.json({ error: "billing_unavailable", message: "That plan is not available yet." }, { status: 503 });

  const s = stripe();
  const db = await getDb();
  let customer = ctx.org.stripeCustomerId;
  if (!customer) {
    customer = (await s.customers.create({ name: ctx.org.name, metadata: { org_id: ctx.org.id, product: "linegist" } })).id;
    await db.query("update organizations set stripe_customer_id=$2 where id=$1", [ctx.org.id, customer]);
  }
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const session = await s.checkout.sessions.create({
    mode: "subscription", customer, client_reference_id: ctx.org.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { org_id: ctx.org.id, plan } },
    success_url: `${base}/app/usage?checkout=success`, cancel_url: `${base}/app/usage?checkout=cancelled`,
  });
  return NextResponse.json({ url: session.url });
}
