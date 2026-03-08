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
import { getAccountScopedSessionStorageKey } from '../utils/account-scoped-storage';

// Cache keys for preloaded data
const getPreloadNotificationsKey = () =>
  getAccountScopedSessionStorageKey('preload:notifications');
const getPreloadBookmarksKey = () =>
  getAccountScopedSessionStorageKey('preload:bookmarks');
const getPreloadFavoritesKey = () =>
  getAccountScopedSessionStorageKey('preload:favorites');

// How long preloaded data is considered fresh (5 minutes)
const PRELOAD_TTL = 5 * 60 * 1000;

interface PreloadCache<T> {
  data: T;
  timestamp: number;
}

// Network Information API types
interface NetworkInformation {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

/**
 * Check if preloading conditions are met
 */
export async function canPreload(): Promise<boolean> {
  // Check if user is authenticated
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    console.log('[Preload] Skipped: Not authenticated');
    return false;
  }

  // Check data-saver setting
  const { getSettings } = await import('./settings');
  const settings = await getSettings();
  if (settings.data_saver) {
    console.log('[Preload] Skipped: Data saver enabled');
    return false;
  }

  // Check network conditions
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: NetworkInformation })
      .connection;

    // Skip on slow connections or if browser's save-data is enabled
    if (
      conn?.saveData ||
      conn?.effectiveType === 'slow-2g' ||
      conn?.effectiveType === '2g' ||
      conn?.effectiveType === '3g'
    ) {
      console.log('[Preload] Skipped: Poor network conditions');
      return false;
    }
  }

  return true;
}

/**
 * Request idle callback with timeout fallback for Safari
 */
function requestIdleCallbackPolyfill(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return (
      window as Window & { requestIdleCallback: typeof requestIdleCallback }
    ).requestIdleCallback(callback, options);
  }

  // Fallback for Safari: use setTimeout with a synthetic deadline
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
}

/**
 * Get preloaded notifications if fresh
 */
export function getPreloadedNotifications(): MastodonNotification[] | null {
  try {
    const cacheKey = getPreloadNotificationsKey();
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: PreloadCache<MastodonNotification[]> =
      JSON.parse(cached);
    if (Date.now() - timestamp > PRELOAD_TTL) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    console.log('[Preload] Notifications cache hit', { count: data.length });
    return data;
  } catch {
    return null;
  }
}

/**
 * Get preloaded bookmarks if fresh
 */
export function getPreloadedBookmarks(): Post[] | null {
  try {
    const cacheKey = getPreloadBookmarksKey();
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: PreloadCache<Post[]> = JSON.parse(cached);
    if (Date.now() - timestamp > PRELOAD_TTL) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    console.log('[Preload] Bookmarks cache hit', { count: data.length });
    return data;
  } catch {
    return null;
  }
}

/**
 * Get preloaded favorites if fresh
 */
export function getPreloadedFavorites(): Post[] | null {
  try {
    const cacheKey = getPreloadFavoritesKey();
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp }: PreloadCache<Post[]> = JSON.parse(cached);
    if (Date.now() - timestamp > PRELOAD_TTL) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    console.log('[Preload] Favorites cache hit', { count: data.length });
    return data;
  } catch {
    return null;
  }
}

/**
 * Save preloaded data to cache
 */
function saveToCache<T>(key: string, data: T): void {
  try {
    const cache: PreloadCache<T> = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(cache));
  } catch (error) {
    // sessionStorage might be full or unavailable
    console.warn('[Preload] Failed to save to cache:', error);
  }
}

/**
 * Preload notifications during idle time
 */
async function preloadNotifications(): Promise<void> {
  // Check if already cached and fresh
  if (getPreloadedNotifications()) {
    console.log('[Preload] Notifications already cached');
    return;
  }

  try {
    const { getNotifications } = await import('./notifications');
    const data = await getNotifications();
    saveToCache(getPreloadNotificationsKey(), data);
    console.log('[Preload] Notifications preloaded', { count: data.length });
  } catch (error) {
    console.warn('[Preload] Failed to preload notifications:', error);
  }
}

