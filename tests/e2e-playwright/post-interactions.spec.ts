import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Post Interactions', () => {
  test('should favourite a post', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    const timeline = authedPage.locator('app-timeline').first();
    await expect(timeline).toBeVisible({ timeout: 10000 });

    const favButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Favourite"]');
    await expect(favButton).toBeVisible({ timeout: 10000 });
    await expect(favButton).toHaveAttribute('aria-pressed', 'false');

    await favButton.click();

    // After clicking, the button should toggle to "Unfavourite"
    const unfavButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Unfavourite"]');
    await expect(unfavButton).toBeVisible({ timeout: 10000 });
    await expect(unfavButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should boost a post', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    const boostButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Boost"]');
    await expect(boostButton).toBeVisible({ timeout: 10000 });
    await expect(boostButton).toHaveAttribute('aria-pressed', 'false');

    await boostButton.click();

    const undoBoostButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Undo boost"]');
    await expect(undoBoostButton).toBeVisible({ timeout: 10000 });
    await expect(undoBoostButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should bookmark a post', async ({ authedPage }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    const bookmarkButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Bookmark"]');
    await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
    await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'false');

    await bookmarkButton.click();

    const removeBookmarkButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Remove bookmark"]');
    await expect(removeBookmarkButton).toBeVisible({ timeout: 10000 });
    await expect(removeBookmarkButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should open reply dialog when clicking reply', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    const replyButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Reply"]');
    await expect(replyButton).toBeVisible({ timeout: 10000 });

    await replyButton.click();

    // The reply dialog (post-dialog wrapping md-dialog) should appear
    const dialog = authedPage.locator('post-dialog md-dialog#notify-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });
});
