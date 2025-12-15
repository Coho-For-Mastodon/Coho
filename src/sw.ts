/// <reference lib="webworker" />

import { get, set } from 'idb-keyval';

declare const __APP_VERSION__: string;
const VERSION = __APP_VERSION__;

const CACHE_NAMES = {
  pages: `pages-${VERSION}`,
  assets: `assets-${VERSION}`,
  images: `images-${VERSION}`,
  share: 'shareTarget',
};

// Log build version for debugging
console.log('[SW] Build version:', VERSION);

// Type augmentation for Badging API
interface NavigatorBadge {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
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

async function networkOnly(request: Request): Promise<Response> {
  return fetch(request);
}

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

  // Navigation
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Share target
  if (url.pathname === '/share' && request.method === 'POST') {
    event.respondWith(shareTargetHandler({ event }));
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

  // API / Dynamic content
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('cloudfunctions')
  ) {
    if (request.method === 'GET') {
      event.respondWith(networkFirst(request, CACHE_NAMES.pages));
    } else {
      event.respondWith(networkOnly(request));
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
  const formData = await event.request.formData();
  const mediaFiles = formData.getAll('image') as File[];
  const cache = await caches.open('shareTarget');

  console.log('[SW] Share target received', mediaFiles.length, 'files');

  for (const mediaFile of mediaFiles) {
    const cacheKey = `/_share/${encodeURIComponent(mediaFile.name)}`;
    console.log('[SW] Caching file with key:', cacheKey);
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
}
