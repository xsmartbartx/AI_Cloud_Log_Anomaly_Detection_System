import { test, expect } from "@playwright/test";
import { a11y, guard } from "./helpers";

test.describe("F02 client reviews activity", () => {
  test("F02-H1 overview, history, result", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Recent scans" })).toBeVisible();
    await a11y(page);
    await page.goto("/app/scans");
    await expect(page.getByRole("table")).toBeVisible();
    await a11y(page);
    await page.getByRole("link").filter({ hasText: /^[0-9a-f]{8}-/ }).first().click();
    // Retention is off by default: counts only, findings were not kept.
    await expect(page.getByText("Findings were not kept")).toBeVisible();
    await a11y(page);
    done();
  });

  test("F02-N1 unknown scan id is a 404", async ({ page }) => {
    const res = await page.goto("/app/scans/00000000-0000-0000-0000-000000000000");
    expect(res?.status()).toBe(404);
    const bad = await page.goto("/app/scans/not-an-id");
    expect(bad?.status()).toBe(404);
  });

  test("F02-H2 retention on keeps redacted findings, off stops", async ({ page }) => {
    await page.goto("/app/settings");
    await page.getByLabel("Keep findings for new scans").check();
    await page.getByRole("button", { name: "Save" }).click();
    await page.goto("/app/scan");
    await page.getByRole("button", { name: "Use example" }).click();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await page.goto("/app/scans");
    await page.getByRole("link").filter({ hasText: /^[0-9a-f]{8}-/ }).first().click();
    await expect(page.getByText(/out of memory/i).first()).toBeVisible();
    await expect(page.getByText("abcdef1234567890abcdef")).toHaveCount(0);
    await page.goto("/app/settings");
    await page.getByLabel("Keep findings for new scans").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
  });

  test("F02-A1 every app screen passes the accessibility scan", async ({ page }) => {
    for (const p of ["/app/scan", "/app/rules", "/app/usage", "/app/keys", "/app/settings", "/pricing", "/docs", "/sign-in"]) {
      await page.goto(p);
      await a11y(page);
    }
  });
});
