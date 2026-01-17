import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for performance/bundle size tests.
 * Runs against a production build served via `vite preview`.
 */
export default defineConfig({
  testDir: './tests/performance',
  timeout: 120000,
  retries: 0,
  workers: 1, // Run serially to avoid port conflicts

  use: {
    baseURL: 'http://localhost:4173',
    // Disable caching to measure fresh bundle loads
    bypassCSP: true,
  },

  // Build and serve the production bundle before running tests
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes for build + server start
  },

  reporter: [['list'], ['html', { open: 'never' }]],
});
