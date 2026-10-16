import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Fail the test on console errors and 5xx responses. */
export function guard(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  return () => expect(problems, problems.join("\n")).toEqual([]);
}

export async function a11y(page: Page) {
  // After a client navigation or a server action the title can be briefly empty on a cold dev compile.
  // Wait for the settled page; the scan still fails if the title never appears.
  await expect(page).toHaveTitle(/.+/);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
}

export const LOG = [
  ...Array.from({ length: 60 }, (_, i) => `2026-10-13T09:00:${String(i % 60).padStart(2, "0")}Z INFO api GET /v1/items 200 ${20 + (i % 9)}ms`),
  "2026-10-13T09:01:11Z ERROR db connection refused to 10.0.3.12:5432",
  "2026-10-13T09:01:52Z FATAL worker out of memory, killed process 8841",
].join("\n");

export async function runScan(page: Page, text: string) {
  await page.goto("/app/scan");
  await page.getByLabel("Log sample").fill(text);
  await page.getByRole("button", { name: /run scan|scanning/i }).click();
}
