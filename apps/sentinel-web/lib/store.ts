import { createHash, randomBytes } from "node:crypto";
import RE2 from "re2";
import { detect, InputError, LIMITS, type Finding, type Rule, type Severity } from "@anomaly/detector";
import { getDb, type Db } from "./db";
import { assertCan, type Role } from "./authz";
import { planById, type PlanId } from "./plans";
import { requireCtx } from "./auth";

/**
 * Data layer. Every function runs inside a Ctx (org + member from the verified session)
 * and every SQL statement is scoped by ctx.org.id. There is no query path without it.
 */
export type Ctx = { org: Org; member: Member };
export type Org = { id: string; clerkOrgId: string; name: string; plan: PlanId; interval: "month" | "year"; retainSamples: boolean; stripeCustomerId: string | null; subscriptionStatus: string | null };
export type Member = { id: string; clerkUserId: string; email: string; role: Role };
export type ScanRow = { id: string; source: "web" | "api"; lineCount: number; byteCount: number; flaggedCount: number; durationMs: number; createdAt: string; findings: Finding[] | null };
export type ApiKey = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
export type CustomRule = { id: string; name: string; pattern: string; severity: Severity; enabled: boolean };
export type ScanOutcome =
  | { ok: true; scan: ScanRow; findings: Finding[] }
  | { ok: false; code: "quota" | InputError["code"]; message: string };

const period = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const iso = (v: unknown) => new Date(v as string).toISOString();

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export const orgFromRow = (r: R): Org => ({
  id: r.id, clerkOrgId: r.clerk_org_id, name: r.name, plan: r.plan, interval: r.billing_interval,
  retainSamples: r.retain_samples, stripeCustomerId: r.stripe_customer_id, subscriptionStatus: r.subscription_status,
});

export function compileRule(pattern: string) {
  if (pattern.length > 200) throw new Error("Pattern is longer than 200 characters.");
  try { return new RE2(pattern, "i"); } catch { throw new Error("Pattern is not a valid regular expression."); }
}

