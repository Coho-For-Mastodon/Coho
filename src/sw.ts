/// <reference lib="webworker" />
/**
 * Service Worker - Single Source of Truth
 *
 * This is the main service worker for Coho. It is built by custom Vite plugins:
 * - Dev: outputs to public/sw.js (unminified)
 * - Prod: outputs to dist/sw.js (minified with inlined imports)
 *
 * See vite.config.ts for build configuration (build-sw-dev and build-sw plugins).
 */

import { get, set } from 'idb-keyval';

declare const __APP_VERSION__: string;
const VERSION = __APP_VERSION__;

const CACHE_NAMES = {
  pages: `pages-${VERSION}`,
  assets: `assets-${VERSION}`,
  images: `images-${VERSION}`,
  share: 'shareTarget',
};

// Background Sync queue name
const SYNC_TAG = 'mastodon-api-sync';
const SYNC_QUEUE_KEY = 'background-sync-queue';

// Log build version for debugging
console.log('[SW] Build version:', VERSION);

// Type augmentation for Badging API
interface NavigatorBadge {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

// Type augmentation for Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

// Type augmentation for Service Worker
declare const self: ServiceWorkerGlobalScope & {
  idbKeyval: {
    get: typeof get;
    set: typeof set;
  };
  widgets?: {
    updateByTag: (
      tag: string,
      payload: { template: string; data: string }
    ) => Promise<void>;
  };
  registration: ServiceWorkerRegistration & {
    sync: SyncManager;
  };
};

const badgingNavigator = navigator as Navigator & Partial<NavigatorBadge>;
self.idbKeyval = { get, set };

// ============================================================================
// LIFECYCLE
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', VERSION);
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.pages);
      await cache.addAll(['/', '/index.html', '/manifest.json']);
      console.log('[SW] Precached critical assets');
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', VERSION);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          // But keep shareTarget
          if (
            !Object.values(CACHE_NAMES).includes(cacheName) &&
            cacheName !== 'shareTarget'
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();

      // Notify clients
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED' });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================================
// FETCH STRATEGIES
// ============================================================================

async function networkFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function cacheFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ============================================================================
// BACKGROUND SYNC FOR OFFLINE MUTATIONS
// ============================================================================

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

/**
 * Mastodon API paths that should be queued for background sync when offline.
 * These are mutation endpoints (POST/PUT/DELETE) that modify user data.
 */
const SYNCABLE_PATTERNS = [
  /\/api\/v1\/statuses$/, // Create post
  /\/api\/v1\/statuses\/\d+$/, // Edit/delete post
  /\/api\/v1\/statuses\/\d+\/favourite$/, // Favorite
  /\/api\/v1\/statuses\/\d+\/unfavourite$/, // Unfavorite
  /\/api\/v1\/statuses\/\d+\/reblog$/, // Reblog/boost
  /\/api\/v1\/statuses\/\d+\/unreblog$/, // Unreblog
  /\/api\/v1\/statuses\/\d+\/bookmark$/, // Bookmark
  /\/api\/v1\/statuses\/\d+\/unbookmark$/, // Unbookmark
  /\/api\/v1\/statuses\/\d+\/pin$/, // Pin
  /\/api\/v1\/statuses\/\d+\/unpin$/, // Unpin
  /\/api\/v1\/statuses\/\d+\/mute$/, // Mute conversation
  /\/api\/v1\/statuses\/\d+\/unmute$/, // Unmute conversation
  /\/api\/v1\/accounts\/\d+\/follow$/, // Follow
  /\/api\/v1\/accounts\/\d+\/unfollow$/, // Unfollow
  /\/api\/v1\/accounts\/\d+\/block$/, // Block
  /\/api\/v1\/accounts\/\d+\/unblock$/, // Unblock
  /\/api\/v1\/accounts\/\d+\/mute$/, // Mute account
  /\/api\/v1\/accounts\/\d+\/unmute$/, // Unmute account
  /\/api\/v1\/polls\/\d+\/votes$/, // Vote in poll
  /\/api\/v1\/notifications\/clear$/, // Clear notifications
  /\/api\/v1\/notifications\/\d+\/dismiss$/, // Dismiss notification
];

/**
 * Check if a request URL matches a syncable Mastodon API pattern
 */
function isSyncableRequest(url: URL, method: string): boolean {
  if (method === 'GET') return false;
  return SYNCABLE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/**
 * Get the current sync queue from IndexedDB
 */
async function getSyncQueue(): Promise<QueuedRequest[]> {
  const queue = await get(SYNC_QUEUE_KEY);
  return (queue as QueuedRequest[]) || [];
}

/**
 * Save the sync queue to IndexedDB
 */
async function saveSyncQueue(queue: QueuedRequest[]): Promise<void> {
  await set(SYNC_QUEUE_KEY, queue);
}

/**
 * Add a failed request to the sync queue
 */
async function queueRequest(request: Request): Promise<void> {
  const queue = await getSyncQueue();

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
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url: request.url,
    method: request.method,
    headers,
    body,
    timestamp: Date.now(),
  };

  queue.push(queuedRequest);
  await saveSyncQueue(queue);

  console.log('[SW] Queued request for background sync:', request.url);

  // Register for background sync
  try {
    await self.registration.sync.register(SYNC_TAG);
    console.log('[SW] Background sync registered');
  } catch (err) {
    console.warn('[SW] Background sync registration failed:', err);
  }
}

/**
 * Replay all queued requests
 */
async function replayQueuedRequests(): Promise<void> {
  const queue = await getSyncQueue();
  if (queue.length === 0) {
    console.log('[SW] No queued requests to replay');
    return;
  }

  console.log('[SW] Replaying', queue.length, 'queued requests');

  const failedRequests: QueuedRequest[] = [];

  for (const queuedRequest of queue) {
    try {
      const init: RequestInit = {
        method: queuedRequest.method,
        headers: queuedRequest.headers,
      };

      if (queuedRequest.body && queuedRequest.method !== 'GET') {
        init.body = queuedRequest.body;
      }

      const response = await fetch(queuedRequest.url, init);

      if (response.ok) {
        console.log('[SW] Successfully replayed:', queuedRequest.url);
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
  await saveSyncQueue(failedRequests);

  if (failedRequests.length > 0) {
    console.log('[SW] Re-queued', failedRequests.length, 'failed requests');
  }
}

/**
 * Handle Mastodon API mutations with background sync fallback
 */
async function networkWithBackgroundSync(request: Request): Promise<Response> {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (err) {
    // Network error - queue for background sync
    console.log(
      '[SW] Network error, queuing for background sync:',
      request.url
    );
    await queueRequest(request);

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

// Listen for background sync events
self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  console.log('[SW] Sync event received:', syncEvent.tag);

  if (syncEvent.tag === SYNC_TAG) {
    syncEvent.waitUntil(replayQueuedRequests());
  }
});

// Special handler for navigation to support SPA
async function navigationHandler(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.pages);
      cache.put(request, response.clone());
      return response;
    }
  } catch (_e) {
    // ignore
  }

  // Try matching the request in cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  // Fallback to index.html
  const index = await caches.match('/index.html');
  if (index) return index;

  // If everything fails
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Share target - MUST be checked before navigation handler
  // POST form submissions have request.mode === 'navigate', so if we check
  // navigation first, share target requests would be incorrectly handled
  if (url.pathname === '/share' && request.method === 'POST') {
    console.log('[SW] Share target POST intercepted');
    event.respondWith(shareTargetHandler({ event }));
    return;
  }

  // Navigation
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
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
    event.respondWith(networkWithBackgroundSync(request));
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
      // Non-Mastodon mutations (e.g., Firebase functions) - use network with background sync
      event.respondWith(networkWithBackgroundSync(request));
    }
    return;
  }

  // Default
  event.respondWith(networkFirst(request, CACHE_NAMES.pages));
});

