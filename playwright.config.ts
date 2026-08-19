import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for Nexus Chat Application.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Maximum time one test can run for */
  timeout: 45_000,
  expect: {
    /* Timeout for each individual assertion (e.g. expect(...).toBeVisible()) */
    timeout: 8_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI for multi-user real-time state */
  workers: 1,
  /* Reporter to use */
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    /* Collect trace when retrying the failed test. */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run local dev server before starting the tests if not already running */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
