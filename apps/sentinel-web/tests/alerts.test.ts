import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createPgliteDb, migrate, type Db } from "../lib/db";
import { createStore, orgFromRow, type Ctx } from "../lib/store";
import { ForbiddenError } from "../lib/authz";
import { buildPayload, isPrivateAddress, meetsThreshold, safeLookup, sendAlert, signPayload, validateWebhookUrl, type Transport } from "../lib/alerts";

let db: Db;
before(async () => {
  db = await createPgliteDb();
  await migrate(db);
});

async function mkCtx(key: string, role: "owner" | "admin" | "member" = "owner"): Promise<Ctx> {
  const [o] = await db.query<Record<string, any>>("insert into organizations (clerk_org_id, name, plan) values ($1,$1,'starter') returning *", [key]);
  const [m] = await db.query<Record<string, any>>("insert into members (org_id, clerk_user_id, email, role) values ($1,$2,$3,$4) returning *", [o.id, `u_${key}`, `${role}@${key}.test`, role]);
  return { org: orgFromRow(o), member: { id: m.id, clerkUserId: m.clerk_user_id, email: m.email, role: m.role } };
}
const bad = Array.from({ length: 30 }, (_, i) => `2026-10-13T10:00:${String(i).padStart(2, "0")}Z INFO ok ${i}ms`).concat("FATAL out of memory").join("\n");
const quiet = Array.from({ length: 30 }, (_, i) => `2026-10-13T10:00:${String(i).padStart(2, "0")}Z INFO ok ${i}ms`).concat("WARN deprecated flag used").join("\n");

function recorder(status = 200) {
  const calls: Array<{ url: string; body: string; headers: Record<string, string> }> = [];
  const transport: Transport = async (url, body, headers) => { calls.push({ url, body, headers }); return status; };
  return { calls, transport };
}

test("private, loopback, link-local and mapped addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "not-an-ip"])
    assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34", "2606:4700:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
});

test("webhook URLs: https only, no credentials, no odd ports, no internal hosts", () => {
  assert.equal(validateWebhookUrl("https://hooks.slack.com/services/T0/B0/xyz").ok, true);
  for (const u of ["http://example.com/h", "ftp://example.com", "https://user:pw@example.com/h", "https://example.com:8443/h", "https://localhost/h",
    "https://127.0.0.1/h", "https://[::1]/h", "https://169.254.169.254/latest", "https://intranet/h", "https://db.internal/h", "not a url", "", "https://" + "a".repeat(500) + ".com"])
    assert.equal(validateWebhookUrl(u).ok, false, u);
});

test("safeLookup refuses a hostname that resolves to a private address", async () => {
  const out = await new Promise<{ err: Error | null }>((resolve) => safeLookup("localhost", undefined, (err) => resolve({ err })));
  assert.match(String(out.err?.message), /blocked/);
});

test("threshold: only findings at or above the minimum count", () => {
  const by = { critical: 0, high: 0, medium: 2, low: 5 };
  assert.equal(meetsThreshold(by, "medium"), true);
  assert.equal(meetsThreshold(by, "low"), true);
  assert.equal(meetsThreshold(by, "high"), false);
  assert.equal(meetsThreshold(by, "critical"), false);
});

test("payload holds counts and a link, no log text; slack variant is a message", () => {
  const s = { scanId: "11111111-1111-1111-1111-111111111111", flaggedCount: 2, bySeverity: { critical: 1, high: 1, medium: 0, low: 0 }, format: "json", source: "api" as const };
  const j = JSON.parse(buildPayload("json", s, 1_790_000_000_000));
  assert.deepEqual(Object.keys(j).sort(), ["by_severity", "event", "flagged_count", "format", "highest_severity", "scan_id", "source", "timestamp", "url"]);
  assert.equal(j.highest_severity, "critical");
  assert.match(j.url, /\/app\/scans\/11111111-1111-1111-1111-111111111111$/);
  assert.match(JSON.parse(buildPayload("slack", s)).text, /2 flagged lines.*highest: critical/);
});

test("signed requests verify with the shared secret and fail with another", async () => {
  const { calls, transport } = recorder();
  const s = { scanId: "x", flaggedCount: 1, bySeverity: { critical: 1, high: 0, medium: 0, low: 0 }, format: "plain", source: "web" as const };
  assert.equal(await sendAlert({ url: "https://example.com/h", kind: "json", minSeverity: "high", secret: "whsec_a" }, s, transport, 1_790_000_000_000), "ok");
  const c = calls[0];
  assert.equal(c.headers["x-linegist-signature"], signPayload("whsec_a", c.headers["x-linegist-timestamp"], c.body));
  assert.notEqual(c.headers["x-linegist-signature"], signPayload("whsec_b", c.headers["x-linegist-timestamp"], c.body));
});

