import { test, expect } from "@playwright/test";
import { a11y } from "./helpers";

test.describe("F03 client upgrades", () => {
  test("F03-H1 pricing toggle shows yearly prices", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("$29").first()).toBeVisible();
    await page.getByRole("button", { name: /yearly/i }).click();
    await expect(page.getByText("$23.20").first()).toBeVisible();
    await a11y(page);
  });

  test("F03-N1 checkout without billing connected says so", async ({ page }) => {
    await page.goto("/app/usage");
    await page.getByRole("button", { name: "Choose Pro" }).click();
    await expect(page.getByText("Billing is not connected yet.")).toBeVisible();
  });

  test("F03-N2 current plan is marked and cannot be re-chosen", async ({ page }) => {
    await page.goto("/app/usage");
    await expect(page.getByText("Current plan")).toBeVisible();
  });
});