// ============================================================================
// CUSTOM LOGIC (Widgets, Notifications, Share Target)
// ============================================================================

interface WidgetDefinition {
  msAcTemplate: string;
  data: string;
  tag: string;
}

interface Widget {
  definition: WidgetDefinition;
}

interface WidgetInstallEvent extends ExtendableEvent {
  widget: Widget;
}

interface NotificationData {
  type:
    | 'mention'
    | 'reblog'
    | 'favourite'
    | 'follow'
    | 'poll'
    | 'follow_request'
    | 'status'
    | 'update';
  account: {
    id: string;
    display_name: string;
    url: string;
  };
  status?: {
    content: string;
  };
}

interface MastodonPushPayload {
  access_token: string;
  preferred_locale: string;
  notification_id: string;
  notification_type:
    | 'mention'
    | 'reblog'
    | 'favourite'
    | 'follow'
    | 'poll'
    | 'follow_request'
    | 'status'
    | 'update';
  icon: string;
  title: string;
  body: string;
}

interface NotificationAction {
  action: string;
  title: string;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

// Listen to the widgetinstall event.
self.addEventListener('widgetinstall', (event: Event) => {
  const widgetEvent = event as WidgetInstallEvent;
  widgetEvent.waitUntil(renderWidget(widgetEvent.widget));
});

const renderWidget = async (widget: Widget): Promise<void> => {
  const templateUrl = widget.definition.msAcTemplate;
  const dataUrl = widget.definition.data;

  const template = await (await fetch(templateUrl)).text();
  const data = await (await fetch(dataUrl)).text();

  if (self.widgets) {
    await self.widgets.updateByTag(widget.definition.tag, { template, data });
  }
};

const followAUser = async (id: string): Promise<void> => {
  const accessToken = (await get('accessToken')) as string;
  const server = (await get('server')) as string;

  await fetch(`https://${server}/api/v1/accounts/${id}/follow`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });
};

