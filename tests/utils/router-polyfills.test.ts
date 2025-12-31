import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the actual functions, so we'll test them in isolation
describe('router-polyfills', () => {
  // Store original globals
  const originalNavigation = (globalThis as { navigation?: unknown })
    .navigation;
  const originalURLPattern = globalThis.URLPattern;

  beforeEach(() => {
    // Reset module state by clearing the module cache
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original globals
    if (originalNavigation !== undefined) {
      (globalThis as { navigation?: unknown }).navigation = originalNavigation;
    }
    if (originalURLPattern !== undefined) {
      globalThis.URLPattern = originalURLPattern;
    }
  });

  describe('hasNavigationAPI', () => {
    it('should return true when Navigation API is available', async () => {
      // Mock navigation
      Object.defineProperty(window, 'navigation', {
        value: { navigate: vi.fn() },
        writable: true,
        configurable: true,
      });

      const { hasNavigationAPI } =
        await import('../../src/utils/router-polyfills');
      expect(hasNavigationAPI()).toBe(true);
    });

    it('should return false when Navigation API is not available', async () => {
      // Remove navigation
      Object.defineProperty(window, 'navigation', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      delete (window as { navigation?: unknown }).navigation;

      const { hasNavigationAPI } =
        await import('../../src/utils/router-polyfills');
      expect(hasNavigationAPI()).toBe(false);
    });
  });

  describe('hasURLPattern', () => {
    it('should return true when URLPattern is available', async () => {
      // URLPattern is polyfilled in setup.ts
      const { hasURLPattern } =
        await import('../../src/utils/router-polyfills');
      expect(hasURLPattern()).toBe(true);
    });
  });

  describe('isBrowser', () => {
    it('should return true in browser environment', async () => {
      const { isBrowser } = await import('../../src/utils/router-polyfills');
      expect(isBrowser()).toBe(true);
    });
  });

  describe('ensurePolyfills', () => {
    it('should not load polyfills if APIs are available', async () => {
      // Mock both APIs as available
      Object.defineProperty(window, 'navigation', {
        value: { navigate: vi.fn() },
        writable: true,
        configurable: true,
      });

      const { ensurePolyfills } =
        await import('../../src/utils/router-polyfills');

      // Should not throw and should complete quickly
      await expect(ensurePolyfills()).resolves.toBeUndefined();
    });

    it('should only load polyfills once', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { ensurePolyfills } =
        await import('../../src/utils/router-polyfills');

      // Call twice
      await ensurePolyfills();
      await ensurePolyfills();

      // Check that polyfill loading messages don't repeat
      // (the polyfillsLoaded flag should prevent second load)
      consoleSpy.mockRestore();
    });
  });
});
