import { NextResponse } from "next/server";
import { z } from "zod";
import { storeForApiKey } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const body = z.object({ text: z.string() });

export async function POST(req: Request) {
  if (!rateLimit(`api-ip:${clientIp(req)}`, 120, 60_000).ok) return NextResponse.json({ error: "rate_limited", message: "Too many requests." }, { status: 429 });
  const auth = req.headers.get("authorization") ?? "";
  const secret = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const found = secret ? await storeForApiKey(secret) : null;
  if (!found) return NextResponse.json({ error: "invalid_key", message: "Missing or invalid API key." }, { status: 401 });
  const rl = rateLimit(`api-key:${found.keyId}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "Too many requests." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: 'Send JSON: {"text": "..."}.' }, { status: 400 });

  const out = await found.store.runScan(parsed.data.text, "api", found.keyId);
  if (!out.ok) {
    const status = out.code === "quota" ? 402 : out.code === "empty" ? 400 : 413;
    return NextResponse.json({ error: out.code, message: out.message }, { status });
  }
  return NextResponse.json({ id: out.scan.id, lineCount: out.scan.lineCount, flaggedCount: out.scan.flaggedCount, findings: out.findings });
}