const timelineSync = async (): Promise<void> => {
  const accessToken = (await get('accessToken')) as string;
  const server = (await get('server')) as string;

  const timelineResponse = await fetch(
    `https://${server}/api/v1/timelines/home`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  const data = await timelineResponse.json();
  await set('timeline-cache', data);
};

const getNotifications = async (): Promise<void> => {
  const accessToken = (await get('accessToken')) as string;
  const server = (await get('server')) as string;

  const notifyResponse = await fetch(`https://${server}/api/v1/notifications`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = (await notifyResponse.json()) as NotificationData[];
  const notifyCheck = data.length > 0;

  if (notifyCheck) {
    if ('setAppBadge' in navigator) {
      badgingNavigator.setAppBadge?.(data.length);
    }

    let message = '';
    let actions: NotificationAction[] = [];
    let title = 'Coho';

    switch (data[0].type) {
      case 'mention':
        message = `${data[0].status?.content || ''}`;
        title = `${data[0].account.display_name} mentioned you`;
        break;
      case 'reblog':
        message = `${data[0].account.display_name} boosted your post`;
        break;
      case 'favourite':
        message = `${data[0].account.display_name} favorited your post`;
        break;
      case 'follow':
        message = `${data[0].account.display_name} followed you`;
        title = 'New Follower';
        actions = [
          {
            action: 'follow',
            title: 'Follow back',
          },
        ];
        break;
      case 'follow_request':
        message = `${data[0].account.display_name} requested to follow you`;
        title = 'Follow request';
        break;
      case 'poll':
        message = `${data[0].account.display_name} updated a poll`;
        title = 'Poll update';
        break;
      case 'status':
        message = `${data[0].account.display_name} posted a new status`;
        title = 'New status';
        break;
      case 'update':
        message = `${data[0].account.display_name} updated a post`;
        title = 'Post update';
        break;
      default:
        message = `You have ${data.length} new notifications`;
        break;
    }

    message = message.replace(/<\/?[^>]+(>|$)/g, '');

    await self.registration.showNotification(title, {
      body: message,
      icon: '/assets/icons/new-icons/icon-256x256.png',
      tag: 'coho',
      renotify: false,
      actions: actions,
      data: {
        url: data[0].account.url,
        accountId: data[0].account.id,
      },
    });
  }
};

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if ('clearAppBadge' in navigator) {
    badgingNavigator.clearAppBadge?.();
  }

  const notificationData = event.notification.data;

  const getTargetUrl = (): string => {
    if (
      !notificationData?.notification_type ||
      !notificationData?.notification_id
    ) {
      return '/home?tab=notifications';
    }

    const { notification_type, notification_id } = notificationData;

    switch (notification_type) {
      case 'mention':
      case 'reblog':
      case 'favourite':
      case 'poll':
      case 'status':
      case 'update':
        return `/post/notification?notification_id=${notification_id}`;
      case 'follow':
      case 'follow_request':
      case 'admin.sign_up':
      case 'admin.report':
        return '/home?tab=notifications';
      default:
        return '/home?tab=notifications';
    }
  };

  const targetUrl = getTargetUrl();

  const focusOrOpenWindow = async (url: string) => {
    const urlObj = new URL(url, self.location.origin);
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      const clientUrl = new URL(client.url, self.location.origin);
      if (
        clientUrl.hostname === urlObj.hostname &&
        'focus' in client &&
        'navigate' in client
      ) {
        await client.focus();
        return client.navigate(url);
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }

    return undefined;
  };

  if (
    event.action === 'follow' &&
    notificationData?.notification_id &&
    notificationData?.access_token
  ) {
    event.waitUntil(
      (async () => {
        try {
          const server = (await get('server')) as string;
          const response = await fetch(
            `https://${server}/api/v1/notifications/${notificationData.notification_id}`,
            {
              method: 'GET',
              headers: new Headers({
                Authorization: `Bearer ${notificationData.access_token}`,
              }),
            }
          );
          if (response.ok) {
            const notification = await response.json();
            if (notification.account?.id) {
              await followAUser(notification.account.id);
            }
          }
        } catch (error) {
          console.error('Failed to follow user:', error);
        }
        await focusOrOpenWindow(targetUrl);
      })()
    );
    return;
  }

  event.waitUntil(focusOrOpenWindow(targetUrl));
});

