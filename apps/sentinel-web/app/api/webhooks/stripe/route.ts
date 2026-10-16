import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyStripeEvent, stripe } from "@/lib/billing";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const raw = await req.text(); // raw body is required for the signature check
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const result = await applyStripeEvent(await getDb(), event as never);
  return NextResponse.json({ received: true, result });
}
