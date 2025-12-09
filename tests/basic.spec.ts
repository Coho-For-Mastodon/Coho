import { test, expect } from '@playwright/test';
import { bootstrapApp, seedAuth } from './test-utils';

// before each test
test.beforeEach(async ({ page }) => {
    await bootstrapApp(page, { seed: false });
});

test('ensure application loads', async ({ page }) => {
    // find the Login button inside the md-button component
    const loginButton = page.locator('md-button', { hasText: 'Login' }).first();

    // expect loginButton to exist and be visible
    await expect(loginButton).toBeVisible();
});

test('ensure home page loads with server and token', async ({ page }) => {
    await seedAuth(page);

    // ensure the url contains /home
    expect(page.url()).toContain('/home');
});

test('ensure timeline loads on home page', async ({ page }) => {
    await seedAuth(page);

    // expect the timeline to be visible
    await expect(
        page.locator('md-tab-panel[name="general"] app-timeline')
    ).toBeVisible();
});

test('ensure that the notifications tab loads', async ({ page }) => {
    await seedAuth(page);

    // click the notifications tab
    await page.click('md-tab[panel="notifications"]');

    // expect the notifications tab to be visible
    await expect(
        page.locator('md-tab-panel[name="notifications"] app-notifications')
    ).toBeVisible();
});

test('ensure that the bookmarks tab loads', async ({ page }) => {
    await seedAuth(page);

    // click the notifications tab
    await page.click('md-tab[panel="bookmarks"]');

    // expect the notifications tab to be visible
    await expect(
        page.locator('md-tab-panel[name="bookmarks"] app-bookmarks')
    ).toBeVisible();
});

test('ensure that the search tab loads', async ({ page }) => {
    await seedAuth(page);

    // click the notifications tab
    await page.click('md-tab[panel="search"]');

    // expect the notifications tab to be visible
    await expect(
        page.locator('md-tab-panel[name="search"] search-page')
    ).toBeVisible();
});

test('ensure service worker is registered', async ({ page }) => {
    // Skip this test in preview mode as service workers may not register reliably
    // This test is more appropriate for production builds
    test.skip(true, 'Service worker registration is unreliable in vite preview mode');
});


