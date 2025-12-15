import { test, expect } from '@playwright/test';
import { APP_URL } from './test-utils';

test.describe('Service Worker', () => {
  test.beforeEach(async ({ page }) => {
    // Bootstrap the app manually to avoid double reloads and strict networkidle checks
    // 1. Register mocks
    const { registerMockApis } = await import('./mocks/register-api');
    await registerMockApis(page);

    // 2. Go to app (this installs SW)
    await page.goto(APP_URL);

    // 3. Seed Auth
    const { MOCK_AUTH } = await import('./test-utils');
    await page.evaluate(({ server, token }) => {
      localStorage.setItem('server', server);
      localStorage.setItem('accessToken', token);
      localStorage.setItem('token', token);
    }, MOCK_AUTH);

    // 4. Wait for Service Worker to be ready
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // 5. Reload to ensure the page is controlled by the SW and auth is picked up
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for home to load to ensure we are in a good state
    await page.waitForURL('**/home');
  });

  test('should register and activate service worker', async ({ page }) => {
    const swState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.state;
    });
    expect(swState).toBe('activated');

    // Verify the page is controlled
    const isControlled = await page.evaluate(
      () => !!navigator.serviceWorker.controller
    );
    expect(isControlled).toBe(true);
  });

  test('should serve requests from cache', async ({ page }) => {
    // Reload to capture the navigation request
    const response = await page.reload();

    // Verify the main document was served by the Service Worker
    // Note: In dev mode, this might be false if the SW passes through to network
    // But our new SW implementation uses NetworkFirst/CacheFirst even in dev (built via vite plugin)
    expect(response?.fromServiceWorker()).toBe(true);
  });

  test('should work offline', async ({ page, context }) => {
    // Capture console logs and errors to debug offline behavior
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // 1. Ensure critical assets are loaded & cached
    // Wait for the home component to be attached so its JS chunk is fetched
    await expect(page.locator('app-home')).toBeAttached();

    // Wait for internal content to ensure dependencies are loaded
    // app-home loads timeline dynamically, but the shell should be there
    await expect(page.locator('app-home')).toBeAttached();

    // Wait a bit for the Service Worker to cache the lazy-loaded chunks
    await page.waitForTimeout(5000);

    // 2. Simulate Offline Mode
    await context.setOffline(true);

    try {
      // 3. Reload page to test offline load
      await page.reload();

      // 4. Verify app shell loads from cache
      // The app-index shell should always be available offline
      await expect(page.locator('app-index')).toBeVisible();

      // The root route (/) renders app-login, so that's what we expect offline
      await expect(page.locator('app-login').first()).toBeAttached({
        timeout: 10000,
      });

      // Log any errors that occurred
      if (consoleErrors.length > 0) {
        console.log('Console errors during offline test:', consoleErrors);
      }
    } finally {
      // Cleanup: restore online state
      await context.setOffline(false);
    }
  });

  test('should show update notification', async ({ page }) => {
    // Simulate the custom event dispatched by index.html
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pwa-update-available', {
          detail: {
            updateServiceWorker: () => console.log('Mock update triggered'),
          },
        })
      );
    });

    // Verify the toast appears (based on src/components/pwa-update.ts)
    // The toast uses md-toast component
    const toast = page.locator('md-toast[message="New version available"]');
    await expect(toast).toBeVisible();

    // Verify the action button
    await expect(toast).toHaveAttribute('action-label', 'Reload');
  });
});
