import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for performance and bundle size tests.
 * Runs against a production build served via `vite preview`.
 *
 * Projects:
 *   - bundle-size: Tests that verify JavaScript bundle sizes stay within budget.
 *   - load-time: Tests that measure runtime performance (LCP, load times, etc.).
 *
 * Usage:
 *   npx playwright test --config playwright.perf.config.ts                     # Run all perf tests
 *   npx playwright test --config playwright.perf.config.ts --project bundle-size  # Bundle size only
 *   npx playwright test --config playwright.perf.config.ts --project load-time    # Load time only
 */
export default defineConfig({
  testDir: './tests/performance',
  timeout: 180000,
  retries: 0,
  workers: 1, // Run serially to avoid port conflicts

  use: {
    baseURL: 'http://localhost:4173',
    // Disable caching to measure fresh bundle loads
    bypassCSP: true,
  },

  projects: [
    {
      name: 'bundle-size',
      testMatch: /bundle-size\.spec\.ts$/,
    },
    {
      name: 'load-time',
      testMatch: /.*-load-time\.spec\.ts$/,
    },
  ],

  // Build and serve the production bundle before running tests
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes for build + server start
  },

  reporter: [['list'], ['html', { open: 'never' }]],
});
