"use server";
import { revalidatePath } from "next/cache";
import type { Finding, Severity } from "@anomaly/detector";
import { z } from "zod";
import { store, LIMITS } from "./store";
import { ForbiddenError } from "./authz";
import { rateLimit } from "./ratelimit";
import { requireCtx } from "./auth";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const msg = (e: unknown, fallback: string) => (e instanceof ForbiddenError || e instanceof Error ? e.message : fallback);

export type ScanState =
  | { status: "idle" }
  | { status: "error"; message: string; code: string }
  | { status: "done"; scanId: string; lineCount: number; flaggedCount: number; durationMs: number; findings: Finding[] };

export async function runScanAction(_prev: ScanState, form: FormData): Promise<ScanState> {
  const ctx = await requireCtx();
  if (!rateLimit(`scan:${ctx.org.id}`, 30, 60_000).ok) return { status: "error", code: "rate_limited", message: "Too many scans in a minute. Wait a moment and try again." };
  let text = String(form.get("sample") ?? "");
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > LIMITS.maxBytes) return { status: "error", code: "too_large", message: "File is larger than 4 MB." };
    text = await file.text();
  }
  try {
    const out = await (await store()).runScan(text, "web");
    revalidatePath("/app", "layout");
    if (!out.ok) return { status: "error", code: out.code, message: out.message };
    return { status: "done", scanId: out.scan.id, lineCount: out.scan.lineCount, flaggedCount: out.scan.flaggedCount, durationMs: out.scan.durationMs, findings: out.findings };
  } catch (e) {
    if (e instanceof ForbiddenError) return { status: "error", code: "forbidden", message: e.message };
    console.error("scan failed", e instanceof Error ? e.message : e); // never log the sample
    return { status: "error", code: "server", message: "Something went wrong on our side. Your scan was not counted." };
  }
}

export type KeyState = { status: "idle" } | { status: "error"; message: string } | { status: "created"; secret: string; name: string };

const keyName = z.string().trim().min(1, "Give the key a name.").max(60, "Name is longer than 60 characters.");

export async function createKeyAction(_p: KeyState, form: FormData): Promise<KeyState> {
  const parsed = keyName.safeParse(form.get("name"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  try {
    const { secret } = await (await store()).createKey(parsed.data);
    revalidatePath("/app/keys");
    return { status: "created", secret, name: parsed.data };
  } catch (e) { return { status: "error", message: msg(e, "Could not create the key.") }; }
}
export async function revokeKeyAction(form: FormData) {
  await (await store()).revokeKey(String(form.get("id")));
  revalidatePath("/app/keys");
}

export type RuleState = { status: "idle" } | { status: "error"; message: string } | { status: "ok" };
const ruleInput = z.object({
  name: z.string().trim().min(1, "Name and pattern are required.").max(80),
  pattern: z.string().min(1, "Name and pattern are required.").max(200, "Pattern is longer than 200 characters."),
  severity: z.enum(SEVERITIES),
});
export async function addRuleAction(_p: RuleState, form: FormData): Promise<RuleState> {
  const parsed = ruleInput.safeParse({ name: form.get("name"), pattern: form.get("pattern"), severity: form.get("severity") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  try { await (await store()).addRule(parsed.data.name, parsed.data.pattern, parsed.data.severity as Severity); }
  catch (e) { return { status: "error", message: msg(e, "Invalid pattern.") }; }
  revalidatePath("/app/rules");
  return { status: "ok" };
}
export async function toggleRuleAction(form: FormData) { await (await store()).toggleRule(String(form.get("id"))); revalidatePath("/app/rules"); }
export async function deleteRuleAction(form: FormData) { await (await store()).deleteRule(String(form.get("id"))); revalidatePath("/app/rules"); }
export async function retentionAction(form: FormData) { await (await store()).setRetention(form.get("retain") === "on"); revalidatePath("/app/settings"); }
