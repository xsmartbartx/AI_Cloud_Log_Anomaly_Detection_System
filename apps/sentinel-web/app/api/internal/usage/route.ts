import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { planById } from "@/lib/plans";
import { verifyConsoleRequest } from "@/lib/console-auth";

/** Read-only usage for the NEXORA Console. Contract: docs/console-contract.md */
export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("org") ?? "";
  const check = verifyConsoleRequest({
    secret: process.env.CONSOLE_SHARED_SECRET,
    org,
    timestamp: req.headers.get("x-nexora-timestamp") ?? "",
    signature: req.headers.get("x-nexora-signature") ?? "",
    nowSeconds: Date.now() / 1000,
  });
  if (!check.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });

  const db = await getDb();
  const d = new Date();
  const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const [o] = await db.query<{ id: string; plan: string }>("select id, plan from organizations where clerk_org_id=$1", [org]);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
  const [u] = await db.query<{ scans_used: number }>("select scans_used from usage_counters where org_id=$1 and period=$2", [o.id, period]);
  return NextResponse.json({ product: "linegist", period, plan: o.plan, scansUsed: u?.scans_used ?? 0, scansLimit: planById(o.plan as never).scans }, { headers: { "cache-control": "no-store" } });
}
