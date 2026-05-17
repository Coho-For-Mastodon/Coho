import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for runtime performance tests (load time, LCP, etc.).
 * Runs against a production build served via `vite preview`.
 */
export default defineConfig({
  testDir: './tests/performance',
  testMatch: /.*-load-time\.spec\.ts$/,
  timeout: 180000,
  retries: 0,
  workers: 1,

  use: {
    baseURL: 'http://localhost:4173',
    bypassCSP: true,
  },

  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },

  reporter: [['list'], ['html', { open: 'never' }]],
});
