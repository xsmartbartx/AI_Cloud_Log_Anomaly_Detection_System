import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const KEY = `lgk_prodsmoke_${Date.now()}`;
const LOG = [
  ...Array.from({ length: 60 }, (_, i) => `2026-10-13T09:00:${String(i % 60).padStart(2, "0")}Z INFO api GET /v1/items 200 ${20 + (i % 9)}ms`),
  "2026-10-13T09:01:52Z FATAL worker out of memory, killed process 8841",
].join("\n");

test.describe("production build", () => {
  test.skip(!url, "DATABASE_URL is not set");
  let pool: Pool;
  let orgId: string;

  test.beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 2 });
    const [o] = (await pool.query("insert into organizations (clerk_org_id, name, plan) values ($1,'Prod smoke','free') returning id", [`org_smoke_${Date.now()}`])).rows;
    orgId = o.id;
    await pool.query("insert into api_keys (org_id, name, prefix, key_hash) values ($1,'smoke',$2,$3)", [orgId, KEY.slice(0, 8), sha(KEY)]);
  });
  test.afterAll(async () => {
    await pool?.query("delete from organizations where id=$1", [orgId]);
    await pool?.end();
  });

  test("public pages, metadata and the hidden design page", async ({ request }) => {
    for (const p of ["/", "/pricing", "/docs", "/robots.txt", "/api/health"]) expect((await request.get(p)).status(), p).toBe(200);
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
    expect((await request.get("/design")).status()).toBe(404);
  });

  test("the dashboard fails closed without auth configured, never as a demo user", async ({ request }) => {
    const res = await request.get("/app");
    expect(res.status()).toBe(500);
    expect(await res.text()).not.toContain("Acme Platform Team");
  });

  test("API over real Postgres: scan, charge, limits and auth", async ({ request }) => {
    const headers = { authorization: `Bearer ${KEY}` };
    const ok = await request.post("/api/v1/scans", { headers, data: { text: LOG } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.findings[0].severity).toBe("critical"); // detector and native RE2 work in the production bundle

    const [u] = (await pool.query("select scans_used from usage_counters where org_id=$1", [orgId])).rows;
    expect(u.scans_used).toBe(1);

    expect((await request.post("/api/v1/scans", { headers: { authorization: "Bearer nope" }, data: { text: LOG } })).status()).toBe(401);
    expect((await request.post("/api/v1/scans", { headers, data: { text: "x".repeat(7 * 1024 * 1024) } })).status()).toBe(413);
    expect((await request.post("/api/v1/scans", { headers, data: { text: "   " } })).status()).toBe(400);

    await pool.query("update usage_counters set scans_used = 20 where org_id=$1", [orgId]); // free plan limit
    expect((await request.post("/api/v1/scans", { headers, data: { text: LOG } })).status()).toBe(402);
  });

  test("webhooks and internal endpoints refuse unsigned calls", async ({ request }) => {
    expect((await request.post("/api/webhooks/stripe", { data: {} })).status()).toBe(400);
    expect((await request.post("/api/webhooks/clerk", { data: {} })).status()).toBe(400);
    expect((await request.get("/api/internal/usage?org=x")).status()).toBe(401);
    expect((await request.get("/api/cron/purge")).status()).toBe(401);
  });
});
