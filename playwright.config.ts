import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  testMatch: "**/*.e2e-spec.ts",
  use: {
    trace: "on-first-retry",
    baseURL: `http://localhost:${process.env.PORT}`,
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [{ name: "Google Chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
});
