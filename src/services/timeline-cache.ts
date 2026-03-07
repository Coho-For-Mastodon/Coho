import { Post } from '../interfaces/Post';
import { getAccountScopedSessionStorageKey } from '../utils/account-scoped-storage';

interface TimelineCache {
  data: Post[];
  timestamp: number;
  timelineType: string;
  scrollPosition: number;
}

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute - short TTL since we use stale-while-revalidate

const getTimelineCacheKey = (timelineType: string) =>
  getAccountScopedSessionStorageKey(`timeline_cache:${timelineType}`);

/**
 * Save timeline data to sessionStorage
 * @param timelineType - The type of timeline (home, public, media, etc.)
 * @param data - The timeline posts
 * @param scrollPosition - Current scroll position
 */
export function saveTimelineCache(
  timelineType: string,
  data: Post[],
  scrollPosition: number = 0
): void {
  try {
    const cache: TimelineCache = {
      data,
      timestamp: Date.now(),
      timelineType,
      scrollPosition,
    };
    sessionStorage.setItem(
      getTimelineCacheKey(timelineType),
      JSON.stringify(cache)
    );
    console.log(`Timeline cache saved for ${timelineType}`, {
      posts: data.length,
      scrollPosition,
    });
  } catch (error) {
    console.error('Failed to save timeline cache:', error);
  }
}

/**
 * Retrieve timeline data from sessionStorage
 * @param timelineType - The type of timeline to retrieve
 * @returns Cached data or null if expired/missing
 */
export function getTimelineCache(timelineType: string): TimelineCache | null {
  try {
    const cacheKey = getTimelineCacheKey(timelineType);
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) {
      return null;
    }

    const cache: TimelineCache = JSON.parse(cached);

    // Check if cache is still valid
    const isExpired = Date.now() - cache.timestamp > CACHE_DURATION;
    if (isExpired) {
      console.log(`Timeline cache expired for ${timelineType}`);
      clearTimelineCache(timelineType);
      return null;
    }

    console.log(`Timeline cache hit for ${timelineType}`, {
      posts: cache.data.length,
      age: Math.round((Date.now() - cache.timestamp) / 1000) + 's',
      scrollPosition: cache.scrollPosition,
    });

    return cache;
  } catch (error) {
    console.error('Failed to retrieve timeline cache:', error);
    return null;
  }
}

/**
 * Clear cache for specific timeline type
 * @param timelineType - The type of timeline to clear
 */
export function clearTimelineCache(timelineType?: string): void {
  try {
    if (timelineType) {
      sessionStorage.removeItem(getTimelineCacheKey(timelineType));
      console.log(`Timeline cache cleared for ${timelineType}`);
    } else {
      // Clear all timeline caches
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.includes(':session:timeline_cache:')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('All timeline caches cleared');
    }
  } catch (error) {
    console.error('Failed to clear timeline cache:', error);
  }
}

/**
 * Update scroll position in cache without re-saving entire dataset
 * @param timelineType - The type of timeline
 * @param scrollPosition - New scroll position
 */
export function updateCacheScrollPosition(
  timelineType: string,
  scrollPosition: number
): void {
  try {
    const cacheKey = getTimelineCacheKey(timelineType);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cache: TimelineCache = JSON.parse(cached);
      cache.scrollPosition = scrollPosition;
      sessionStorage.setItem(cacheKey, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('Failed to update cache scroll position:', error);
  }
}

/**
 * Check if cache exists and is valid for a given timeline type
 * @param timelineType - The type of timeline to check
 * @returns true if valid cache exists
 */
export function hasFreshCache(timelineType: string): boolean {
  const cache = getTimelineCache(timelineType);
  return cache !== null && cache.data.length > 0;
}
