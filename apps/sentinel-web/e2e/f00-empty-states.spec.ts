import { test, expect } from "@playwright/test";
import { a11y, guard } from "./helpers";

// Runs first (file name order) so the database is still empty.
test.describe("F02 empty states", () => {
  test("F02-E1 overview, history and keys are empty on a fresh org", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app");
    await expect(page.getByText("No scans yet").first()).toBeVisible();
    await a11y(page);
    await page.goto("/app/scans");
    await expect(page.getByText("No scans yet")).toBeVisible();
    await page.goto("/app/keys");
    await expect(page.getByText("No keys yet")).toBeVisible();
    await page.goto("/app/rules");
    await expect(page.getByText("No custom rules")).toBeVisible();
    done();
  });
});
