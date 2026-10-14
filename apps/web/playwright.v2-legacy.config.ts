import { defineConfig } from "@playwright/test";
import original from "./playwright.config";
export default defineConfig({
  ...original,
  webServer: [],
  testIgnore: [
    ...(process.env.E2E_OTP_ONLY === "1" ? [] : ["**/otp-admin.spec.ts"]),
    ...(process.env.E2E_SEO_FIXTURES === "1" ? [] : ["**/seo.spec.ts"]),
  ],
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  retries: 0,
  use: { ...original.use, baseURL: "http://127.0.0.1:3200" },
  projects: original.projects?.map((project) => ({
    ...project,
    use: {
      ...project.use,
      ...(project.name === "chromium"
        ? { channel: process.platform === "win32" ? "msedge" : undefined }
        : {}),
    },
  })),
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/v2-legacy-results.json" }],
  ],
});
