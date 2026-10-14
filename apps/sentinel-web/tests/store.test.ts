import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createPgliteDb, migrate, type Db } from "../lib/db";
import { createStore, compileRule, orgFromRow, sha256, type Ctx } from "../lib/store";
import { ForbiddenError } from "../lib/authz";
import { applyStripeEvent } from "../lib/billing";

let db: Db;
before(async () => {
  db = await createPgliteDb();
  await migrate(db);
});

async function mkCtx(clerkOrg: string, role: "owner" | "admin" | "member" = "owner", plan = "starter"): Promise<Ctx> {
  const [o] = await db.query<Record<string, any>>("insert into organizations (clerk_org_id, name, plan) values ($1,$1,$2) returning *", [clerkOrg, plan]);
  const [m] = await db.query<Record<string, any>>("insert into members (org_id, clerk_user_id, email, role) values ($1,$2,$3,$4) returning *", [o.id, `u_${clerkOrg}_${role}`, `${role}@${clerkOrg}.test`, role]);
  return { org: orgFromRow(o), member: { id: m.id, clerkUserId: m.clerk_user_id, email: m.email, role: m.role } };
}
const sample = Array.from({ length: 30 }, (_, i) => `2026-10-13T10:00:${String(i).padStart(2, "0")}Z INFO ok ${i}ms`).concat("FATAL out of memory").join("\n");

test("a scan is charged once and findings are not stored by default", async () => {
  const a = createStore(db, await mkCtx("a1"));
  const out = await a.runScan(sample, "web");
  assert.ok(out.ok && out.findings.length >= 1);
  assert.equal((await a.usage()).used, 1);
  assert.equal((await db.query("select 1 from findings")).length, 0);
  const row = (await a.listScans())[0];
  assert.equal(row.flaggedCount, out.ok && out.findings.length);
});

test("invalid input is not charged", async () => {
  const a = createStore(db, await mkCtx("a2"));
  const out = await a.runScan("   \n", "web");
  assert.ok(!out.ok && out.code === "empty");
  assert.equal((await a.usage()).used, 0);
});

test("quota cannot be exceeded, even with concurrent scans", async () => {
  const ctx = await mkCtx("a3", "owner", "free");
  const a = createStore(db, ctx);
  await db.query("insert into usage_counters (org_id, period, scans_used) values ($1,$2,19)", [ctx.org.id, new Date().toISOString().slice(0, 7)]);
  const results = await Promise.all(Array.from({ length: 5 }, () => a.runScan(sample, "web")));
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok && r.code === "quota").length, 4);
  assert.equal((await a.usage()).used, 20);
});

test("retention on stores redacted findings only", async () => {
  const a = createStore(db, await mkCtx("a4"));
  await a.setRetention(true);
  const out = await a.runScan(["ERROR token=abc123secret failed", ...sample.split("\n")].join("\n"), "web");
  assert.ok(out.ok);
  const stored = await db.query<{ text: string }>("select text from findings where scan_id=$1", [out.ok ? out.scan.id : ""]);
  assert.ok(stored.length > 0 && stored.every((r) => !r.text.includes("abc123secret")));
  const again = await a.getScan(out.ok ? out.scan.id : "");
  assert.ok(again?.findings && again.findings.length === stored.length);
});

test("tenant isolation: a second org gets nothing back", async () => {
  const a = createStore(db, await mkCtx("iso-a"));
  const b = createStore(db, await mkCtx("iso-b"));
  const out = await a.runScan(sample, "web");
  await a.createKey("ci");
  await a.addRule("custom", "foo.*bar", "high");
  const keyId = (await a.listKeys())[0].id;
  const ruleId = (await a.listRules())[0].id;

  assert.ok(out.ok);
  assert.equal(await b.getScan(out.ok ? out.scan.id : ""), null);
  assert.equal((await b.listScans()).length, 0);
  assert.equal((await b.listKeys()).length, 0);
  assert.equal((await b.listRules()).length, 0);
  await b.revokeKey(keyId);
  await b.deleteRule(ruleId);
  await b.toggleRule(ruleId);
  assert.equal((await a.listKeys())[0].revokedAt, null);
  assert.equal((await a.listRules()).length, 1);
  assert.equal((await a.listRules())[0].enabled, true);
});

test("roles: members can scan but not manage keys, rules or settings", async () => {
  const m = createStore(db, await mkCtx("role1", "member"));
  assert.ok((await m.runScan(sample, "web")).ok);
  await assert.rejects(() => m.createKey("x"), ForbiddenError);
  await assert.rejects(() => m.addRule("n", "a", "low"), ForbiddenError);
  await assert.rejects(() => m.setRetention(true), ForbiddenError);
});

test("custom rules use a safe engine and are length-capped", async () => {
  assert.throws(() => compileRule("a".repeat(201)), /200/);
  assert.throws(() => compileRule("(unclosed"), /valid/);
  const a = createStore(db, await mkCtx("rules1"));
  await a.addRule("payments", "gateway.*503", "high");
  const out = await a.runScan([...sample.split("\n"), "payment gateway returned 503"].join("\n"), "web");
  assert.ok(out.ok && out.findings.some((f) => f.text.includes("gateway") && f.severity === "high"));
  // catastrophic-backtracking pattern completes instantly under RE2
  const r = compileRule("(a+)+$");
  const t0 = Date.now();
  r.test("a".repeat(40) + "!");
  assert.ok(Date.now() - t0 < 200);
});

test("api key hash lookup", async () => {
  const ctx = await mkCtx("key1");
  const a = createStore(db, ctx);
  const { secret } = await a.createKey("ci");
  const rows = await db.query("select 1 from api_keys where key_hash=$1 and revoked_at is null", [sha256(secret)]);
  assert.equal(rows.length, 1);
  assert.equal((await db.query("select 1 from api_keys where key_hash=$1", [secret])).length, 0); // plain key never stored
});

test("stripe webhook is idempotent and maps plans", async () => {
  process.env.STRIPE_PRICE_PRO_MONTH = "price_pro_m";
  const ctx = await mkCtx("bill1");
  await db.query("update organizations set stripe_customer_id='cus_1' where id=$1", [ctx.org.id]);
  const evt = { id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_1", status: "active", items: { data: [{ price: { id: "price_pro_m" } }] } } } };
  assert.equal(await applyStripeEvent(db, evt), "applied");
  assert.equal(await applyStripeEvent(db, evt), "duplicate");
  let [o] = await db.query<{ plan: string; subscription_status: string }>("select plan, subscription_status from organizations where id=$1", [ctx.org.id]);
  assert.deepEqual([o.plan, o.subscription_status], ["pro", "active"]);
  await applyStripeEvent(db, { id: "evt_2", type: "customer.subscription.deleted", data: { object: { customer: "cus_1" } } });
  [o] = await db.query("select plan, subscription_status from organizations where id=$1", [ctx.org.id]);
  assert.deepEqual([o.plan, o.subscription_status], ["free", "canceled"]);
  assert.equal(await applyStripeEvent(db, { id: "evt_3", type: "something.else", data: { object: {} } }), "ignored");
});

test("deleting an organization removes its data", async () => {
  const ctx = await mkCtx("gdpr1");
  const a = createStore(db, ctx);
  await a.setRetention(true);
  await a.runScan(sample, "web");
  await a.createKey("k");
  await db.query("delete from organizations where id=$1", [ctx.org.id]);
  for (const t of ["scans", "findings", "api_keys", "members", "usage_counters", "audit_logs"]) {
    assert.equal((await db.query(`select 1 from ${t} where org_id=$1`, [ctx.org.id])).length, 0, t);
  }
});
