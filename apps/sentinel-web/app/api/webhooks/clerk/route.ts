import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getDb } from "@/lib/db";
import { applyClerkEvent } from "@/lib/clerk-events";

/** Deletion sync (GDPR): removing a Clerk user or organization removes our rows. */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const raw = await req.text();
  let evt: { type: string; data: { id?: string } };
  try {
    evt = new Webhook(secret).verify(raw, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as never;
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const result = await applyClerkEvent(await getDb(), req.headers.get("svix-id") ?? "", evt);
  return NextResponse.json({ received: true, result });
}
