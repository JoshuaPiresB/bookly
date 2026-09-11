import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const database = new URL(process.env.TEST_DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(database.hostname) || !database.pathname.endsWith("_test")) throw new Error("E2E exige TEST_DATABASE_URL local terminado em _test.");
const baseURL = "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, screenshot: "only-on-failure", trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL || undefined } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3001",
    url: `${baseURL}/login`, reuseExistingServer: false, timeout: 60000,
    env: { NODE_ENV: "production", DATABASE_URL: database.toString(), DIRECT_URL: database.toString(), NEXTAUTH_URL: baseURL },
  },
});
