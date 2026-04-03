// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E config for Spopeer.
 *
 * Usage:
 *   npx playwright test              # run all E2E tests
 *   npx playwright test --ui         # interactive mode
 *   npx playwright test --headed     # visible browser
 *
 * Env vars:
 *   BASE_URL  — defaults to http://localhost:5000
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,          // auth flows are sequential
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],

  /* Start the server before E2E tests (local dev only) */
  webServer: process.env.CI ? undefined : {
    command: 'node server/server.js',
    port: 5000,
    timeout: 30_000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'e2e-test-secret',
      DB_HOST: 'localhost',
      DB_NAME: 'spopeer_test',
      DB_USER: 'postgres',
      DB_PASSWORD: 'postgres'
    }
  }
});
