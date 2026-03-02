/**
 * Service Worker Constants
 *
 * Centralized configuration values used across SW modules.
 */

declare const __APP_VERSION__: string;

/** Build version injected at compile time by Vite */
export const VERSION = __APP_VERSION__;

/**
 * Versioned cache names. All version-specific caches include
 * the build VERSION so old caches are purged on activation.
 */
export const CACHE_NAMES = {
  pages: `pages-${VERSION}`,
  assets: `assets-${VERSION}`,
  images: `images-${VERSION}`,
  share: 'shareTarget',
} as const;

/** Background Sync queue name */
export const SYNC_TAG = 'mastodon-api-sync';

/** IndexedDB key for the background sync request queue */
export const SYNC_QUEUE_KEY = 'background-sync-queue';

/** Default notification icon path */
export const DEFAULT_ICON = '/assets/icons/new-icons/icon-256x256.png';
