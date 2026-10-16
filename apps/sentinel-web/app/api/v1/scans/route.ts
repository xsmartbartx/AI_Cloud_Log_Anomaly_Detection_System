import { NextResponse } from "next/server";
import { z } from "zod";
import { storeForApiKey } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const body = z.object({ text: z.string() });
const MAX_BODY = 6 * 1024 * 1024; // JSON escaping can add to a 4 MB sample; anything larger is refused before parsing

/** Read the body without trusting Content-Length, and stop as soon as it is too big. */
async function readCapped(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY || !req.body) return declared > MAX_BODY ? null : "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(req: Request) {
  if (!rateLimit(`api-ip:${clientIp(req)}`, 120, 60_000).ok) return NextResponse.json({ error: "rate_limited", message: "Too many requests." }, { status: 429 });
  const auth = req.headers.get("authorization") ?? "";
  const secret = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const found = secret ? await storeForApiKey(secret) : null;
  if (!found) return NextResponse.json({ error: "invalid_key", message: "Missing or invalid API key." }, { status: 401 });
  const rl = rateLimit(`api-key:${found.keyId}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "Too many requests." }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const raw = await readCapped(req);
  if (raw === null) return NextResponse.json({ error: "too_large", message: "Request is larger than the 4 MB sample limit." }, { status: 413 });
  let json: unknown = null;
  try { json = JSON.parse(raw); } catch { /* handled below */ }
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: 'Send JSON: {"text": "..."}.' }, { status: 400 });

  const out = await found.store.runScan(parsed.data.text, "api", found.keyId);
  if (!out.ok) {
    const status = out.code === "quota" ? 402 : out.code === "empty" ? 400 : 413;
    return NextResponse.json({ error: out.code, message: out.message }, { status });
  }
  return NextResponse.json({ id: out.scan.id, lineCount: out.scan.lineCount, flaggedCount: out.scan.flaggedCount, findings: out.findings });
}
