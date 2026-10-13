import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PRODUCTION_TEST_ORIGIN;
if (!baseURL || !/^https:\/\/localhost:\d+$/.test(baseURL)) {
  throw new Error("An isolated localhost HTTPS acceptance origin is required");
}
export default defineConfig({
  testDir: "./tests/production",
  workers: 1,
  timeout: 120_000,
  retries: 0,
  forbidOnly: true,
  reporter: [["list"], ["json", { outputFile: `../../docs/qa/${process.env.MAKAN_QA_PHASE ?? "step10"}/production-browser.json` }]],
  use: { baseURL, ignoreHTTPSErrors: true, trace: "off", screenshot: "off" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
