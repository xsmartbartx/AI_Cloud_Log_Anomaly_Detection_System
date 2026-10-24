import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { planById } from "@/lib/plans";

/**
 * Read-only usage for the NEXORA Console.
 * Auth: headers x-nexora-timestamp (unix seconds, within 5 min) and x-nexora-signature = hex HMAC-SHA256(secret, `${timestamp}.${clerkOrgId}`).
 */
export async function GET(req: Request) {
  const secret = process.env.CONSOLE_SHARED_SECRET;
  const org = new URL(req.url).searchParams.get("org") ?? "";
  const ts = req.headers.get("x-nexora-timestamp") ?? "";
  const sig = req.headers.get("x-nexora-signature") ?? "";
  if (!secret || !org || !/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const want = createHmac("sha256", secret).update(`${ts}.${org}`).digest();
  const got = Buffer.from(sig, "hex");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const d = new Date();
  const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const [o] = await db.query<{ id: string; plan: string }>("select id, plan from organizations where clerk_org_id=$1", [org]);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [u] = await db.query<{ scans_used: number }>("select scans_used from usage_counters where org_id=$1 and period=$2", [o.id, period]);
  return NextResponse.json({ product: "linegist", period, plan: o.plan, scansUsed: u?.scans_used ?? 0, scansLimit: planById(o.plan as never).scans });
}
