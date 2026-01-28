import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Home Page', () => {
  test('should load home page when authenticated', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');

    // Wait for the page to load
    await authedPage.waitForLoadState('networkidle');

    // Should stay on home page
    await expect(authedPage).toHaveURL('/home');
  });

  test('should display timeline posts', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Wait for timeline to render - use more specific selector
    const timeline = authedPage
      .locator('app-timeline.homeTimeline, app-timeline[timelinetype="home"]')
      .first();
    await expect(timeline).toBeVisible({ timeout: 10000 });

    // Check that mock content appears
    const postContent = authedPage
      .getByText('Welcome to the mocked timeline!')
      .first();
    await expect(postContent).toBeVisible({ timeout: 10000 });
  });

  test('should display second timeline post', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Check second post content
    const secondPost = authedPage
      .getByText('Timeline post number two.')
      .first();
    await expect(secondPost).toBeVisible({ timeout: 10000 });
  });
});