test("sendAlert reports http errors and exceptions instead of throwing", async () => {
  const w = { url: "https://example.com/h", kind: "json" as const, minSeverity: "high" as const, secret: "s" };
  const s = { scanId: "x", flaggedCount: 1, bySeverity: { critical: 1, high: 0, medium: 0, low: 0 }, format: "plain", source: "web" as const };
  assert.equal(await sendAlert(w, s, async () => 502), "http 502");
  assert.match(await sendAlert(w, s, async () => { throw new Error("blocked address"); }), /^error: blocked address/);
});

test("a scan alerts only when it reaches the threshold; the scan result is unaffected", async () => {
  const { calls, transport } = recorder();
  const a = createStore(db, await mkCtx("al1"), { transport });
  await a.setAlertWebhook({ url: "https://example.com/hook", kind: "json", minSeverity: "high", enabled: true });
  assert.ok((await a.runScan(quiet, "web")).ok);
  await a.alertsSettled();
  assert.equal(calls.length, 0);
  const out = await a.runScan(bad, "web");
  assert.ok(out.ok);
  await a.alertsSettled();
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0].body, /out of memory/i);
  assert.equal((await a.getAlertWebhook())?.lastStatus, "ok");
});

test("a failing webhook never fails or charges extra for a scan", async () => {
  const { transport } = recorder(500);
  const a = createStore(db, await mkCtx("al2"), { transport });
  await a.setAlertWebhook({ url: "https://example.com/hook", kind: "slack", minSeverity: "low", enabled: true });
  assert.ok((await a.runScan(bad, "web")).ok);
  await a.alertsSettled();
  assert.equal((await a.getAlertWebhook())?.lastStatus, "http 500");
  assert.equal((await a.usage()).used, 1);
});

test("disabled webhooks stay silent; the test alert still goes out", async () => {
  const { calls, transport } = recorder();
  const a = createStore(db, await mkCtx("al3"), { transport });
  await a.setAlertWebhook({ url: "https://example.com/hook", kind: "json", minSeverity: "low", enabled: false });
  await a.runScan(bad, "web");
  await a.alertsSettled();
  assert.equal(calls.length, 0);
  assert.equal(await a.sendTestAlert(), "ok");
  assert.equal(calls.length, 1);
});

test("saving rejects unsafe URLs; members cannot manage alerts or see the secret", async () => {
  const owner = createStore(db, await mkCtx("al4"));
  await assert.rejects(() => owner.setAlertWebhook({ url: "http://example.com/h", kind: "json", minSeverity: "high", enabled: true }), /https/);
  await assert.rejects(() => owner.setAlertWebhook({ url: "https://169.254.169.254/x", kind: "json", minSeverity: "high", enabled: true }), /reachable/);
  const ctx = await mkCtx("al5", "admin");
  const admin = createStore(db, ctx);
  await admin.setAlertWebhook({ url: "https://example.com/hook", kind: "json", minSeverity: "high", enabled: true });
  assert.match((await admin.getAlertWebhook())!.secret!, /^whsec_/);
  const [m] = await db.query<Record<string, any>>("insert into members (org_id, clerk_user_id, email, role) values ($1,'u_al5_m','m@al5.test','member') returning *", [ctx.org.id]);
  const member = createStore(db, { org: ctx.org, member: { id: m.id, clerkUserId: m.clerk_user_id, email: m.email, role: "member" } });
  assert.equal((await member.getAlertWebhook())!.secret, null);
  await assert.rejects(() => member.setAlertWebhook({ url: "https://example.com/h2", kind: "json", minSeverity: "high", enabled: true }), ForbiddenError);
  await assert.rejects(() => member.removeAlertWebhook(), ForbiddenError);
});

test("re-saving keeps the signing secret; each org only sees its own webhook", async () => {
  const a = createStore(db, await mkCtx("al6"));
  const b = createStore(db, await mkCtx("al7"));
  await a.setAlertWebhook({ url: "https://example.com/a", kind: "json", minSeverity: "high", enabled: true });
  const first = (await a.getAlertWebhook())!.secret;
  await a.setAlertWebhook({ url: "https://example.com/a2", kind: "slack", minSeverity: "low", enabled: true });
  assert.equal((await a.getAlertWebhook())!.secret, first);
  assert.equal(await b.getAlertWebhook(), null);
  await a.removeAlertWebhook();
  assert.equal(await a.getAlertWebhook(), null);
});
