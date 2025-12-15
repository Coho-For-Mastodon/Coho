import type { Page } from '@playwright/test';
import { registerMockApis } from './mocks/register-api';

export const APP_URL = 'http://localhost:3000';
export const MOCK_AUTH = {
  server: 'tech.lgbt',
  token: 'mock-access-token',
};

export async function bootstrapApp(page: Page, options?: { seed?: boolean }) {
  const seed = options?.seed ?? true;

  await registerMockApis(page);
  await page.goto(APP_URL);

  if (seed) {
    await seedAuth(page);
  }
}

export async function seedAuth(page: Page) {
  await page.evaluate(({ server, token }) => {
    localStorage.setItem('server', server);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('token', token);
  }, MOCK_AUTH);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL('**/home', { timeout: 15000 });
}

/**
 * Navigate to a path using client-side navigation (router.navigate)
 * instead of full page reload (page.goto) to preserve mock API routes
 */
export async function navigateTo(page: Page, path: string) {
  await page.evaluate((targetPath) => {
    // Use the app's router for client-side navigation
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

  // Wait for the route to be rendered
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(100); // Small wait for router to process
}
