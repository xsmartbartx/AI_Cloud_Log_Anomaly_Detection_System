import { test } from "@playwright/test";
import { a11y } from "./helpers";

test.use({ colorScheme: "dark" });

test.describe("Dark theme", () => {
  test("A2 every screen passes the accessibility scan in dark mode", async ({ page }) => {
    for (const p of ["/", "/pricing", "/docs", "/app", "/app/scan", "/app/scans", "/app/rules", "/app/usage", "/app/keys", "/app/settings"]) {
      await page.goto(p);
      await a11y(page);
    }
  });
});
