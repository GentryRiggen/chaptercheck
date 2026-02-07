import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Global auth setup — runs first, saves storageState
    {
      name: "global-setup",
      testMatch: /global\.setup\.ts/,
      testDir: ".",
    },

    // Primary desktop tests (excludes responsive-only tests)
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.clerk/user.json",
      },
      dependencies: ["global-setup"],
      testIgnore: /responsive\.spec\.ts/,
    },

    // Mobile responsive tests (Chromium with iPhone 14 viewport)
    {
      name: "mobile-chrome",
      use: {
        ...devices["iPhone 14"],
        // Override to use Chromium instead of WebKit (only chromium installed)
        channel: undefined,
        browserName: "chromium",
        storageState: "e2e/.clerk/user.json",
      },
      dependencies: ["global-setup"],
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
