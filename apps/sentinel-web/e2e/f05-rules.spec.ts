import { test, expect } from "@playwright/test";
import { LOG, runScan } from "./helpers";

test.describe("F05 client tunes rules", () => {
  test("F05-N1 invalid and over-long patterns are rejected", async ({ page }) => {
    await page.goto("/app/rules");
    await page.getByLabel("Name").fill("bad");
    await page.getByLabel(/Pattern/).fill("(unclosed");
    await page.getByRole("button", { name: "Add rule" }).click();
    await expect(page.getByText(/not a valid regular expression/i)).toBeVisible();
    await page.getByLabel(/Pattern/).fill("a".repeat(201));
    await page.getByRole("button", { name: "Add rule" }).click();
    await expect(page.getByText(/200 characters/)).toBeVisible();
  });

  test("F05-H1 custom rule flags a line, turning it off stops it", async ({ page }) => {
    await page.goto("/app/rules");
    await page.getByLabel("Name").fill("payments");
    await page.getByLabel(/Pattern/).fill("gateway.*503");
    await page.getByLabel("Severity").selectOption("high");
    await page.getByRole("button", { name: "Add rule" }).click();
    await expect(page.getByRole("cell", { name: "payments" })).toBeVisible();

    const text = [...LOG.split("\n").slice(0, 40), "payment gateway returned 503 to client"].join("\n");
    await runScan(page, text);
    await expect(page.getByText(/gateway returned 503/)).toBeVisible();

    await page.goto("/app/rules");
    await page.getByRole("button", { name: "Turn off" }).click();
    await runScan(page, text);
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByText(/Matched rule: payments/)).toHaveCount(0);

    await page.goto("/app/rules");
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No custom rules")).toBeVisible();
  });
});
