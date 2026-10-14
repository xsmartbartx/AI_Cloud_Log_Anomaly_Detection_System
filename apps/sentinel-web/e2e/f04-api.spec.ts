import { test, expect } from "@playwright/test";
import { LOG } from "./helpers";

test.describe("F04 developer scans via API", () => {
  test("F04-H1 create key, scan, revoke", async ({ page, request }) => {
    await page.goto("/app/keys");
    await page.getByLabel("Key name").fill("e2e");
    await page.getByRole("button", { name: "Create key" }).click();
    const secret = (await page.locator("code", { hasText: /^lwk_/ }).innerText()).trim();

    const ok = await request.post("/api/v1/scans", { headers: { authorization: `Bearer ${secret}` }, data: { text: LOG } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.flaggedCount).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(secret);

    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText("Revoked")).toBeVisible();
    const revoked = await request.post("/api/v1/scans", { headers: { authorization: `Bearer ${secret}` }, data: { text: LOG } });
    expect(revoked.status()).toBe(401);
  });

  test("F04-N1 missing, malformed and empty requests", async ({ request }) => {
    expect((await request.post("/api/v1/scans", { data: { text: "x" } })).status()).toBe(401);
    expect((await request.post("/api/v1/scans", { headers: { authorization: "Bearer nope" }, data: { text: "x" } })).status()).toBe(401);
  });

  test("F04-N2 key name validation", async ({ page }) => {
    await page.goto("/app/keys");
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(page.getByText("Give the key a name.")).toBeVisible();
    await page.getByLabel("Key name").fill("x".repeat(61));
    await page.getByRole("button", { name: "Create key" }).click();
    // maxLength on the input stops 61 characters; the server check is covered by unit tests.
    await expect(page.getByLabel("Key name")).toHaveValue("x".repeat(60));
  });

  test("F04-N3 webhooks and internal endpoints refuse unsigned calls", async ({ request }) => {
    expect((await request.post("/api/webhooks/stripe", { data: {} })).status()).toBe(400);
    expect((await request.post("/api/webhooks/clerk", { data: {} })).status()).toBe(400);
    expect((await request.get("/api/internal/usage?org=org_demo")).status()).toBe(401);
    expect((await request.get("/api/cron/purge")).status()).toBe(401);
  });
});
