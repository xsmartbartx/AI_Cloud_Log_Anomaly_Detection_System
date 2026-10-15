import { test, expect, type Page } from "@playwright/test";

const big = (lines: number, width: number) =>
  Array.from({ length: lines }, (_, i) => `2026-10-13T10:00:00Z INFO job ${String(i).padStart(6, "0")} ok`.padEnd(width, "x")).join("\n");

async function fill(page: Page, text: string) {
  await page.goto("/app/scan");
  await page.getByLabel("Log sample").evaluate((el: HTMLTextAreaElement, v) => { el.value = v; }, text);
}

test.describe("Size limits", () => {
  test("F01-E10 a 3.5 MB sample goes through the web form", async ({ page }) => {
    test.setTimeout(60_000);
    await fill(page, big(49_000, 72)); // about 3.5 MB, over the 1 MB default server-action cap
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 45_000 });
  });

  test("F01-E11 a sample over 4 MB gets a clear message, not a generic failure", async ({ page }) => {
    test.setTimeout(60_000);
    await fill(page, big(49_000, 90)); // about 4.4 MB
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByText(/larger than 4 MB/)).toBeVisible({ timeout: 45_000 });
  });

  test("F04-E1 the API refuses oversize bodies with 413 and accepts a normal one", async ({ page, request }) => {
    await page.goto("/app/keys");
    await page.getByLabel("Key name").fill("size");
    await page.getByRole("button", { name: "Create key" }).click();
    const secret = (await page.locator("code", { hasText: /^lwk_/ }).innerText()).trim();
    const headers = { authorization: `Bearer ${secret}` };
    const huge = await request.post("/api/v1/scans", { headers, data: { text: "x".repeat(7 * 1024 * 1024) } });
    expect(huge.status()).toBe(413);
    const over = await request.post("/api/v1/scans", { headers, data: { text: big(49_000, 90) } });
    expect(over.status()).toBe(413);
    const ok = await request.post("/api/v1/scans", { headers, data: { text: big(1000, 80) } });
    expect(ok.status()).toBe(200);
  });
});
