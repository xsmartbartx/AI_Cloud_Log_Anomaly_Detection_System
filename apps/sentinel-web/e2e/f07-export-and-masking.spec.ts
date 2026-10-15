import { test, expect, type Page } from "@playwright/test";
import { LOG } from "./helpers";

const SECRET_LINE = "ERROR login failed password=hunter2 for user";
const text = [SECRET_LINE, "=SUM(1,1) ERROR failed to parse", ...LOG.split("\n").slice(0, 40)].join("\n");

async function scan(page: Page) {
  await page.goto("/app/scan");
  await page.getByLabel("Log sample").fill(text);
}

test.describe("F08 export and in-browser masking", () => {
  test("F08-H1 with masking on the secret never reaches the server", async ({ page }) => {
    const bodies: string[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/app/scan")) bodies.push(r.postData() ?? ""); });
    await scan(page);
    await expect(page.getByLabel("Mask secrets in this browser before sending")).toBeChecked();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.join("\n")).not.toContain("hunter2");
    expect(bodies.join("\n")).toContain("[redacted]");
  });

  test("F08-E1 with masking off the raw text is sent (proves the check above can fail)", async ({ page }) => {
    const bodies: string[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/app/scan")) bodies.push(r.postData() ?? ""); });
    await scan(page);
    await page.getByLabel("Mask secrets in this browser before sending").uncheck();
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    expect(bodies.join("\n")).toContain("hunter2");
    await expect(page.getByText("hunter2")).toHaveCount(0); // still masked in the result
  });

  test("F08-H2 download CSV and JSON", async ({ page }) => {
    await scan(page);
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();

    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
    expect(csv.suggestedFilename()).toMatch(/^scan-.*\.csv$/);
    const csvText = await (await import("node:fs/promises")).readFile((await csv.path())!, "utf8");
    expect(csvText.split("\r\n")[0]).toBe("rank,line,severity,reason,score,text,detail");
    expect(csvText).not.toContain("hunter2");
    expect(csvText).toContain(`"'=SUM`); // formula neutralised

    const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download JSON" }).click()]);
    const parsed = JSON.parse(await (await import("node:fs/promises")).readFile((await json.path())!, "utf8"));
    expect(parsed.findings.length).toBeGreaterThan(0);
  });

  test("F08-E2 file upload is masked in the browser too", async ({ page }) => {
    const bodies: string[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/app/scan")) bodies.push(r.postData() ?? ""); });
    await page.goto("/app/scan");
    await page.locator('input[type="file"]').setInputFiles({ name: "app.log", mimeType: "text/plain", buffer: Buffer.from(text) });
    await page.getByRole("button", { name: "Run scan" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    expect(bodies.join("\n")).not.toContain("hunter2");
  });
});
