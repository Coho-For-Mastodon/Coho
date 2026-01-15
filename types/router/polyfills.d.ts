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
export declare function hasNavigationAPI(): boolean;
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
export declare function hasURLPattern(): boolean;
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
export declare function ensurePolyfills(): Promise<void>;
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
export declare function isBrowser(): boolean;
/**
 * Reset the polyfill loaded state.
 * Primarily useful for testing purposes.
 *
 * @internal
 */
export declare function _resetPolyfillState(): void;
