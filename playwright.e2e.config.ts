import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for true E2E tests.
 * Runs against the dev server with mocked API responses.
 */
export default defineConfig({
  testDir: './tests/e2e-playwright',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // WebKit/Safari skipped - has issues with addInitScript localStorage injection
    // TODO: Investigate webkit-specific auth setup
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-e2e' }],
  ],

  outputDir: 'test-results-e2e',
});
