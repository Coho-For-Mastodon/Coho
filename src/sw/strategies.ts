/**
 * Service Worker Caching Strategies
 *
 * Reusable fetch strategies for service workers. Designed as library-quality
 * APIs that can be extracted into a standalone SW toolkit.
 *
 * Strategies:
 * - `networkFirst` — Try network, fall back to cache
 * - `cacheFirst` — Try cache, fall back to network
 * - `navigationHandler` — SPA app-shell strategy (network-first for index.html)
 *
 * All strategies use `evaluateCacheResponse` to validate responses before
 * caching, preventing MIME-mismatch issues during deploys.
 */

import { evaluateCacheResponse } from './cache-policy';

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Safely put a response into cache, catching errors from broken body streams.
 * On slow/flaky networks, opaque or partially-received responses can have
 * corrupted body streams that cause `cache.put()` to throw a NetworkError.
 */
export async function safeCachePut(
  cache: Cache,
  request: RequestInfo,
  response: Response
): Promise<void> {
  try {
    await cache.put(request, response);
  } catch (err) {
    console.warn('[SW] cache.put() failed (likely a broken body stream):', err);
  }
}

/**
 * Enforce a max entry count for a cache by evicting oldest entries first.
 * Cache Storage preserves insertion order in `cache.keys()`.
 */
export async function pruneCacheToMaxEntries(
  cache: Cache,
  maxEntries: number
): Promise<void> {
  if (maxEntries <= 0) return;

  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  if (overflow <= 0) return;

  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

/**
 * Log a warning when a cache write is skipped for a critical asset type.
 * Only warns for scripts and styles to reduce noise.
 */
export function warnCacheSkip(request: Request, reason: string): void {
  if (request.destination === 'script' || request.destination === 'style') {
    console.warn(
      '[SW][CACHE_GUARD] Skipping cache write:',
      reason,
      request.url
    );
  }
}

// ============================================================================
// Fetch Strategies
// ============================================================================

/**
 * Network-first strategy: try the network, cache the response if valid,
 * fall back to a cached version if the network fails.
 *
 * Best for: HTML pages, API responses, dynamic content.
 */
export async function networkFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    const cacheDecision = evaluateCacheResponse(request, response);
    if (cacheDecision.shouldCache) {
      await safeCachePut(cache, request, response.clone());
    } else if (cacheDecision.reason) {
      warnCacheSkip(request, cacheDecision.reason);
    }
    return response;
  } catch (error) {
    // Search only in the specific versioned cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Cache-first strategy: serve from cache if available, otherwise fetch
 * from network and cache the response.
 *
 * Best for: immutable assets (hashed JS/CSS), images.
 */
export async function cacheFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  // Search only in the specific versioned cache, not all caches.
  // This prevents serving stale assets from old cache versions.
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  const response = await fetch(request);
  const cacheDecision = evaluateCacheResponse(request, response);
  if (cacheDecision.shouldCache) {
    await safeCachePut(cache, request, response.clone());
  } else if (cacheDecision.reason) {
    warnCacheSkip(request, cacheDecision.reason);
  }
  return response;
}

/**
 * Cache-first with bounded cache growth.
 */
export async function cacheFirstWithLimit(
  request: Request,
  cacheName: string,
  maxEntries: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  const cacheDecision = evaluateCacheResponse(request, response);
  if (cacheDecision.shouldCache) {
    await safeCachePut(cache, request, response.clone());
    await pruneCacheToMaxEntries(cache, maxEntries);
  } else if (cacheDecision.reason) {
    warnCacheSkip(request, cacheDecision.reason);
  }
  return response;
}

/**
 * SPA navigation handler: network-first for the app shell (index.html).
 * Uses a single cache key for all navigation requests to avoid stale
 * per-route HTML. Falls back to cached shell when offline.
 *
 * Best for: Single Page Applications with client-side routing.
 */
export async function navigationHandler(
  request: Request,
  pagesCacheName: string,
  appShellPath = '/index.html'
): Promise<Response> {
  const cache = await caches.open(pagesCacheName);

  // App shell stored under one cache key to avoid stale per-route HTML.
  const cachedIndex = await cache.match(appShellPath);
  try {
    const networkResponse = await fetch(appShellPath, { cache: 'no-cache' });
    if (networkResponse.ok) {
      await safeCachePut(cache, appShellPath, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline / transient fetch failure; fall back to cache.
  }

  if (cachedIndex) return cachedIndex;

  // Final fallback: try the original navigation request.
  try {
    return await fetch(request);
  } catch {
    // Everything failed
  }
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
