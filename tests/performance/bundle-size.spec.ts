import { test, expect, type Page } from '@playwright/test';

/**
 * Bundle size budgets (compressed transfer size via CDP).
 */

// Login page (unauthenticated first load)
const LOGIN_JS_BUDGET_KB = 30;
const LOGIN_CSS_BUDGET_KB = 15;
const LOGIN_HTML_BUDGET_KB = 13;

// Home page (authenticated, includes connectedCallback imports)
const HOME_JS_BUDGET_KB = 160;
const HOME_CSS_BUDGET_KB = 20;
const HOME_HTML_BUDGET_KB = 13;

interface NetworkRequest {
  url: string;
  compressedBytes: number;
  uncompressedBytes: number;
}

interface BundleBudgets {
  jsKB: number;
  cssKB: number;
  htmlKB: number;
}

/**
 * Measures compressed transfer sizes for a page load using CDP.
 * Returns the totals and asserts against the provided budgets.
 */
async function measurePageBundles(
  page: Page,
  options: {
    url: string;
    waitSelector: string;
    budgets: BundleBudgets;
    reportTitle: string;
    setup?: (page: Page) => Promise<void>;
  }
) {
  const jsRequests: NetworkRequest[] = [];
  const cssRequests: NetworkRequest[] = [];
  const htmlRequests: NetworkRequest[] = [];
  const requestMap = new Map<
    string,
    { url: string; resourceType: string; mimeType: string }
  >();

  // Run optional setup (e.g. seed auth tokens) before CDP/navigation
  if (options.setup) {
    await options.setup(page);
  }

  // Create CDP session to get accurate compressed transfer sizes
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');

  // Track request metadata
  client.on('Network.responseReceived', (event) => {
    requestMap.set(event.requestId, {
      url: event.response.url,
      resourceType: event.type,
      mimeType: event.response.mimeType || '',
    });
  });

  // Capture compressed size when request finishes
  client.on('Network.loadingFinished', async (event) => {
    const request = requestMap.get(event.requestId);
    if (!request) return;

    const { url, resourceType, mimeType } = request;
    const entry: NetworkRequest = {
      url,
      compressedBytes: event.encodedDataLength,
      uncompressedBytes: 0,
    };

    // Categorize by resource type
    if (resourceType === 'Script' || mimeType.includes('javascript')) {
      jsRequests.push(entry);
    } else if (resourceType === 'Stylesheet' || mimeType.includes('css')) {
      cssRequests.push(entry);
    } else if (resourceType === 'Document' || mimeType.includes('html')) {
      htmlRequests.push(entry);
    }
  });

  await page.goto(options.url);
  await page.waitForSelector(options.waitSelector, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Calculate totals
  const totalJsKB =
    jsRequests.reduce((sum, req) => sum + req.compressedBytes, 0) / 1024;
  const totalCssKB =
    cssRequests.reduce((sum, req) => sum + req.compressedBytes, 0) / 1024;
  const totalHtmlKB =
    htmlRequests.reduce((sum, req) => sum + req.compressedBytes, 0) / 1024;

  // Helper to log a category
  const logCategory = (
    name: string,
    requests: NetworkRequest[],
    totalKB: number,
    budgetKB: number
  ) => {
    console.log(`\n${name} files loaded:\n`);
    if (requests.length === 0) {
      console.log('  (none)');
    } else {
      const sorted = [...requests].sort(
        (a, b) => b.compressedBytes - a.compressedBytes
      );
      for (const req of sorted) {
        const filename = req.url.split('/').pop()?.split('?')[0] || req.url;
        const sizeKB = (req.compressedBytes / 1024).toFixed(1);
        console.log(`  ${sizeKB.padStart(7)} KB  ${filename}`);
      }
    }
    const status = totalKB <= budgetKB ? '✅' : '❌';
    console.log(
      `\n  ${name} Total: ${totalKB.toFixed(1)} KB | Budget: ${budgetKB} KB | ${status}`
    );
  };

  // Log detailed breakdown
  console.log('\n' + '='.repeat(60));
  console.log(`📦 BUNDLE SIZE REPORT - ${options.reportTitle}`);
  console.log('='.repeat(60));

  logCategory('JavaScript', jsRequests, totalJsKB, options.budgets.jsKB);
  logCategory('CSS', cssRequests, totalCssKB, options.budgets.cssKB);
  logCategory('HTML', htmlRequests, totalHtmlKB, options.budgets.htmlKB);

  const totalKB = totalJsKB + totalCssKB + totalHtmlKB;
  const totalBudgetKB =
    options.budgets.jsKB + options.budgets.cssKB + options.budgets.htmlKB;

  console.log('\n' + '-'.repeat(60));
  console.log(`  TOTAL: ${totalKB.toFixed(1)} KB (compressed/transferred)`);
  console.log(`  BUDGET: ${totalBudgetKB} KB combined`);

  const allPass =
    totalJsKB <= options.budgets.jsKB &&
    totalCssKB <= options.budgets.cssKB &&
    totalHtmlKB <= options.budgets.htmlKB;
  console.log(`  STATUS: ${allPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60) + '\n');

  // Assert each budget individually for clear error messages
  expect(
    totalJsKB,
    `JavaScript (${totalJsKB.toFixed(1)} KB) exceeds budget (${options.budgets.jsKB} KB)`
  ).toBeLessThanOrEqual(options.budgets.jsKB);

  expect(
    totalCssKB,
    `CSS (${totalCssKB.toFixed(1)} KB) exceeds budget (${options.budgets.cssKB} KB)`
  ).toBeLessThanOrEqual(options.budgets.cssKB);

  expect(
    totalHtmlKB,
    `HTML (${totalHtmlKB.toFixed(1)} KB) exceeds budget (${options.budgets.htmlKB} KB)`
  ).toBeLessThanOrEqual(options.budgets.htmlKB);
}

test.describe('Bundle Size Budget', () => {
  test('login page bundle is under budget', async ({ page }) => {
    await measurePageBundles(page, {
      url: '/',
      waitSelector: 'app-login',
      budgets: {
        jsKB: LOGIN_JS_BUDGET_KB,
        cssKB: LOGIN_CSS_BUDGET_KB,
        htmlKB: LOGIN_HTML_BUDGET_KB,
      },
      reportTitle: 'Login Page (First Load)',
    });
  });

  test('home page bundle is under budget', async ({ page }) => {
    await measurePageBundles(page, {
      url: '/home',
      waitSelector: 'app-home',
      budgets: {
        jsKB: HOME_JS_BUDGET_KB,
        cssKB: HOME_CSS_BUDGET_KB,
        htmlKB: HOME_HTML_BUDGET_KB,
      },
      reportTitle: 'Home Page (Authenticated)',
      setup: async (p) => {
        // Seed auth tokens before navigation so the app renders app-home
        await p.addInitScript(() => {
          localStorage.setItem('server', 'tech.lgbt');
          localStorage.setItem('accessToken', 'mock-access-token');
          localStorage.setItem('token', 'mock-access-token');
        });

        // Mock Mastodon API calls so the network settles for networkidle
        await p.route('**/api/**', (route) =>
          route.fulfill({ status: 200, body: '[]' })
        );
        await p.route('**/.well-known/**', (route) =>
          route.fulfill({ status: 200, body: '{}' })
        );
      },
    });
  });
});
