import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateTo } from './test-utils';
import type { Page } from '@playwright/test';

// Helper function to get header button locators
function getHeaderButtons(page: Page) {
  return {
    settings: page.locator('app-header').locator('#settings-button'),
    theme: page.locator('app-header').locator('#open-button'),
  };
}

test.describe('Header Buttons Visibility', () => {
  test.beforeEach(async ({ isMobile }) => {
    if (isMobile) {
      test.skip();
    }
  });

  test('settings and theme buttons are visible on home page', async ({
    page,
  }) => {
    await bootstrapApp(page);

    // Wait for home page to load
    await expect(page.locator('app-home')).toBeVisible();

    // Settings and theme buttons should be visible on home
    const { settings, theme } = getHeaderButtons(page);

    await expect(settings).toBeVisible();
    await expect(theme).toBeVisible();
  });

  test('settings and theme buttons are hidden on profile page', async ({
    page,
  }) => {
    await bootstrapApp(page);
    await navigateTo(page, '/account');

    // Wait for profile page to load
    await expect(page.locator('app-profile')).toBeVisible();

    // Settings and theme buttons should NOT be visible
    const { settings, theme } = getHeaderButtons(page);

    await expect(settings).not.toBeVisible();
    await expect(theme).not.toBeVisible();
  });

  test('settings and theme buttons are hidden on search page', async ({
    page,
  }) => {
    await bootstrapApp(page);
    await navigateTo(page, '/search');

    // Wait for search page to load
    await expect(page.locator('search-page')).toBeVisible();

    // Settings and theme buttons should NOT be visible
    const { settings, theme } = getHeaderButtons(page);

    await expect(settings).not.toBeVisible();
    await expect(theme).not.toBeVisible();
  });

  test('settings and theme buttons are hidden on about page', async ({
    page,
  }) => {
    await bootstrapApp(page);
    await navigateTo(page, '/about');

    // Wait for about page to load
    await expect(page.locator('app-about')).toBeVisible();

    // Settings and theme buttons should NOT be visible
    const { settings, theme } = getHeaderButtons(page);

    await expect(settings).not.toBeVisible();
    await expect(theme).not.toBeVisible();
  });

  test('settings and theme buttons are hidden on followers page', async ({
    page,
  }) => {
    await bootstrapApp(page);
    await navigateTo(page, '/followers');

    // Wait for followers page to load
    await expect(page.locator('app-followers')).toBeVisible();

    // Settings and theme buttons should NOT be visible
    const { settings, theme } = getHeaderButtons(page);

    await expect(settings).not.toBeVisible();
    await expect(theme).not.toBeVisible();
  });
});
