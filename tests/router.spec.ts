import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateTo } from './test-utils';

test.describe('Router', () => {
    test.beforeEach(async ({ isMobile }) => {
        if (isMobile) {
            test.skip();
        }
    });

    test('renders login page at root path', async ({ page }) => {
        await bootstrapApp(page, { seed: false });
        // Wait for the login page content to be visible (the Login button inside app-login)
        await expect(page.locator('app-login md-button', { hasText: 'Login' }).first()).toBeVisible();
        expect(page.url()).not.toContain('/home');
    });

    test('renders home page at /home', async ({ page }) => {
        await bootstrapApp(page);
        await expect(page.locator('app-home')).toBeVisible();
        expect(page.url()).toContain('/home');
    });

    test('renders search page at /search', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/search');
        await expect(page.locator('search-page')).toBeVisible();
        expect(page.url()).toContain('/search');
    });

    test('renders followers page at /followers', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/followers');
        await expect(page.locator('app-followers')).toBeVisible();
        expect(page.url()).toContain('/followers');
    });

    test('renders about page at /about', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/about');
        await expect(page.locator('app-about')).toBeVisible();
        expect(page.url()).toContain('/about');
    });

    test('renders messages page at /messages', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/messages');
        await expect(page.locator('app-messages')).toBeVisible();
        expect(page.url()).toContain('/messages');
    });

    test('renders following page at /following', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/following');
        await expect(page.locator('app-following')).toBeVisible();
        expect(page.url()).toContain('/following');
    });

    test('renders hashtags page at /hashtag', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/hashtag');
        await expect(page.locator('app-hashtags')).toBeVisible();
        expect(page.url()).toContain('/hashtag');
    });

    test('renders edit account page at /editaccount', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/editaccount');
        await expect(page.locator('edit-page')).toBeVisible();
        expect(page.url()).toContain('/editaccount');
    });

    test('renders explore page at /explore', async ({ page }) => {
        await bootstrapApp(page);
        await navigateTo(page, '/explore');
        await expect(page.locator('app-explore')).toBeVisible();
        expect(page.url()).toContain('/explore');
    });

    test('renders create account page at /createaccount', async ({ page }) => {
        // Navigate directly without seeding auth, assuming create account is public or accessible
        await bootstrapApp(page, { seed: false });
        await navigateTo(page, '/createaccount');
        await expect(page.locator('create-account')).toBeVisible();
        expect(page.url()).toContain('/createaccount');
    });
});
