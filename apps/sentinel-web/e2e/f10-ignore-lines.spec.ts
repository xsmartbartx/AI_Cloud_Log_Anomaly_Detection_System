import { test, expect } from "@playwright/test";
import { a11y, guard, LOG, runScan } from "./helpers";

const NOISY = "2026-10-13T09:05:00Z WARN queue drain stalled for 15 seconds";
const input = [...LOG.split("\n"), NOISY].join("\n");

test.describe("F10 ignore lines like this", () => {
  test("F10-H1 ignore a noisy line, rescan, turn the rule off and on, delete it", async ({ page }) => {
    const done = guard(page);
    await runScan(page, input);
    const noisy = page.getByRole("button", { expanded: false }).filter({ hasText: /queue drain stalled/ });
    await expect(noisy).toBeVisible();

    await noisy.click();
    await page.getByRole("button", { name: "Ignore lines like this" }).click();
    const field = page.getByLabel("Pattern to ignore");
    await expect(field).toHaveValue(/queue\\s\+drain\\s\+stalled\\s\+for\\s\+\\d\+/); // numbers became wildcards
    await a11y(page);
    await page.getByRole("button", { name: "Add ignore rule" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Added" })).toBeVisible();

    // The same sample no longer reports it, and real problems still show.
    await runScan(page, input);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText(/queue drain stalled/)).toHaveCount(0);
    await expect(page.getByText(/out of memory/i).first()).toBeVisible();

    // The rule is listed, only the pattern is stored.
    await page.goto("/app/rules");
    await expect(page.getByRole("heading", { name: "Ignored lines" })).toBeVisible();
    await expect(page.getByText(/queue\\s\+drain/)).toBeVisible();
    await a11y(page);

    // Turning it off brings the line back.
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Ignored lines" }) });
    await section.getByRole("button", { name: "Turn off" }).click();
    await runScan(page, input);
    await expect(page.getByText(/queue drain stalled/).first()).toBeVisible();

    await page.goto("/app/rules");
    await section.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Nothing ignored")).toBeVisible();
    done();
  });

  test("F10-N1 a pattern that would match everything is refused", async ({ page }) => {
    await runScan(page, input);
    await page.getByRole("button", { expanded: false }).filter({ hasText: /out of memory/i }).click();
    await page.getByRole("button", { name: "Ignore lines like this" }).click();
    await page.getByLabel("Pattern to ignore").fill(".*");
    await page.getByRole("button", { name: "Add ignore rule" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /specific|too short|almost every/i })).toBeVisible();
    await page.goto("/app/rules");
    await expect(page.getByText("Nothing ignored")).toBeVisible();
  });
});
