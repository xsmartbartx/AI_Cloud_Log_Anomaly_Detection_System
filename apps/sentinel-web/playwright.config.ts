import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const MEMBER_PORT = 3101;
const chrome = { ...devices["Desktop Chrome"], channel: "chrome" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // one shared local database per server; files run in name order
  reporter: [["list"]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", testIgnore: /f09-member-role/, use: { ...chrome, baseURL: `http://localhost:${PORT}` } },
    { name: "member", testMatch: /f09-member-role/, use: { ...chrome, baseURL: `http://localhost:${MEMBER_PORT}` } },
  ],
  webServer: [
    {
      // Fresh database every run. Uses the installed Chrome, so no browser download.
      command: `rm -rf .data/e2e && SENTINEL_DATA_DIR=.data/e2e npx next dev -p ${PORT}`,
      port: PORT,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Second server, signed in as a member, with its own database and build directory.
      command: `rm -rf .data/e2e-member && SENTINEL_DATA_DIR=.data/e2e-member DEMO_ROLE=member NEXT_DIST_DIR=.next-member npx next dev -p ${MEMBER_PORT}`,
      port: MEMBER_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
