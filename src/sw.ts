/// <reference lib="webworker" />
/**
 * Service Worker - Orchestrator
 *
 * This is the entry point for Coho's service worker. It imports all
 * functionality from focused modules under `src/sw/` and wires them
 * to the appropriate event listeners.
 *
 * Built by custom Vite plugins (see vite.config.ts):
 * - Dev: outputs to public/sw.js (unminified)
 * - Prod: outputs to dist/sw.js (minified with inlined imports)
 *
 * All imports are statically resolved and bundled into a single file
 * by Rollup's `inlineDynamicImports: true` setting.
 */

import { get, set } from 'idb-keyval';
import type { CohoServiceWorkerGlobalScope } from './sw/types';
import { VERSION, SYNC_TAG, SYNC_QUEUE_KEY } from './sw/constants';
import { handleInstall, handleActivate } from './sw/lifecycle';
import { handleFetch } from './sw/fetch-router';
import {
  replayQueuedRequests,
  type BackgroundSyncConfig,
} from './sw/background-sync';
import { handlePush, handleNotificationClick } from './sw/notifications';
import { handlePeriodicSync } from './sw/periodic-sync';
import { handleWidgetInstall } from './sw/widgets';

// ============================================================================
// SETUP
// ============================================================================

declare const self: CohoServiceWorkerGlobalScope;

// Expose idb-keyval on self for external access (e.g., from devtools)
self.idbKeyval = { get, set };

// Log build version for debugging
console.log('[SW] Build version:', VERSION);

// Background sync configuration (shared by fetch router and sync handler)
const syncConfig: BackgroundSyncConfig = {
  get: (key: string) => get(key),
  set: (key: string, value: unknown) => set(key, value),
  syncTag: SYNC_TAG,
  queueKey: SYNC_QUEUE_KEY,
  registration: self.registration,
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Lifecycle
self.addEventListener('install', (event) => handleInstall(event));
self.addEventListener('activate', (event) => handleActivate(event));
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch routing
self.addEventListener('fetch', (event) => handleFetch(event, syncConfig));

// Background sync replay
self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  console.log('[SW] Sync event received:', syncEvent.tag);

  if (syncEvent.tag === SYNC_TAG) {
    syncEvent.waitUntil(replayQueuedRequests(syncConfig));
  }
});

// Push notifications
self.addEventListener('push', (event: PushEvent) => handlePush(event));
self.addEventListener('notificationclick', (event: NotificationEvent) =>
  handleNotificationClick(event)
);

// Periodic sync (timeline + notifications)
self.addEventListener('periodicsync', (event: Event) =>
  handlePeriodicSync(event)
);

// Widgets
self.addEventListener('widgetinstall', (event: Event) =>
  handleWidgetInstall(event)
);
