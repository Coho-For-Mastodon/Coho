import type { Account } from '../mastodon/types/account';
import type { TrendingTag } from '../mastodon/types/instance';
import { getAccountScopedSessionStorageKey } from '../utils/account-scoped-storage';

interface SidebarCache<T> {
  data: T;
  timestamp: number;
}

const getUserCacheKey = () => getAccountScopedSessionStorageKey('sidebar:user');
const getTrendingCacheKey = () =>
  getAccountScopedSessionStorageKey('sidebar:trending');

// Trending tags change frequently — keep a short TTL
const TRENDING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// User profile changes rarely — allow a longer TTL
const USER_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Save the current user to sessionStorage for instant restore on back-navigation.
 */
export function saveSidebarUser(user: Account): void {
  try {
    const cache: SidebarCache<Account> = {
      data: user,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(getUserCacheKey(), JSON.stringify(cache));
  } catch {
    // sessionStorage may be full or unavailable — ignore
  }
}

/**
 * Retrieve the cached user from sessionStorage.
 * Returns null if missing or expired.
 */
export function getSidebarUser(): Account | null {
  try {
    const raw = sessionStorage.getItem(getUserCacheKey());
    if (!raw) return null;

    const cache: SidebarCache<Account> = JSON.parse(raw);
    if (Date.now() - cache.timestamp > USER_CACHE_DURATION) {
      sessionStorage.removeItem(getUserCacheKey());
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
}

/**
 * Save trending tags to sessionStorage for instant restore on back-navigation.
 */
export function saveSidebarTrending(tags: TrendingTag[]): void {
  try {
    const cache: SidebarCache<TrendingTag[]> = {
      data: tags,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(getTrendingCacheKey(), JSON.stringify(cache));
  } catch {
    // sessionStorage may be full or unavailable — ignore
  }
}

/**
 * Retrieve cached trending tags from sessionStorage.
 * Returns null if missing or expired.
 */
export function getSidebarTrending(): TrendingTag[] | null {
  try {
    const raw = sessionStorage.getItem(getTrendingCacheKey());
    if (!raw) return null;

    const cache: SidebarCache<TrendingTag[]> = JSON.parse(raw);
    if (Date.now() - cache.timestamp > TRENDING_CACHE_DURATION) {
      sessionStorage.removeItem(getTrendingCacheKey());
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
}
