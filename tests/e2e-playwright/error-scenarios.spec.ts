import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Error Scenarios', () => {
  test('should show error state when timeline returns 500', async ({
    authedPage,
  }) => {
    // Override the timeline route to return a server error
    await authedPage.route('**/api/v1/timelines/home*', (route) => {
      route.fulfill({
        status: 500,
        json: { error: 'Internal Server Error' },
      });
    });

    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // The app should not crash — page should still be on /home
    await expect(authedPage).toHaveURL('/home');

    // Timeline posts should NOT be visible since the API failed
    const postContent = authedPage
      .getByText('Welcome to the mocked timeline!')
      .first();
    await expect(postContent).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle 401 unauthorized on timeline load', async ({
    authedPage,
  }) => {
    // Override timeline to return 401 (expired token)
    await authedPage.route('**/api/v1/timelines/home*', (route) => {
      route.fulfill({
        status: 401,
        json: { error: 'The access token was revoked' },
      });
    });

    await gotoWithAuth(authedPage, '/home');

    // Wait for the app to process the 401; it may redirect to login
    // or stay on home with no content. Either is acceptable.
    await authedPage.waitForTimeout(3000);

    const url = authedPage.url();
    const hasTimeline = await authedPage
      .getByText('Welcome to the mocked timeline!')
      .isVisible()
      .catch(() => false);

    // Either the user was redirected away from /home, or the timeline is empty
    expect(url.includes('/home') && hasTimeline).toBe(false);
  });

  test('should rollback favourite on server error', async ({ authedPage }) => {
    // The favourite action goes through a Firebase function URL (/boost),
    // not the Mastodon API. Abort the request to trigger a real fetch error.
    await authedPage.route('**/boost', (route) => {
      route.abort('failed');
    });

    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    const firstPost = authedPage.locator('timeline-item').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });

    // Verify initial state is unfavourited
    const favButton = firstPost.locator('md-button[aria-label="Favourite"]');
    await expect(favButton).toBeVisible({ timeout: 10000 });
    await expect(favButton).toHaveAttribute('aria-pressed', 'false');

    // Click favourite — optimistic UI should appear briefly then rollback
    await favButton.click();

    // After the network error, withOptimisticUpdate should roll back
    // (navigator.onLine is true in Playwright, so it's treated as a real error)
    const revertedButton = firstPost.locator(
      'md-button[aria-label="Favourite"]'
    );
    await expect(revertedButton).toHaveAttribute('aria-pressed', 'false', {
      timeout: 10000,
    });
  });

  test('should handle compose failure gracefully', async ({ authedPage }) => {
    // Abort the create status request to trigger a real fetch error.
    // publishPost uses raw fetch that doesn't throw on HTTP errors,
    // so we need to abort to simulate a network failure.
    await authedPage.route('**/api/v1/statuses', (route) => {
      if (route.request().method() === 'POST') {
        route.abort('failed');
      } else {
        route.fallback();
      }
    });

    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Open compose via reply
    const replyButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Reply"]');
    await expect(replyButton).toBeVisible({ timeout: 10000 });
    await replyButton.click();

    const dialog = authedPage.locator('post-dialog md-dialog#notify-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Type something
    const textArea = authedPage.locator('post-composer md-text-area').first();
    await expect(textArea).toBeVisible({ timeout: 10000 });
    await textArea.click();
    await authedPage.keyboard.press('Meta+a');
    await authedPage.keyboard.press('Backspace');
    await authedPage.keyboard.type('This post should fail to publish');

    // Click publish
    const publishButton = authedPage
      .locator(
        'post-dialog md-dialog#notify-dialog md-button[variant="filled"][pill]'
      )
      .first();
    await expect(publishButton).toBeEnabled({ timeout: 10000 });
    await publishButton.click();

    // App should not crash after the network error
    await authedPage.waitForTimeout(3000);
    const body = authedPage.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle rate limiting (429) without crashing', async ({
    authedPage,
  }) => {
    // Override timeline to return 429
    await authedPage.route('**/api/v1/timelines/home*', (route) => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '30' },
        json: { error: 'Rate limit exceeded' },
      });
    });

    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // The app should not crash
    await expect(authedPage).toHaveURL('/home');

    // Timeline content should not be visible
    const postContent = authedPage
      .getByText('Welcome to the mocked timeline!')
      .first();
    await expect(postContent).not.toBeVisible({ timeout: 5000 });
  });
});
