import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Profile Page (Own Account)', () => {
  test('should load own profile page', async ({ authedPage }) => {
    // Navigate to own profile at /account
    await gotoWithAuth(authedPage, '/account');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/account');
  });

  test('should display profile component', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/account');
    await authedPage.waitForLoadState('networkidle');

    // Check for app-profile page component
    const profilePage = authedPage.locator('app-profile');
    await expect(profilePage).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Profile Page - Followers/Following', () => {
  test('should navigate to followers page', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/followers');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/followers');
  });

  test('should navigate to following page', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/following');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/following');
  });
});
