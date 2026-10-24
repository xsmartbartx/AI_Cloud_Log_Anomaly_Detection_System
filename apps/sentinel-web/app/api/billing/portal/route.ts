import { NextResponse } from "next/server";
import { requireCtx } from "@/lib/auth";
import { assertCan, ForbiddenError } from "@/lib/authz";
import { stripe, stripeEnabled } from "@/lib/billing";

export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "billing_unavailable", message: "Billing is not connected yet." }, { status: 503 });
  const ctx = await requireCtx();
  try { assertCan(ctx.member.role, "billing:write"); } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden", message: e.message }, { status: 403 });
    throw e;
  }
  if (!ctx.org.stripeCustomerId) return NextResponse.json({ error: "no_subscription", message: "No subscription to manage yet." }, { status: 400 });
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const s = await stripe().billingPortal.sessions.create({ customer: ctx.org.stripeCustomerId, return_url: `${base}/app/usage` });
  return NextResponse.json({ url: s.url });
}
