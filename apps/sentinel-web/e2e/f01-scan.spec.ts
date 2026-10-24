import { test, expect } from "@playwright/test";
import { a11y, guard, LOG, runScan } from "./helpers";

test.describe("F01 visitor scans a log", () => {
  test("F01-H1 landing to result", async ({ page }) => {
    const done = guard(page);
    await page.goto("/");
    await a11y(page);
    await page.getByRole("link", { name: "Open Linegist" }).first().click();
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("link", { name: "New scan" }).first().click();
    await page.getByRole("button", { name: "Use example" }).click();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText(/out of memory/i).first()).toBeVisible();
    await a11y(page);
    done();
  });

  test("F01-E1 empty input shows an error and is not charged", async ({ page }) => {
    await page.goto("/app");
    const before = await page.getByText(/of \d+/).first().innerText();
    await page.goto("/app/scan");
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByText("Paste at least one log line.")).toBeVisible();
    await page.goto("/app");
    await expect(page.getByText(/of \d+/).first()).toHaveText(before);
  });

  test("F01-E2 double click charges once", async ({ page }) => {
    await page.goto("/app");
    const read = async () => Number((await page.getByText("Scans this month").nth(0).locator("xpath=following-sibling::p[1]").innerText()).replace(/,/g, ""));
    const before = await read();
    await page.goto("/app/scan");
    await page.getByLabel("Log sample").fill(LOG);
    const run = page.getByRole("button", { name: "Run scan" });
    await run.dblclick();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await page.goto("/app");
    expect(await read()).toBe(before + 1);
  });

  test("F01-E3 very long line and emoji are handled", async ({ page }) => {
    const done = guard(page);
    await runScan(page, ["ERROR " + "x".repeat(6000), "ERROR ünïcödé 日本語 🚨 failed", ...LOG.split("\n").slice(0, 30)].join("\n"));
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText(/🚨/)).toBeVisible();
    done();
  });

  test("F01-E4 secrets are masked in results", async ({ page }) => {
    await runScan(page, ["ERROR login failed password=hunter2 for user", ...LOG.split("\n").slice(0, 30)].join("\n"));
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText("hunter2")).toHaveCount(0);
    await expect(page.getByText(/\[redacted\]/).first()).toBeVisible();
  });

  test("F01-E5 clean log says nothing stood out", async ({ page }) => {
    await runScan(page, LOG.split("\n").slice(0, 60).join("\n"));
    await expect(page.getByText("Nothing stood out")).toBeVisible();
  });

  test("F01-E6 sample over the line cap is rejected without charge", async ({ page }) => {
    await page.goto("/app/scan");
    await page.getByLabel("Log sample").evaluate((el: HTMLTextAreaElement, v) => { el.value = v; }, "ok line\n".repeat(50_001));
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByText(/more than 50,000 lines/)).toBeVisible();
  });

  test("F01-E7 finding expands with the reason (keyboard)", async ({ page }) => {
    await runScan(page, LOG);
    const row = page.getByRole("button", { expanded: false }).filter({ hasText: /out of memory/i });
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Matched rule: Out of memory/)).toBeVisible();
  });

  test("F01-E8 refresh mid-flow keeps the app usable", async ({ page }) => {
    await runScan(page, LOG);
    await page.reload();
    await expect(page.getByRole("button", { name: "Run scan" })).toBeVisible();
  });

  test("F01-E9 mobile width has no horizontal page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ["/", "/pricing", "/docs", "/app", "/app/scan", "/app/scans", "/app/rules", "/app/usage", "/app/keys", "/app/settings"]) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${p} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });
});
