import { test, expect } from '@playwright/test';

/**
 * Bundle size budgets for the initial page load (login page).
 * This measures compressed (gzip/brotli) transfer size via CDP.
 *
 * Current baseline: ~25 KB JS, ~X KB CSS, ~X KB HTML (as of initial measurement)
 */
const JS_BUDGET_KB = 30;
const CSS_BUDGET_KB = 15;
const HTML_BUDGET_KB = 5;

interface NetworkRequest {
  url: string;
  compressedBytes: number;
  uncompressedBytes: number;
}

test.describe('Bundle Size Budget', () => {
  test('login page bundle is under budget', async ({ page }) => {
    const jsRequests: NetworkRequest[] = [];
    const cssRequests: NetworkRequest[] = [];
    const htmlRequests: NetworkRequest[] = [];
    const requestMap = new Map<
      string,
      { url: string; resourceType: string; mimeType: string }
    >();

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

    // Navigate to the login page (unauthenticated first load)
    await page.goto('/');

    // Wait for the app to be interactive
    await page.waitForSelector('app-login', { timeout: 30000 });

    // Wait for network to settle
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
    console.log('📦 BUNDLE SIZE REPORT - Login Page (First Load)');
    console.log('='.repeat(60));

    logCategory('JavaScript', jsRequests, totalJsKB, JS_BUDGET_KB);
    logCategory('CSS', cssRequests, totalCssKB, CSS_BUDGET_KB);
    logCategory('HTML', htmlRequests, totalHtmlKB, HTML_BUDGET_KB);

    const totalKB = totalJsKB + totalCssKB + totalHtmlKB;
    const totalBudgetKB = JS_BUDGET_KB + CSS_BUDGET_KB + HTML_BUDGET_KB;

    console.log('\n' + '-'.repeat(60));
    console.log(`  TOTAL: ${totalKB.toFixed(1)} KB (compressed/transferred)`);
    console.log(`  BUDGET: ${totalBudgetKB} KB combined`);

    const allPass =
      totalJsKB <= JS_BUDGET_KB &&
      totalCssKB <= CSS_BUDGET_KB &&
      totalHtmlKB <= HTML_BUDGET_KB;
    console.log(`  STATUS: ${allPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(60) + '\n');

    // Assert each budget individually for clear error messages
    expect(
      totalJsKB,
      `JavaScript (${totalJsKB.toFixed(1)} KB) exceeds budget (${JS_BUDGET_KB} KB)`
    ).toBeLessThanOrEqual(JS_BUDGET_KB);

    expect(
      totalCssKB,
      `CSS (${totalCssKB.toFixed(1)} KB) exceeds budget (${CSS_BUDGET_KB} KB)`
    ).toBeLessThanOrEqual(CSS_BUDGET_KB);

    expect(
      totalHtmlKB,
      `HTML (${totalHtmlKB.toFixed(1)} KB) exceeds budget (${HTML_BUDGET_KB} KB)`
    ).toBeLessThanOrEqual(HTML_BUDGET_KB);
  });
});
