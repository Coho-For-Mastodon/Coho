/**
 * Service Worker Lifecycle Handlers
 *
 * Install and activate event handlers. Precaches critical assets
 * on install, purges old caches on activate.
 */

import type { CohoServiceWorkerGlobalScope } from './types';
import { CACHE_NAMES, VERSION } from './constants';

declare const self: CohoServiceWorkerGlobalScope;

/**
 * Handle the `install` event. Precaches critical app-shell assets
 * so the app can load offline immediately after installation.
 */
export function handleInstall(event: ExtendableEvent): void {
  console.log('[SW] Installing new version:', VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.pages);
      await cache.addAll(['/', '/index.html', '/manifest.json']);
      console.log('[SW] Precached critical assets');
    })()
  );
}

/**
 * Handle the `activate` event. Deletes old versioned caches and claims
 * all open clients so the new SW takes effect immediately.
 */
export function handleActivate(event: ExtendableEvent): void {
  console.log('[SW] Activating new version:', VERSION);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches: string[] = Object.values(CACHE_NAMES);
      await Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          // But keep shareTarget (not versioned)
          if (!validCaches.includes(cacheName) && cacheName !== 'shareTarget') {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );

      await self.clients.claim();

      // Notify all clients that a new version is active
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED' });
      }
    })()
  );
}
