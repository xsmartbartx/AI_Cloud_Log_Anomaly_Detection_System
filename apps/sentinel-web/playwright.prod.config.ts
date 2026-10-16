import { defineConfig } from "@playwright/test";

/**
 * Smoke test against a production build (`next start`) with a real Postgres over DATABASE_URL.
 * Covers what the dev-server suite cannot: the production bundle (native RE2), the pg driver path,
 * body-size limits, and failing closed when auth is not configured.
 * Needs DATABASE_URL with migrations applied (npm run db:migrate).
 */
const PORT = 3200;

export default defineConfig({
  testDir: "./e2e-prod",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_URL: process.env.DATABASE_URL ?? "", NODE_ENV: "production" },
  },
});
