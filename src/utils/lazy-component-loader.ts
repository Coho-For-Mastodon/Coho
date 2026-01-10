/**
 * Utility for lazy loading Lit components with proper tracking.
 * Reduces boilerplate in page components that lazy-load many sub-components.
 */

type ComponentLoader = () => Promise<unknown>;

// Map to track which components have been loaded
const loadedComponents = new Map<string, boolean>();

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
export async function lazyLoad(
  key: string,
  loader: ComponentLoader
): Promise<boolean> {
  if (loadedComponents.get(key)) {
    return false;
  }

  await loader();
  loadedComponents.set(key, true);
  return true;
}

/**
 * Check if a component has been loaded.
 *
 * @param key - The component key to check
 * @returns boolean - true if loaded, false otherwise
 */
export function isLoaded(key: string): boolean {
  return loadedComponents.get(key) ?? false;
}

/**
 * Reset the loaded state for a component (useful for testing).
 *
 * @param key - The component key to reset
 */
export function resetLoaded(key: string): void {
  loadedComponents.delete(key);
}

/**
 * Reset all loaded components (useful for testing).
 */
export function resetAllLoaded(): void {
  loadedComponents.clear();
}

/**
 * Pre-defined component loaders for common app components.
 * These can be used directly or as reference for custom loaders.
 */
export const componentLoaders = {
  // Tab components
  bookmarks: () => import('../components/bookmarks'),
  favorites: () => import('../components/favorites'),
  notifications: () => import('../components/notifications'),
  search: () => import('../pages/search-page'),
  messages: () => import('../pages/app-messages'),

  // Drawer components
  appTheme: () => import('../components/app-theme'),
  userTerms: () => import('../components/user-terms'),
  rightClick: () => import('../components/right-click'),

  // Dialog components
  postDialog: () => import('../components/post-dialog'),
} as const;

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
export function createLazyLoader(
  key: keyof typeof componentLoaders,
  onLoaded?: () => void
): () => Promise<void> {
  return async () => {
    const loaded = await lazyLoad(key, componentLoaders[key]);
    if (loaded && onLoaded) {
      onLoaded();
    }
  };
}
