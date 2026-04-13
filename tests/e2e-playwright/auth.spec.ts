import { test as base, expect } from '@playwright/test';
import { setupApiMocks, gotoWithAuth } from './fixtures';

// Auth tests need both the authedPage fixture and raw page for unauthenticated scenarios
const test = base;

test.describe('Auth Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The login page component should render
    const loginPage = page.locator('app-login');
    await expect(loginPage).toBeVisible({ timeout: 10000 });
  });

  test('should display server input and login button', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Server autocomplete input
    const serverInput = page.locator('app-login md-autocomplete');
    await expect(serverInput).toBeVisible({ timeout: 10000 });

    // Login button
    const loginButton = page.locator('app-login md-button.login-button');
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    await expect(loginButton).toContainText('Login');
  });

  test('should show sign up and guest mode options', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const signUpButton = page.getByText('Sign up for Mastodon Account');
    await expect(signUpButton).toBeVisible({ timeout: 10000 });

    const guestButton = page.getByText('Try Coho without an account');
    await expect(guestButton).toBeVisible({ timeout: 10000 });
  });

  test('should redirect authenticated user to /home', async ({ page }) => {
    await setupApiMocks(page);
    await gotoWithAuth(page, '/');
    await page.waitForLoadState('networkidle');

    // Authenticated user navigating to / should end up on /home
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
  });
});
