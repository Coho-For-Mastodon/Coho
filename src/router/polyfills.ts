/**
 * @fileoverview Conditional polyfills for the Navigation API router.
 *
 * This module provides automatic polyfill loading for browsers that don't
 * natively support the Navigation API or URLPattern. Polyfills are only
 * loaded when needed, keeping bundle size minimal for modern browsers.
 *
 * Supported polyfills:
 * - `urlpattern-polyfill` - For URLPattern support
 * - `@virtualstate/navigation` - For Navigation API support
 *
 * @example
 * ```typescript
 * import { ensurePolyfills, isBrowser } from './polyfills';
 *
 * // Check environment before router operations
 * if (isBrowser()) {
 *   await ensurePolyfills();
 *   // Now safe to use URLPattern and Navigation API
 * }
 * ```
 */

let polyfillsLoaded = false;

/**
 * Check if the Navigation API is supported in the current environment.
 *
 * @returns `true` if the Navigation API is available, `false` otherwise
 *
 * @example
 * ```typescript
 * if (!hasNavigationAPI()) {
 *   console.log('Navigation API not supported, polyfill will be loaded');
 * }
 * ```
 */
export function hasNavigationAPI(): boolean {
  return typeof window !== 'undefined' && 'navigation' in window;
}

/**
 * Check if URLPattern is supported in the current environment.
 *
 * @returns `true` if URLPattern is available, `false` otherwise
 *
 * @example
 * ```typescript
 * if (!hasURLPattern()) {
 *   console.log('URLPattern not supported, polyfill will be loaded');
 * }
 * ```
 */
export function hasURLPattern(): boolean {
  return typeof URLPattern !== 'undefined';
}

/**
 * Load polyfills conditionally - only loads what's missing.
 *
 * This function is idempotent and safe to call multiple times.
 * After the first successful call, subsequent calls return immediately.
 *
 * @returns A promise that resolves when all needed polyfills are loaded
 *
 * @example
 * ```typescript
 * // In your app initialization:
 * await ensurePolyfills();
 *
 * // Now URLPattern and Navigation API are guaranteed to be available
 * const pattern = new URLPattern({ pathname: '/user/:id' });
 * ```
 */
export async function ensurePolyfills(): Promise<void> {
  if (polyfillsLoaded) {
    return;
  }

  const loadPromises: Promise<unknown>[] = [];

  // Load URLPattern polyfill if needed
  if (!hasURLPattern()) {
    console.log('[Router] Loading URLPattern polyfill');
    loadPromises.push(import('urlpattern-polyfill'));
  }

  // Load Navigation API polyfill if needed
  if (!hasNavigationAPI()) {
    console.log('[Router] Loading Navigation API polyfill');
    loadPromises.push(import('@virtualstate/navigation/polyfill'));
  }

  if (loadPromises.length > 0) {
    await Promise.all(loadPromises);
    console.log('[Router] Polyfills loaded');
  }

  polyfillsLoaded = true;
}

/**
 * Check if the code is running in a browser environment.
 *
 * Useful for SSR (Server-Side Rendering) scenarios where router
 * initialization should be skipped.
 *
 * @returns `true` if running in a browser, `false` otherwise (e.g., Node.js)
 *
 * @example
 * ```typescript
 * if (isBrowser()) {
 *   await router.init();
 * }
 * ```
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Reset the polyfill loaded state.
 * Primarily useful for testing purposes.
 *
 * @internal
 */
export function _resetPolyfillState(): void {
  polyfillsLoaded = false;
}