/**
 * Preload bookmarks during idle time
 */
async function preloadBookmarks(): Promise<void> {
  // Check if already cached and fresh
  if (getPreloadedBookmarks()) {
    console.log('[Preload] Bookmarks already cached');
    return;
  }

  try {
    const { getBookmarks } = await import('./bookmarks');
    const data = await getBookmarks();
    saveToCache(getPreloadBookmarksKey(), data);
    console.log('[Preload] Bookmarks preloaded', { count: data.length });
  } catch (error) {
    console.warn('[Preload] Failed to preload bookmarks:', error);
  }
}

/**
 * Preload favorites during idle time
 */
async function preloadFavorites(): Promise<void> {
  // Check if already cached and fresh
  if (getPreloadedFavorites()) {
    console.log('[Preload] Favorites already cached');
    return;
  }

  try {
    const { getFavorites } = await import('./favorites');
    const data = await getFavorites();
    saveToCache(getPreloadFavoritesKey(), data);
    console.log('[Preload] Favorites preloaded', { count: data.length });
  } catch (error) {
    console.warn('[Preload] Failed to preload favorites:', error);
  }
}

/**
 * Schedule preloading during idle time
 * Uses requestIdleCallback to avoid blocking the main thread
 * and processes one item per idle period to remain non-blocking
 */
export function schedulePreload(): void {
  // Queue of preload tasks
  const preloadQueue = [
    preloadNotifications,
    preloadBookmarks,
    preloadFavorites,
  ];

  let queueIndex = 0;

  const processNextItem = (deadline: IdleDeadline): void => {
    // Check if we have time remaining in this idle period
    // and there are still items to process
    while (queueIndex < preloadQueue.length && deadline.timeRemaining() > 0) {
      const task = preloadQueue[queueIndex];
      queueIndex++;

      // Start the async task (it will complete after this idle callback)
      task().catch((err) => {
        console.warn('[Preload] Task failed:', err);
      });

      // Only do one task per idle callback to stay responsive
      // The next task will be picked up in the next idle period
      break;
    }

    // If there are more items, schedule another idle callback
    if (queueIndex < preloadQueue.length) {
      requestIdleCallbackPolyfill(processNextItem, { timeout: 5000 });
    } else {
      console.log('[Preload] All preload tasks scheduled');
    }
  };

  // Start processing during idle time with a 5 second timeout
  // The timeout ensures preloading eventually happens even on busy pages
  requestIdleCallbackPolyfill(processNextItem, { timeout: 5000 });
}

/**
 * Clear all preloaded data
 * Call this when user logs out or when data should be refreshed
 */
export function clearPreloadCache(): void {
  sessionStorage.removeItem(getPreloadNotificationsKey());
  sessionStorage.removeItem(getPreloadBookmarksKey());
  sessionStorage.removeItem(getPreloadFavoritesKey());
  console.log('[Preload] Cache cleared');
}

/**
 * Invalidate a specific preload cache
 * Call this when data is known to be stale (e.g., after user action)
 */
export function invalidatePreloadCache(
  type: 'notifications' | 'bookmarks' | 'favorites'
): void {
  const keyMap = {
    notifications: getPreloadNotificationsKey(),
    bookmarks: getPreloadBookmarksKey(),
    favorites: getPreloadFavoritesKey(),
  };
  sessionStorage.removeItem(keyMap[type]);
  console.log(`[Preload] ${type} cache invalidated`);
}

/**
 * Main entry point for preloading
 * Checks conditions and schedules preload during idle time
 */
export async function initPreload(): Promise<void> {
  // Wait for page to be fully interactive before checking conditions
  // This ensures we don't interfere with initial page load
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      window.addEventListener('load', () => resolve(), { once: true });
    });
  }

  // Add a small delay to ensure critical resources are loaded
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const shouldPreload = await canPreload();
  if (!shouldPreload) {
    return;
  }

  console.log('[Preload] Starting idle-time preload...');
  schedulePreload();
}
