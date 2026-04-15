/**
 * Background Sync for Offline Mutations
 *
 * A reusable background sync queue that stores failed mutation requests
 * in IndexedDB and replays them when connectivity is restored.
 *
 * Designed as a library-quality API:
 * - Accepts a storage backend (get/set) rather than importing idb-keyval directly
 * - Configurable sync tag and queue key
 * - Framework-agnostic: works with any service worker
 *
 * Usage:
 *   const config: BackgroundSyncConfig = { get, set, syncTag: 'my-sync', queueKey: 'sync-queue', registration };
 *   // In fetch handler: networkWithBackgroundSync(config, request)
 *   // In sync handler:  replayQueuedRequests(config)
 */

import type { QueuedRequest, SyncManager } from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface BackgroundSyncConfig {
  /** Async getter for IndexedDB values (e.g., idb-keyval's `get`) */
  get: (key: string) => Promise<unknown>;
  /** Async setter for IndexedDB values (e.g., idb-keyval's `set`) */
  set: (key: string, value: unknown) => Promise<void>;
  /** Tag used for Background Sync API registration */
  syncTag: string;
  /** IndexedDB key where the queue is stored */
  queueKey: string;
  /** Reference to the SW registration (for sync.register) */
  registration: ServiceWorkerRegistration & { sync: SyncManager };
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Get the current sync queue from IndexedDB.
 */
export async function getSyncQueue(
  config: Pick<BackgroundSyncConfig, 'get' | 'queueKey'>
): Promise<QueuedRequest[]> {
  const queue = await config.get(config.queueKey);
  return (queue as QueuedRequest[]) || [];
}

/**
 * Save the sync queue to IndexedDB.
 */
export async function saveSyncQueue(
  config: Pick<BackgroundSyncConfig, 'set' | 'queueKey'>,
  queue: QueuedRequest[]
): Promise<void> {
  await config.set(config.queueKey, queue);
}

/**
 * Serialize and add a failed request to the sync queue.
 */
export async function queueRequest(
  config: BackgroundSyncConfig,
  request: Request
): Promise<void> {
  const queue = await getSyncQueue(config);

  // Serialize the request
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: string | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.clone().text();
    } catch {
      // Body may already be consumed
    }
  }

  const queuedRequest: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    url: request.url,
    method: request.method,
    headers,
    body,
    timestamp: Date.now(),
  };

  queue.push(queuedRequest);
  await saveSyncQueue(config, queue);

  // Register for background sync
  try {
    await config.registration.sync.register(config.syncTag);
  } catch (err) {
    console.warn('[SW] Background sync registration failed:', err);
  }
}

/**
 * Replay all queued requests. Successfully replayed requests are removed
 * from the queue. Server errors (5xx) are re-queued; client errors (4xx)
 * are discarded.
 */
export async function replayQueuedRequests(
  config: Pick<BackgroundSyncConfig, 'get' | 'set' | 'queueKey'>,
  options?: { refreshAuthHeader?: () => Promise<string | null> }
): Promise<void> {
  const queue = await getSyncQueue(config);
  if (queue.length === 0) {
    return;
  }

  // Refresh the auth token once before replaying the batch
  let freshAuthHeader: string | null = null;
  if (options?.refreshAuthHeader) {
    freshAuthHeader = await options.refreshAuthHeader();
  }

  const failedRequests: QueuedRequest[] = [];

  for (const queuedRequest of queue) {
    try {
      const headers = { ...queuedRequest.headers };
      if (freshAuthHeader) {
        // Headers may be lowercase from request.headers.forEach serialization
        const authKey = Object.keys(headers).find(
          (k) => k.toLowerCase() === 'authorization'
        );
        if (authKey) {
          headers[authKey] = freshAuthHeader;
        }
      }

      const init: RequestInit = {
        method: queuedRequest.method,
        headers,
      };

      if (queuedRequest.body && queuedRequest.method !== 'GET') {
        init.body = queuedRequest.body;
      }

      const response = await fetch(queuedRequest.url, init);

      if (response.ok) {
        // Successfully replayed
      } else {
        console.warn(
          '[SW] Replay failed with status:',
          response.status,
          queuedRequest.url
        );
        // Don't re-queue 4xx errors (client errors)
        if (response.status >= 500) {
          failedRequests.push(queuedRequest);
        }
      }
    } catch (err) {
      console.error('[SW] Replay network error:', queuedRequest.url, err);
      failedRequests.push(queuedRequest);
    }
  }

  // Save any requests that still failed
  await saveSyncQueue(config, failedRequests);

  if (failedRequests.length > 0) {
    console.warn('[SW] Re-queued', failedRequests.length, 'failed requests');
  }
}

/**
 * Handle a fetch with background sync fallback. Attempts the network first;
 * on failure, queues the request for later replay and returns a synthetic
 * 202 Accepted response so the UI can update optimistically.
 */
export async function networkWithBackgroundSync(
  config: BackgroundSyncConfig,
  request: Request
): Promise<Response> {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Network error — queue for background sync
    await queueRequest(config, request);

    // Return a synthetic response so the UI can update optimistically
    return new Response(
      JSON.stringify({
        queued: true,
        message: 'Request queued for when you are back online',
      }),
      {
        status: 202,
        statusText: 'Accepted',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
