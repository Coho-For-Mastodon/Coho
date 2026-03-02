/**
 * Fetch Router
 *
 * Routes incoming fetch events to the appropriate caching strategy
 * based on request type, destination, and URL pattern.
 */

import { CACHE_NAMES } from './constants';
import { networkFirst, cacheFirst, navigationHandler } from './strategies';
import {
  networkWithBackgroundSync,
  type BackgroundSyncConfig,
} from './background-sync';
import { isSyncableRequest } from './syncable-patterns';
import { shareTargetHandler } from './share-target';

/**
 * Main fetch event handler. Routes requests to strategies:
 *
 * - Share target POST → share target handler
 * - Navigation → SPA app-shell (network-first for index.html)
 * - Scripts/Styles → cache-first (immutable hashed assets)
 * - Images → cache-first
 * - Mastodon API mutations → network with background sync fallback
 * - API/Cloud Functions GET → network-first
 * - API/Cloud Functions mutations → network with background sync
 * - Default → network-first
 */
export function handleFetch(
  event: FetchEvent,
  syncConfig: BackgroundSyncConfig
): void {
  const request = event.request;
  const url = new URL(request.url);

  // Share target — MUST be checked before navigation handler.
  // POST form submissions have request.mode === 'navigate', so if we check
  // navigation first, share target requests would be incorrectly handled.
  if (url.pathname === '/share' && request.method === 'POST') {
    console.log('[SW] Share target POST intercepted');
    event.respondWith(shareTargetHandler(event));
    return;
  }

  // Navigation
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request, CACHE_NAMES.pages));
    return;
  }

  // Assets (JS/CSS)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.assets));
    return;
  }

  // Images
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
    return;
  }

  // Mastodon API mutations with background sync support
  if (isSyncableRequest(url, request.method)) {
    event.respondWith(networkWithBackgroundSync(syncConfig, request));
    return;
  }

  // API / Dynamic content
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('cloudfunctions')
  ) {
    if (request.method === 'GET') {
      event.respondWith(networkFirst(request, CACHE_NAMES.pages));
    } else {
      // Non-Mastodon mutations (e.g., Firebase functions)
      event.respondWith(networkWithBackgroundSync(syncConfig, request));
    }
    return;
  }

  // Default
  event.respondWith(networkFirst(request, CACHE_NAMES.pages));
}
