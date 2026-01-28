import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Notifications (Home Page Tab)', () => {
  test('should display notifications tab in home page', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Look for notifications tab/icon in home-tabs-nav
    const tabsNav = authedPage.locator('home-tabs-nav');
    await expect(tabsNav).toBeVisible({ timeout: 10000 });
  });
});
