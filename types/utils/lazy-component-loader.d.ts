/**
 * Utility for lazy loading Lit components with proper tracking.
 * Reduces boilerplate in page components that lazy-load many sub-components.
 */
type ComponentLoader = () => Promise<unknown>;
/**
 * Lazy load a component if not already loaded.
 * Returns true if the component was loaded (first time), false if already loaded.
 *
 * @param key - Unique identifier for the component (used for tracking)
 * @param loader - Function that returns a dynamic import promise
 * @returns Promise<boolean> - true if newly loaded, false if already loaded
 *
 * @example
 * ```ts
 * // In your component
 * async loadBookmarks() {
 *   const loaded = await lazyLoad('bookmarks', () => import('../components/bookmarks'));
 *   if (loaded) {
 *     this.bookmarksLoaded = true;
 *   }
 * }
 * ```
 */
export declare function lazyLoad(
  key: string,
  loader: ComponentLoader
): Promise<boolean>;
/**
 * Check if a component has been loaded.
 *
 * @param key - The component key to check
 * @returns boolean - true if loaded, false otherwise
 */
export declare function isLoaded(key: string): boolean;
/**
 * Reset the loaded state for a component (useful for testing).
 *
 * @param key - The component key to reset
 */
export declare function resetLoaded(key: string): void;
/**
 * Reset all loaded components (useful for testing).
 */
export declare function resetAllLoaded(): void;
/**
 * Pre-defined component loaders for common app components.
 * These can be used directly or as reference for custom loaders.
 */
export declare const componentLoaders: {
  readonly bookmarks: () => Promise<typeof import('../components/bookmarks')>;
  readonly favorites: () => Promise<typeof import('../components/favorites')>;
  readonly notifications: () => Promise<
    typeof import('../components/notifications')
  >;
  readonly search: () => Promise<typeof import('../pages/search-page')>;
  readonly messages: () => Promise<typeof import('../pages/app-messages')>;
  readonly appTheme: () => Promise<typeof import('../components/app-theme')>;
  readonly userTerms: () => Promise<typeof import('../components/user-terms')>;
  readonly rightClick: () => Promise<
    typeof import('../components/right-click')
  >;
  readonly postDialog: () => Promise<
    typeof import('../components/post-dialog')
  >;
};
/**
 * Helper to create a lazy loading method for a component.
 * Returns a function that loads the component and updates a reactive property.
 *
 * @param key - The loader key from componentLoaders
 * @returns An async function to call for loading
 *
 * @example
 * ```ts
 * class MyComponent extends LitElement {
 *   @state() bookmarksLoaded = false;
 *
 *   loadBookmarks = createLazyLoader('bookmarks', () => {
 *     this.bookmarksLoaded = true;
 *   });
 * }
 * ```
 */
export declare function createLazyLoader(
  key: keyof typeof componentLoaders,
  onLoaded?: () => void
): () => Promise<void>;
export {};
