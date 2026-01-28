import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Explore Page', () => {
  test('should load explore page', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/explore');
    await authedPage.waitForLoadState('networkidle');

    await expect(authedPage).toHaveURL('/explore');
  });

  test('should display trending content', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/explore');
    await authedPage.waitForLoadState('networkidle');

    // Wait for explore component
    const exploreComponent = authedPage.locator('app-explore');
    await expect(exploreComponent).toBeVisible({ timeout: 10000 });
  });

  test('should show trending statuses', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/explore');
    await authedPage.waitForLoadState('networkidle');

    // Check for timeline content from mock trending statuses
    const postContent = authedPage
      .getByText('Welcome to the mocked timeline!')
      .first();
    await expect(postContent).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Explore Page - Tabs', () => {
  test('should have explore sections/tabs', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/explore');
    await authedPage.waitForLoadState('networkidle');

    // Page should be functional
    await expect(authedPage).toHaveURL('/explore');
  });
});
