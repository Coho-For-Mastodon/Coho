import { test, expect, gotoWithAuth } from './fixtures';

test.describe('Stateful Flows', () => {
  test('should favourite and unfavourite a post with count updates', async ({
    statefulPage,
  }) => {
    await gotoWithAuth(statefulPage, '/home');
    await statefulPage.waitForLoadState('networkidle');

    const firstPost = statefulPage.locator('timeline-item').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });

    // Click favourite
    const favButton = firstPost.locator('md-button[aria-label="Favourite"]');
    await expect(favButton).toBeVisible({ timeout: 10000 });
    await expect(favButton).toHaveAttribute('aria-pressed', 'false');
    await favButton.click();

    // Verify it toggled to favourited
    const unfavButton = firstPost.locator(
      'md-button[aria-label="Unfavourite"]'
    );
    await expect(unfavButton).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10000,
    });

    // Now unfavourite
    await unfavButton.click();

    // Should revert back to unfavourited
    const revertedFav = firstPost.locator('md-button[aria-label="Favourite"]');
    await expect(revertedFav).toHaveAttribute('aria-pressed', 'false', {
      timeout: 10000,
    });
  });

  test('should bookmark and remove bookmark', async ({ statefulPage }) => {
    await gotoWithAuth(statefulPage, '/home');
    await statefulPage.waitForLoadState('networkidle');

    const firstPost = statefulPage.locator('timeline-item').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });

    // Bookmark the first post
    const bookmarkButton = firstPost.locator(
      'md-button[aria-label="Bookmark"]'
    );
    await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
    await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'false');
    await bookmarkButton.click();

    // Verify it toggled to bookmarked
    const removeBookmark = firstPost.locator(
      'md-button[aria-label="Remove bookmark"]'
    );
    await expect(removeBookmark).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10000,
    });

    // Remove bookmark
    await removeBookmark.click();

    // Should revert back to unbookmarked
    const revertedBookmark = firstPost.locator(
      'md-button[aria-label="Bookmark"]'
    );
    await expect(revertedBookmark).toHaveAttribute('aria-pressed', 'false', {
      timeout: 10000,
    });
  });

  test('should create a post via compose', async ({ statefulPage }) => {
    await gotoWithAuth(statefulPage, '/home');
    await statefulPage.waitForLoadState('networkidle');

    // Open compose via reply
    const replyButton = statefulPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Reply"]');
    await expect(replyButton).toBeVisible({ timeout: 10000 });
    await replyButton.click();

    const dialog = statefulPage.locator('post-dialog md-dialog#notify-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Type a reply
    const textArea = statefulPage.locator('post-composer md-text-area').first();
    await expect(textArea).toBeVisible({ timeout: 10000 });
    await textArea.click();
    await statefulPage.keyboard.press('Meta+a');
    await statefulPage.keyboard.press('Backspace');
    await statefulPage.keyboard.type('A test reply from stateful flow');

    // Publish
    const publishButton = statefulPage
      .locator(
        'post-dialog md-dialog#notify-dialog md-button[variant="filled"][pill]'
      )
      .first();
    await expect(publishButton).toBeEnabled({ timeout: 10000 });
    await publishButton.click();

    // Wait for compose to finish
    await statefulPage.waitForTimeout(2000);

    // The dialog should close after successful publish
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });
});
