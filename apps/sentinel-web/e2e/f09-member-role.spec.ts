import { test, expect } from "@playwright/test";
import { a11y, guard } from "./helpers";

// Runs as a member (DEMO_ROLE=member, second dev server). Members can scan but not manage.
test.describe("Member role", () => {
  test("F09-H1 member can scan", async ({ page }) => {
    await page.goto("/app/scan");
    await page.getByRole("button", { name: "Use example" }).click();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  });

  test("F09-N3 member cannot ignore lines", async ({ page }) => {
    await page.goto("/app/scan");
    await page.getByRole("button", { name: "Use example" }).click();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await page.getByRole("button", { expanded: false }).filter({ hasText: /out of memory/i }).click();
    await expect(page.getByText(/Matched rule: Out of memory/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ignore lines like this" })).toHaveCount(0);
  });

  test("F09-N1 member sees no key, rule or retention controls, and nothing crashes", async ({ page }) => {
    const done = guard(page);
    await page.goto("/app/keys");
    await expect(page.getByText("Only owners and admins can create or revoke keys.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create key" })).toHaveCount(0);
    await a11y(page);

    await page.goto("/app/rules");
    await expect(page.getByText("Only owners and admins can add or change rules.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add rule" })).toHaveCount(0);
    await a11y(page);

    await page.goto("/app/settings");
    await expect(page.getByLabel("Keep findings for new scans")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
    await a11y(page);
    done();
  });

  test("F09-N2 a forged action from a member is a harmless no-op", async ({ page }) => {
    await page.goto("/app/settings");
    // Enable the controls in the DOM and submit: the server must ignore it, not crash.
    await page.evaluate(() => document.querySelectorAll("input[name=retain], button[type=submit]").forEach((el) => ((el as HTMLInputElement).disabled = false)));
    await page.getByLabel("Keep findings for new scans").check();
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByLabel("Keep findings for new scans")).not.toBeChecked();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
