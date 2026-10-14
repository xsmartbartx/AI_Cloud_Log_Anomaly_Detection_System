import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Daily (Vercel Cron). Retained findings older than 30 days are deleted; scan counts stay. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const del = await db.query("delete from findings where created_at < now() - interval '30 days' returning id");
  return NextResponse.json({ purged: del.length });
}
