import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the settings module (dynamic import target)
const mockGetSettings = vi.fn();
vi.mock('../../src/services/settings', () => ({
  getSettings: mockGetSettings,
}));

// Mock the component imports so we don't actually load heavy components
vi.mock('../../src/components/post-dialog.js', () => ({}));
vi.mock('../../src/pages/search-page.js', () => ({}));
vi.mock('../../src/components/notifications.js', () => ({}));
vi.mock('../../src/pages/app-profile.js', () => ({}));

import {
  getPrecacheTier,
  initComponentPrecache,
} from '../../src/services/precache-components';

describe('precache-components', () => {
  let originalConnection: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetSettings.mockResolvedValue({ data_saver: false });
    // Save original connection
    originalConnection = (navigator as Navigator & { connection?: unknown })
      .connection;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Restore original connection
    setConnection(originalConnection);
  });

  /**
   * Helper to stub navigator.connection for testing network tiers.
   */
  function setConnection(value: unknown) {
    Object.defineProperty(navigator, 'connection', {
      value,
      writable: true,
      configurable: true,
    });
  }

  describe('getPrecacheTier', () => {
    it('returns "none" when app data_saver setting is enabled', async () => {
      mockGetSettings.mockResolvedValue({ data_saver: true });

      const tier = await getPrecacheTier();
      expect(tier).toBe('none');
    });

    it('returns "none" when browser saveData is on', async () => {
      setConnection({ saveData: true, effectiveType: '4g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('none');
    });

    it('returns "extended" on 4g connections', async () => {
      setConnection({ saveData: false, effectiveType: '4g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('extended');
    });

    it('returns "critical" on 3g connections', async () => {
      setConnection({ saveData: false, effectiveType: '3g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('critical');
    });

    it('returns "critical" on 2g connections', async () => {
      setConnection({ saveData: false, effectiveType: '2g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('critical');
    });

    it('returns "critical" on slow-2g connections', async () => {
      setConnection({ saveData: false, effectiveType: 'slow-2g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('critical');
    });

    it('returns "critical" when Network Information API is unavailable (Safari/Firefox)', async () => {
      setConnection(undefined);

      const tier = await getPrecacheTier();
      expect(tier).toBe('critical');
    });

    it('data_saver takes precedence over fast network', async () => {
      mockGetSettings.mockResolvedValue({ data_saver: true });
      setConnection({ saveData: false, effectiveType: '4g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('none');
    });

    it('browser saveData takes precedence over fast effectiveType', async () => {
      setConnection({ saveData: true, effectiveType: '4g' });

      const tier = await getPrecacheTier();
      expect(tier).toBe('none');
    });
  });

  describe('initComponentPrecache', () => {
    it('skips precaching when tier is "none"', async () => {
      mockGetSettings.mockResolvedValue({ data_saver: true });

      const promise = initComponentPrecache();
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      // Should complete without error — data saver prevents any imports
    });

    it('completes on critical tier', async () => {
      setConnection(undefined); // Safari-like: no connection API

      const promise = initComponentPrecache();
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      // Should complete without error
    });

    it('completes on extended tier', async () => {
      setConnection({ saveData: false, effectiveType: '4g' });

      const promise = initComponentPrecache();
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      // Should complete without error
    });

    it('waits 5 seconds before starting', async () => {
      setConnection(undefined);
      const spy = vi.spyOn(console, 'log');

      const promise = initComponentPrecache();

      // At 4.9s, should not have started yet
      await vi.advanceTimersByTimeAsync(4900);
      expect(
        spy.mock.calls.some((call) =>
          String(call[0]).includes('[Precache] Network tier')
        )
      ).toBe(false);

      // At 5s, should start
      await vi.advanceTimersByTimeAsync(100);
      await promise;
      expect(
        spy.mock.calls.some((call) =>
          String(call[0]).includes('[Precache] Network tier')
        )
      ).toBe(true);

      spy.mockRestore();
    });
  });
});
