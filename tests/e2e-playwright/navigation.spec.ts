import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Navigation', () => {
  test('should navigate from home to explore', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Click on explore link/button
    const exploreLink = authedPage.getByRole('link', { name: /explore/i });
    if (await exploreLink.isVisible()) {
      await exploreLink.click();
      await expect(authedPage).toHaveURL('/explore');
    }
  });

  test('should navigate directly to explore page', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/explore');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/explore');
  });

  test('should handle browser back navigation', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.goto('/explore');
    await authedPage.waitForLoadState('networkidle');

    // Go back
    await authedPage.goBack();
    await expect(authedPage).toHaveURL('/home');
  });
});

test.describe('Deep Links', () => {
  test('should load hashtag page via deep link', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/hashtag');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/hashtag');
  });

  test('should load account page via deep link', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/account');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/account');
  });
});
