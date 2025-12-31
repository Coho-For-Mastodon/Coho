/**
 * Conditional polyfills for the Navigation API router
 * Only loads polyfills when the browser doesn't support the required APIs
 */
/**
 * Check if Navigation API is supported
 */
export declare function hasNavigationAPI(): boolean;
/**
 * Check if URLPattern is supported
 */
export declare function hasURLPattern(): boolean;
/**
 * Load polyfills conditionally - only loads what's missing
 * Returns a promise that resolves when all needed polyfills are loaded
 */
export declare function ensurePolyfills(): Promise<void>;
/**
 * Check if we're in a browser environment
 */
export declare function isBrowser(): boolean;
