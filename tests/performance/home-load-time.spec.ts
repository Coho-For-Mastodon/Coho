import { test, expect, type Page } from '@playwright/test';

/**
 * Runtime performance budget for the authenticated home page.
 *
 * Measures Largest Contentful Paint (LCP) across multiple cold loads of
 * `/home` against a production build, reports per-run values, and asserts
 * on the median to keep CI stable against single-run variance.
 *
 * This complements bundle-size.spec.ts: that test catches bytes regressions,
 * this one catches regressions in how long app-home takes to actually paint.
 */

const ITERATIONS = 5;
const LCP_BUDGET_MS_MEDIAN = 2500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedHomeSession(page: Page, context: any) {
  await page.addInitScript(() => {
    localStorage.setItem('server', 'tech.lgbt');
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('token', 'mock-access-token');
  });

  // set up network throttling
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
    uploadThroughput: (750 * 1024) / 8, // 750 Kbps
    latency: 150, // 150 ms
  });

  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, body: '[]' })
  );
  await page.route('**/.well-known/**', (route) =>
    route.fulfill({ status: 200, body: '{}' })
  );
}

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

  await page.goto('/home');
  await page.waitForSelector('app-home', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Give the LCP observer a moment to flush its final entry, then nudge
  // the browser to finalize by simulating a visibility change.
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

test.describe('Home page runtime performance', () => {
  test(`app-home LCP is under ${LCP_BUDGET_MS_MEDIAN}ms (median of ${ITERATIONS} runs)`, async ({
    browser,
  }) => {
    const lcps: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      // Fresh context per iteration so each run is a cold cache.
      const context = await browser.newContext();
      const page = await context.newPage();
      await seedHomeSession(page, context);

      const lcp = await measureLcp(page);
      lcps.push(lcp);

      await context.close();
    }

    const med = median(lcps);
    const min = Math.min(...lcps);
    const max = Math.max(...lcps);

    console.log('\n' + '='.repeat(60));
    console.log('⏱️  HOME PAGE LCP REPORT');
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

    // Sanity check: we should have actually captured an LCP entry.
    expect(med, 'LCP was 0 — observer never fired').toBeGreaterThan(0);
  });
});
