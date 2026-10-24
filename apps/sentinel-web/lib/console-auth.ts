import { createHmac, timingSafeEqual } from "node:crypto";

/** Signature scheme for the NEXORA Console to read usage. Documented in docs/console-contract.md. */
export const CONSOLE_WINDOW_SECONDS = 300;

export const signConsoleRequest = (secret: string, timestamp: string | number, org: string) =>
  createHmac("sha256", secret).update(`${timestamp}.${org}`).digest("hex");

export type ConsoleCheck = { ok: true } | { ok: false; reason: "not_configured" | "bad_request" | "stale" | "bad_signature" };

export function verifyConsoleRequest(input: { secret: string | undefined; org: string; timestamp: string; signature: string; nowSeconds: number }): ConsoleCheck {
  const { secret, org, timestamp, signature, nowSeconds } = input;
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!org || !/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(signature)) return { ok: false, reason: "bad_request" };
  if (Math.abs(nowSeconds - Number(timestamp)) > CONSOLE_WINDOW_SECONDS) return { ok: false, reason: "stale" };
  const want = Buffer.from(signConsoleRequest(secret, timestamp, org), "hex");
  const got = Buffer.from(signature, "hex");
  return got.length === want.length && timingSafeEqual(got, want) ? { ok: true } : { ok: false, reason: "bad_signature" };
}
