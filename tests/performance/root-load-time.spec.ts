import { test, expect, type Page } from '@playwright/test';

/**
 * Runtime performance budget for the unauthenticated root route (/).
 *
 * Measures Largest Contentful Paint (LCP) across multiple cold loads of `/`
 * against a production build, reports per-run values, and asserts on the
 * median to keep CI stable against single-run variance.
 *
 * Complements home-load-time.spec.ts (authenticated app-home) and
 * bundle-size.spec.ts (bytes).
 */

const ITERATIONS = 5;
const LCP_BUDGET_MS_MEDIAN = 2000;

async function measureLcp(page: Page): Promise<number> {
  await page.addInitScript(() => {
    (window as unknown as { __lcp?: number }).__lcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        (window as unknown as { __lcp: number }).__lcp = last.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto('/');
  await page.waitForSelector('app-login', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );

  const lcp = await page.evaluate(
    () => (window as unknown as { __lcp: number }).__lcp
  );
  return lcp;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

test.describe('Root route runtime performance', () => {
  test(`/ LCP is under ${LCP_BUDGET_MS_MEDIAN}ms (median of ${ITERATIONS} runs)`, async ({
    browser,
  }) => {
    const lcps: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      const lcp = await measureLcp(page);
      lcps.push(lcp);

      await context.close();
    }

    const med = median(lcps);
    const min = Math.min(...lcps);
    const max = Math.max(...lcps);

    console.log('\n' + '='.repeat(60));
    console.log('⏱️  ROOT ROUTE LCP REPORT');
    console.log('='.repeat(60));
    lcps.forEach((v, i) => {
      console.log(`  run ${i + 1}: ${v.toFixed(0)} ms`);
    });
    console.log('-'.repeat(60));
    console.log(`  median: ${med.toFixed(0)} ms`);
    console.log(`  min:    ${min.toFixed(0)} ms`);
    console.log(`  max:    ${max.toFixed(0)} ms`);
    console.log(`  budget: ${LCP_BUDGET_MS_MEDIAN} ms (median)`);
    const status = med <= LCP_BUDGET_MS_MEDIAN ? '✅ PASS' : '❌ FAIL';
    console.log(`  status: ${status}`);
    console.log('='.repeat(60) + '\n');

    expect(
      med,
      `Median LCP (${med.toFixed(0)} ms) exceeds budget (${LCP_BUDGET_MS_MEDIAN} ms). Per-run: ${lcps.map((v) => v.toFixed(0)).join(', ')} ms`
    ).toBeLessThanOrEqual(LCP_BUDGET_MS_MEDIAN);

    expect(med, 'LCP was 0 — observer never fired').toBeGreaterThan(0);
  });
});
