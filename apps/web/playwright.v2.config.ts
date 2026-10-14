import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/v2",
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/v2-results.json" }],
  ],
  use: {
    actionTimeout: 30000,
    baseURL: "http://127.0.0.1:3200",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.platform === "win32" ? "msedge" : undefined,
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
