import { test, expect } from "@playwright/test";
import { guard, LOG, runScan } from "./helpers";

test.describe("F11 alerts and new-since-last-scan", () => {
  test("F11-N1 unsafe webhook URLs are rejected", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app/settings");
    await page.getByLabel(/Webhook URL/).fill("http://example.com/hook");
    await page.getByRole("button", { name: "Set webhook" }).click();
    await expect(page.getByText(/Only https:\/\/ URLs are allowed/)).toBeVisible();
    await page.getByLabel(/Webhook URL/).fill("https://169.254.169.254/latest");
    await page.getByRole("button", { name: "Set webhook" }).click();
    await expect(page.getByText(/not reachable from the internet/)).toBeVisible();
    done();
  });

  test("F11-H1 save a webhook, see the signing secret, remove it", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app/settings");
    await page.getByLabel(/Webhook URL/).fill("https://example.com/linegist-hook");
    await page.getByLabel("Alert from").selectOption("medium");
    await page.getByRole("button", { name: "Set webhook" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Webhook URL/)).toHaveValue("https://example.com/linegist-hook");
    await expect(page.getByText(/whsec_[0-9a-f]{20,}/)).toBeVisible();
    await expect(page.getByText(/Last delivery: none yet/)).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByLabel(/Webhook URL/)).toHaveValue("");
    done();
  });

  test("F11-H2 new since last scan marks only what is new, and turns off cleanly", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app/settings");
    await page.getByLabel("Mark new findings").check();
    await page.getByRole("button", { name: "Apply" }).click();
    await page.reload();
    await expect(page.getByLabel("Mark new findings")).toBeChecked();

    await runScan(page, LOG);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText("New", { exact: true })).toHaveCount(0); // first scan: no baseline yet

    await runScan(page, `${LOG}\n2026-10-13T09:02:30Z ERROR cache miss storm for tenant 77`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText("New", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { expanded: false }).filter({ hasText: /cache miss storm/ }).getByText("New", { exact: true })).toBeVisible();

    await page.goto("/app/settings");
    await page.getByLabel("Mark new findings").uncheck();
    await page.getByRole("button", { name: "Apply" }).click();
    await runScan(page, `${LOG}\n2026-10-13T09:02:30Z ERROR cache miss storm for tenant 77`);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText("New", { exact: true })).toHaveCount(0);
    done();
  });
});