export function createStore(db: Db, ctx: Ctx) {
  const orgId = ctx.org.id;
  const role = ctx.member.role;

  async function usage() {
    const org = (await db.query<R>("select plan from organizations where id=$1", [orgId]))[0];
    const plan = planById(org.plan);
    const row = (await db.query<R>("select scans_used from usage_counters where org_id=$1 and period=$2", [orgId, period()]))[0];
    return { used: row?.scans_used ?? 0, limit: plan.scans, plan, period: period() };
  }

  async function runScan(text: string, source: "web" | "api", apiKeyId: string | null = null): Promise<ScanOutcome> {
    assertCan(role, "scan");
    if (Buffer.byteLength(text, "utf8") > LIMITS.maxBytes) return { ok: false, code: "too_large", message: "Sample is larger than 4 MB." };
    const org = (await db.query<R>("select plan, retain_samples from organizations where id=$1", [orgId]))[0];
    const limit = planById(org.plan).scans;

    // Atomic charge: the conditional update means concurrent scans cannot exceed the plan.
    const charged = await db.query(
      `insert into usage_counters (org_id, period, scans_used) values ($1,$2,1)
       on conflict (org_id, period) do update set scans_used = usage_counters.scans_used + 1, updated_at = now()
       where usage_counters.scans_used < $3 returning scans_used`, [orgId, period(), limit]);
    if (charged.length === 0) return { ok: false, code: "quota", message: "You have used every scan in your plan this month." };
    const refund = () => db.query("update usage_counters set scans_used = greatest(scans_used - 1, 0), updated_at = now() where org_id=$1 and period=$2", [orgId, period()]);

    try {
      const rules: Rule[] = [];
      for (const r of await db.query<R>("select id, name, pattern, severity from rules where org_id=$1 and enabled", [orgId])) {
        try { rules.push({ id: r.id, name: r.name, pattern: compileRule(r.pattern), severity: r.severity }); } catch { /* skip invalid */ }
      }
      const result = detect(text, { rules });
      const retain: boolean = org.retain_samples;
      const [scan] = await db.query<R>(
        `insert into scans (org_id, member_id, api_key_id, source, line_count, byte_count, flagged_count, duration_ms)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, created_at`,
        [orgId, source === "web" ? ctx.member.id : null, apiKeyId, source, result.lineCount, result.byteCount, result.findings.length, result.durationMs]);
      if (retain) {
        for (const f of result.findings) {
          await db.query(
            `insert into findings (scan_id, org_id, rank, line_no, text, severity, reason, rule_id, score) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [scan.id, orgId, f.rank, f.lineNo, f.text, f.severity, f.reason, /^[0-9a-f-]{36}$/.test(f.ruleId ?? "") ? f.ruleId : null, f.score]);
        }
      }
      return {
        ok: true, findings: result.findings,
        scan: { id: scan.id, source, lineCount: result.lineCount, byteCount: result.byteCount, flaggedCount: result.findings.length, durationMs: result.durationMs, createdAt: iso(scan.created_at), findings: retain ? result.findings : null },
      };
    } catch (e) {
      await refund(); // invalid input or server error: no charge
      if (e instanceof InputError) return { ok: false, code: e.code, message: e.message };
      throw e;
    }
  }

  const scanFromRow = (r: R, findings: Finding[] | null): ScanRow => ({
    id: r.id, source: r.source, lineCount: r.line_count, byteCount: r.byte_count, flaggedCount: r.flagged_count,
    durationMs: r.duration_ms ?? 0, createdAt: iso(r.created_at), findings,
  });

  return {
    usage,
    runScan,
    async listScans(limit = 50) {
      assertCan(role, "history:read");
      return (await db.query<R>("select * from scans where org_id=$1 order by created_at desc limit $2", [orgId, limit])).map((r) => scanFromRow(r, null));
    },
    async totals() {
      const r = (await db.query<R>("select coalesce(sum(line_count),0)::int as lines, coalesce(sum(flagged_count),0)::int as flagged from scans where org_id=$1", [orgId]))[0];
      return { lines: r.lines as number, flagged: r.flagged as number };
    },
    async getScan(id: string) {
      assertCan(role, "history:read");
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const r = (await db.query<R>("select * from scans where id=$1 and org_id=$2", [id, orgId]))[0];
      if (!r) return null;
      const rows = await db.query<R>("select * from findings where scan_id=$1 and org_id=$2 order by rank", [id, orgId]);
      // Decide from the scan itself, not the org's current retention setting: a scan that flagged lines but
      // has no stored rows (retention was off, or the 30-day purge ran) was "not kept", never "nothing stood out".
      const findings: Finding[] | null = rows.length === 0 && r.flagged_count > 0
        ? null
        : rows.map((f) => ({ rank: f.rank, lineNo: f.line_no, text: f.text, severity: f.severity, reason: f.reason, ruleId: f.rule_id, score: Number(f.score), detail: f.reason === "rule" ? "Matched a rule." : "Unusual line shape.", occurrences: 1 }));
      return scanFromRow(r, findings);
    },
    async listKeys(): Promise<ApiKey[]> {
      return (await db.query<R>("select id, name, prefix, created_at, last_used_at, revoked_at from api_keys where org_id=$1 order by created_at desc", [orgId]))
        .map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: iso(k.created_at), lastUsedAt: k.last_used_at ? iso(k.last_used_at) : null, revokedAt: k.revoked_at ? iso(k.revoked_at) : null }));
    },
    async createKey(name: string) {
      assertCan(role, "keys:write");
      const secret = `lgk_${randomBytes(24).toString("base64url")}`;
      await db.query("insert into api_keys (org_id, created_by, name, prefix, key_hash) values ($1,$2,$3,$4,$5)", [orgId, ctx.member.id, name, secret.slice(0, 8), sha256(secret)]);
      await audit("key.create", "api_key", null, { name });
      return { secret };
    },
    async revokeKey(id: string) {
      assertCan(role, "keys:write");
      if (!/^[0-9a-f-]{36}$/.test(id)) return;
      await db.query("update api_keys set revoked_at = now(), updated_at = now() where id=$1 and org_id=$2 and revoked_at is null", [id, orgId]);
      await audit("key.revoke", "api_key", id, null);
    },
    async listRules(): Promise<CustomRule[]> {
      return (await db.query<R>("select id, name, pattern, severity, enabled from rules where org_id=$1 order by created_at", [orgId])) as CustomRule[];
    },
    async addRule(name: string, pattern: string, severity: Severity) {
      assertCan(role, "rules:write");
      compileRule(pattern); // throws a readable error
      await db.query("insert into rules (org_id, name, pattern, severity) values ($1,$2,$3,$4)", [orgId, name, pattern, severity]);
    },
    async toggleRule(id: string) {
      assertCan(role, "rules:write");
      if (!/^[0-9a-f-]{36}$/.test(id)) return;
      await db.query("update rules set enabled = not enabled, updated_at = now() where id=$1 and org_id=$2", [id, orgId]);
    },
    async deleteRule(id: string) {
      assertCan(role, "rules:write");
      if (!/^[0-9a-f-]{36}$/.test(id)) return;
      await db.query("delete from rules where id=$1 and org_id=$2", [id, orgId]);
    },
    async setRetention(on: boolean) {
      assertCan(role, "settings:write");
      await db.query("update organizations set retain_samples=$2, updated_at=now() where id=$1", [orgId, on]);
      await audit("settings.retention", "organization", orgId, { on });
    },
    async listMembers(): Promise<Array<Member & { name: string }>> {
      return (await db.query<R>("select id, clerk_user_id, email, role from members where org_id=$1 order by created_at", [orgId]))
        .map((m) => ({ id: m.id, clerkUserId: m.clerk_user_id, email: m.email, role: m.role, name: m.email.split("@")[0] }));
    },
  };

  async function audit(action: string, resourceType: string, resourceId: string | null, details: unknown) {
    await db.query("insert into audit_logs (org_id, member_id, action, resource_type, resource_id, details) values ($1,$2,$3,$4,$5,$6)",
      [orgId, ctx.member.id, action, resourceType, resourceId, details ? JSON.stringify(details) : null]);
  }
}

export type Store = ReturnType<typeof createStore>;

/** App entry point: store bound to the signed-in user. */
export async function store(): Promise<Store> {
  return createStore(await getDb(), await requireCtx());
}

/** API-key entry point: resolve the org from a key, then act as the org owner-less "api" member. */
export async function storeForApiKey(secret: string): Promise<{ store: Store; keyId: string } | null> {
  const db = await getDb();
  const k = (await db.query<R>(
    `update api_keys set last_used_at = now() where key_hash = $1 and revoked_at is null returning id, org_id`, [sha256(secret)]))[0];
  if (!k) return null;
  const o = (await db.query<R>("select * from organizations where id=$1", [k.org_id]))[0];
  const ctx: Ctx = { org: orgFromRow(o), member: { id: "00000000-0000-0000-0000-000000000000", clerkUserId: "api", email: "api", role: "member" } };
  return { store: createStore(db, ctx), keyId: k.id };
}

export { LIMITS };
