import { request } from "node:https";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { createHmac } from "node:crypto";
import type { Severity } from "@anomaly/detector";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
export type AlertKind = "json" | "slack";
export type AlertSummary = { scanId: string; flaggedCount: number; bySeverity: Record<Severity, number>; format: string; source: "web" | "api" };
export type Transport = (url: string, body: string, headers: Record<string, string>) => Promise<number>;

const BASE = process.env.APP_URL ?? "https://linegist.onenexora.com";

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && ip.startsWith("192.0.0.")))) || (a === 198 && (b === 18 || b === 19))
  );
}

/** True for addresses an alert must never be sent to: loopback, private, link-local (cloud metadata), CGNAT, multicast. */
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(v) === 4) return privateV4(v);
  if (isIP(v) !== 6) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
}

export type UrlCheck = { ok: true; url: string } | { ok: false; message: string };

/** Static checks done when the URL is saved. Delivery re-checks the resolved address (see safeLookup). */
export function validateWebhookUrl(raw: string): UrlCheck {
  const s = raw.trim();
  if (s.length === 0 || s.length > 500) return { ok: false, message: "Enter a URL of up to 500 characters." };
  let u: URL;
  try { u = new URL(s); } catch { return { ok: false, message: "Enter a full URL, starting with https://." }; }
  if (u.protocol !== "https:") return { ok: false, message: "Only https:// URLs are allowed." };
  if (u.username || u.password) return { ok: false, message: "Remove the username and password from the URL." };
  if (u.port && u.port !== "443") return { ok: false, message: "Only the default HTTPS port (443) is allowed." };
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || (!h.includes(".") && isIP(h.replace(/^\[|\]$/g, "")) === 0))
    return { ok: false, message: "That host is not reachable from the internet." };
  if (isIP(h.replace(/^\[|\]$/g, "")) !== 0 && isPrivateAddress(h)) return { ok: false, message: "That address is not reachable from the internet." };
  return { ok: true, url: u.toString() };
}

/** DNS lookup that refuses private results, so a hostname cannot be pointed at an internal service. */
export function safeLookup(
  hostname: string, options: { all?: boolean } | undefined,
  cb: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { all: true }, (err, addrs) => {
    if (err) return cb(err, "", 0);
    if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) return cb(new Error("blocked address") as NodeJS.ErrnoException, "", 0);
    if (options?.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

/** Real transport: HTTPS POST, no redirects, 4 s timeout, response body ignored. Resolves with the HTTP status. */
export const httpsTransport: Transport = (url, body, headers) =>
  new Promise((resolve, reject) => {
    const req = request(url, { method: "POST", headers: { ...headers, "content-length": String(Buffer.byteLength(body)) }, lookup: safeLookup as never, timeout: 4000 }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(body);
  });

export const highest = (by: Record<Severity, number>): Severity | null => SEVERITY_ORDER.find((s) => by[s] > 0) ?? null;

/** True when at least one finding is at or above the minimum severity. */
export function meetsThreshold(by: Record<Severity, number>, min: Severity): boolean {
  return SEVERITY_ORDER.slice(0, SEVERITY_ORDER.indexOf(min) + 1).some((s) => by[s] > 0);
}

export function buildPayload(kind: AlertKind, s: AlertSummary, now = Date.now()): string {
  const url = `${BASE}/app/scans/${s.scanId}`;
  const top = highest(s.bySeverity) ?? "low";
  if (kind === "slack") return JSON.stringify({ text: `Linegist: ${s.flaggedCount} flagged line${s.flaggedCount === 1 ? "" : "s"} in a scan (highest: ${top}). ${url}` });
  return JSON.stringify({
    event: "scan.completed", scan_id: s.scanId, flagged_count: s.flaggedCount, highest_severity: top,
    by_severity: s.bySeverity, format: s.format, source: s.source, url, timestamp: new Date(now).toISOString(),
  });
}

export const signPayload = (secret: string, ts: string, body: string) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

export type Webhook = { url: string; kind: AlertKind; minSeverity: Severity; secret: string };

/** Send one alert. Never throws: the outcome is returned as the status string stored on the webhook row. */
export async function sendAlert(w: Webhook, s: AlertSummary, transport: Transport = httpsTransport, now = Date.now()): Promise<string> {
  const body = buildPayload(w.kind, s, now);
  const ts = String(Math.floor(now / 1000));
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "Linegist-Alerts/1" };
  if (w.kind === "json") { headers["x-linegist-timestamp"] = ts; headers["x-linegist-signature"] = signPayload(w.secret, ts, body); }
  try {
    const status = await transport(w.url, body, headers);
    return status >= 200 && status < 300 ? "ok" : `http ${status}`;
  } catch (e) {
    return `error: ${(e instanceof Error ? e.message : "failed").slice(0, 80)}`;
  }
}
