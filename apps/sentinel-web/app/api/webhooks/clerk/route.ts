import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getDb } from "@/lib/db";

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
  const db = await getDb();
  const id = req.headers.get("svix-id")!;
  const fresh = await db.query("insert into webhook_events (id, provider) values ($1,'clerk') on conflict do nothing returning id", [id]);
  if (fresh.length === 0) return NextResponse.json({ received: true, result: "duplicate" });
  if (evt.type === "user.deleted" && evt.data.id) await db.query("delete from members where clerk_user_id=$1", [evt.data.id]);
  if (evt.type === "organization.deleted" && evt.data.id) await db.query("delete from organizations where clerk_org_id=$1", [evt.data.id]);
  return NextResponse.json({ received: true });
}
