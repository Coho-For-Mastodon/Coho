/**
 * Conditional polyfills for the Navigation API router
 * Only loads polyfills when the browser doesn't support the required APIs
 */

let polyfillsLoaded = false;

/**
 * Check if Navigation API is supported
 */
export function hasNavigationAPI(): boolean {
  return typeof window !== 'undefined' && 'navigation' in window;
}

/**
 * Check if URLPattern is supported
 */
export function hasURLPattern(): boolean {
  return typeof URLPattern !== 'undefined';
}

/**
 * Load polyfills conditionally - only loads what's missing
 * Returns a promise that resolves when all needed polyfills are loaded
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
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}
