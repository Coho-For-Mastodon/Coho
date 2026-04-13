import { test, expect, gotoWithAuth } from './fixtures';

/**
 * Helper to open the compose dialog by clicking reply on the first post.
 * This is more reliable than the keyboard shortcut which depends on
 * requestIdleCallback for hotkey initialization.
 */
async function openComposeViaReply(page: import('@playwright/test').Page) {
  const replyButton = page
    .locator('timeline-item')
    .first()
    .locator('md-button[aria-label="Reply"]');
  await expect(replyButton).toBeVisible({ timeout: 10000 });
  await replyButton.click();

  const dialog = page.locator('post-dialog md-dialog#notify-dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });
  return dialog;
}

test.describe('Compose Post', () => {
  test('should open compose dialog when clicking reply', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    await openComposeViaReply(authedPage);
  });

  test('should have enabled publish button with pre-filled reply mention', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    await openComposeViaReply(authedPage);

    // In reply mode, the composer pre-fills with @mention text
    // so the publish button should already be enabled
    const publishButton = authedPage
      .locator(
        'post-dialog md-dialog#notify-dialog md-button[variant="filled"][pill]'
      )
      .first();
    await expect(publishButton).toBeVisible({ timeout: 10000 });
    await expect(publishButton).toBeEnabled();
  });

  test('should enable publish button after typing text', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    await openComposeViaReply(authedPage);

    // Type into the composer text area
    const textArea = authedPage.locator('post-composer md-text-area').first();
    await expect(textArea).toBeVisible({ timeout: 10000 });
    await textArea.click();
    await authedPage.keyboard.press('Meta+a');
    await authedPage.keyboard.press('Backspace');
    await authedPage.keyboard.type('Hello from e2e test!');

    // Publish button should now be enabled
    const publishButton = authedPage
      .locator(
        'post-dialog md-dialog#notify-dialog md-button[variant="filled"][pill]'
      )
      .first();
    await expect(publishButton).toBeEnabled({ timeout: 10000 });
  });

  test('should show text area ready for input in reply mode', async ({
    authedPage,
  }) => {
    await gotoWithAuth(authedPage, '/home');
    await authedPage.waitForLoadState('networkidle');

    // Click reply on the first timeline item
    const replyButton = authedPage
      .locator('timeline-item')
      .first()
      .locator('md-button[aria-label="Reply"]');
    await expect(replyButton).toBeVisible({ timeout: 10000 });
    await replyButton.click();

    // Compose dialog should open
    const dialog = authedPage.locator('post-dialog md-dialog#notify-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // The composer should contain a text area ready for input
    const textArea = authedPage.locator('post-composer md-text-area').first();
    await expect(textArea).toBeVisible({ timeout: 10000 });
  });
});