self.addEventListener('push', async (event: PushEvent) => {
  let payload: MastodonPushPayload;
  try {
    payload = event.data?.json() as MastodonPushPayload;
  } catch (err) {
    console.error('Failed to parse push payload', err);
    return;
  }

  if ('setAppBadge' in navigator) {
    badgingNavigator.setAppBadge?.(1);
  }

  let actions: NotificationAction[] = [];
  if (payload.notification_type === 'follow') {
    actions = [
      {
        action: 'follow',
        title: 'Follow back',
      },
    ];
  }

  payload.body = payload.body?.replace(/<\/?[^>]+(>|$)/g, '');

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Coho', {
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/assets/icons/new-icons/icon-256x256.png',
      tag: payload.notification_id || 'coho',
      badge: '/assets/icons/new-icons/icon-256x256.png',
      renotify: true,
      actions: actions,
      data: {
        access_token: payload.access_token,
        notification_id: payload.notification_id,
        notification_type: payload.notification_type,
        preferred_locale: payload.preferred_locale,
      },
    })
  );
});

self.addEventListener('periodicsync', async (event: Event) => {
  const periodicSyncEvent = event as PeriodicSyncEvent;

  switch (periodicSyncEvent.tag) {
    case 'get-notifications':
      periodicSyncEvent.waitUntil(getNotifications());
      break;
    case 'timeline-sync':
      periodicSyncEvent.waitUntil(timelineSync());
      break;
    default:
      break;
  }
});

interface ShareTargetHandlerEvent {
  event: FetchEvent;
}

async function shareTargetHandler({
  event,
}: ShareTargetHandlerEvent): Promise<Response> {
  console.log('[SW] shareTargetHandler invoked');

  try {
    const formData = await event.request.formData();
    const mediaFiles = formData.getAll('image') as File[];
    const cache = await caches.open('shareTarget');

    console.log('[SW] Share target received', mediaFiles.length, 'files');

    if (mediaFiles.length === 0) {
      console.warn('[SW] Share target: No files received in form data');
      return Response.redirect('/home', 303);
    }

    for (const mediaFile of mediaFiles) {
      const cacheKey = `/_share/${encodeURIComponent(mediaFile.name)}`;
      console.log(
        '[SW] Caching file with key:',
        cacheKey,
        'size:',
        mediaFile.size,
        'type:',
        mediaFile.type
      );
      await cache.put(
        cacheKey,
        new Response(mediaFile, {
          headers: {
            'content-length': mediaFile.size.toString(),
            'content-type': mediaFile.type,
          },
        })
      );
    }

    const redirectUrl = `/home?name=${encodeURIComponent(mediaFiles[0].name)}`;
    console.log('[SW] Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 303);
  } catch (error) {
    console.error('[SW] shareTargetHandler error:', error);
    return Response.redirect('/home', 303);
  }
}
