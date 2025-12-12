/**
 * Preload Service
 *
 * Intelligently preloads notifications, bookmarks, and favorites data
 * during browser idle time to provide instant tab switching experience.
 *
 * Key features:
 * - Uses requestIdleCallback to avoid blocking the main thread
 * - Respects data-saver mode and network conditions
 * - Stores data in sessionStorage for quick access by components
 * - Does not impact first load performance or bundle size (lazy imported)
 */
import type { Post } from '../interfaces/Post';
import type { Notification as MastodonNotification } from '../interfaces/Notification';
/**
 * Check if preloading conditions are met
 */
export declare function canPreload(): Promise<boolean>;
/**
 * Get preloaded notifications if fresh
 */
export declare function getPreloadedNotifications():
  | MastodonNotification[]
  | null;
/**
 * Get preloaded bookmarks if fresh
 */
export declare function getPreloadedBookmarks(): Post[] | null;
/**
 * Get preloaded favorites if fresh
 */
export declare function getPreloadedFavorites(): Post[] | null;
/**
 * Schedule preloading during idle time
 * Uses requestIdleCallback to avoid blocking the main thread
 * and processes one item per idle period to remain non-blocking
 */
export declare function schedulePreload(): void;
/**
 * Clear all preloaded data
 * Call this when user logs out or when data should be refreshed
 */
export declare function clearPreloadCache(): void;
/**
 * Invalidate a specific preload cache
 * Call this when data is known to be stale (e.g., after user action)
 */
export declare function invalidatePreloadCache(
  type: 'notifications' | 'bookmarks' | 'favorites'
): void;
/**
 * Main entry point for preloading
 * Checks conditions and schedules preload during idle time
 */
export declare function initPreload(): Promise<void>;
