/// <reference lib="webworker" />

import { NetworkOnly, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { get, set } from 'idb-keyval';
import { RouteHandlerCallback } from 'workbox-core';

// Type augmentation for Badging API (not yet in all TypeScript libs)
interface NavigatorBadge {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

// Type augmentation for Service Worker
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
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

// Navigator with Badging API support
const badgingNavigator = navigator as Navigator & Partial<NavigatorBadge>;

// Make idb-keyval available on self for backwards compatibility
self.idbKeyval = { get, set };

// Detect development mode - Vite dev server serves from localhost with HMR
const IS_DEV =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// ============================================================================
// PRECACHING & APP SHELL
// ============================================================================
if (!IS_DEV) {
  // 1. Clean up outdated caches
  // This runs during the 'activate' phase, after the new SW takes control.
  // This is safe because we force a reload immediately upon activation.
  cleanupOutdatedCaches();

  // 2. Precache all assets (including index.html)
  // This downloads the new index.html + new JS/CSS in the background.
  const manifest = self.__WB_MANIFEST;
  if (manifest) {
    precacheAndRoute(manifest);
  }

  // 3. Navigation Route - The "Cache First" App Shell
  // This tells the SW: "For any navigation request, serve the index.html
  // that was precached in step 1."
  // This guarantees atomic updates: the index.html served matches the JS/CSS in the cache.
  try {
    const handler = createHandlerBoundToURL('/index.html');
    const navigationRoute = new NavigationRoute(handler, {
      denylist: [
        // Exclude specific paths if needed (e.g. backend API routes)
        /^\/api\//,
      ],
    });
    registerRoute(navigationRoute);
  } catch (error) {
    console.error('[SW] Failed to create App Shell handler:', error);
  }
} else {
  console.log('[SW] Development mode: precaching and app shell disabled');
  // In dev, just pass through to the network
  const navigationRoute = new NavigationRoute(new NetworkOnly());
  registerRoute(navigationRoute);
}

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================
// We do NOT auto-skipWaiting here because old clients don't have coordinated
// reload logic. Instead, we wait for the client to send SKIP_WAITING message
// (handled in the message listener below).

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

// Mastodon push notification payload format (what the server actually sends)
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

// Notification action interface
interface NotificationAction {
  action: string;
  title: string;
}

// PeriodicSyncEvent interface (not yet in TypeScript lib)
interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

// Navigation route logic moved to the main PRECACHING block above to keep
// the App Shell strategy consolidated.
// The following block is removed to avoid duplication.

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'WARM_CACHE') {
    // Warm cache on app boot if network conditions are good
    event.waitUntil(warmCache());
  }
});

// Clean up old caches when a new service worker activates
// This prevents version mismatches between cached HTML/JS/CSS
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // IMPORTANT: Claim clients FIRST before any cleanup
      // This ensures the new SW controls all tabs as quickly as possible
      // to prevent stale content from being served during cache cleanup
      await self.clients.claim();
      console.log('[SW] Claimed all clients');

      // Delete ALL runtime caches to prevent stale content issues
      // This is aggressive but ensures version consistency
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          // Keep workbox precache (it's already versioned) but clear runtime caches
          if (!cacheName.includes('workbox-precache')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );

      console.log('[SW] Activated and cleaned up caches');

      // Notify all clients that the update is ready
      // This allows clients to do a coordinated reload AFTER the SW is fully ready
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED' });
      }
      console.log('[SW] Notified clients of activation');
    })()
  );
});

// Listen to the widgetinstall event.
self.addEventListener('widgetinstall', (event: Event) => {
  const widgetEvent = event as WidgetInstallEvent;
  // The widget just got installed, render it using renderWidget.
  // Pass the event.widget object to the function.
  widgetEvent.waitUntil(renderWidget(widgetEvent.widget));
});

const renderWidget = async (widget: Widget): Promise<void> => {
  // Get the template and data URLs from the widget definition.
  const templateUrl = widget.definition.msAcTemplate;
  const dataUrl = widget.definition.data;

  // Fetch the template text and data.
  const template = await (await fetch(templateUrl)).text();
  const data = await (await fetch(dataUrl)).text();

  // Render the widget with the template and data.
  if (self.widgets) {
    await self.widgets.updateByTag(widget.definition.tag, { template, data });
  }
};

// This is your Service Worker, you can put any of your custom Service Worker
// code in this file, above the `precacheAndRoute` line.
const bgSyncPlugin = new BackgroundSyncPlugin('retryqueue', {
  maxRetentionTime: 48 * 60,
});

const followAUser = async (id: string): Promise<void> => {
  // follow a user with the mastodon api
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

  // store timeline in idb
  await set('timeline-cache', data);
};

const getNotifications = async (): Promise<void> => {
  // get access token from idb
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
    // show badge
    if ('setAppBadge' in navigator) {
      badgingNavigator.setAppBadge?.(data.length);
    }

    // build message for notification
    let message = '';
    let actions: NotificationAction[] = [];
    let title = 'Coho';

    // if data[0].type === 'mention' || 'reblog' || 'favourite'
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
      default:
        message = `You have ${data.length} new notifications`;
        break;
    }

    // show notification
    await self.registration.showNotification(title, {
      body: message,
      icon: '/assets/icons/new-icons/icon-256x256.webp',
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
  const targetUrl = '/home?tab=notifications';

  // Helper to focus existing window or open new one
  const focusOrOpenWindow = async (url: string) => {
    const urlObj = new URL(url, self.location.origin);

    // Get all window clients
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    // Check if there's already a tab open
    for (const client of clientList) {
      const clientUrl = new URL(client.url, self.location.origin);
      // If we have a matching root path, focus it and navigate
      if (
        clientUrl.hostname === urlObj.hostname &&
        'focus' in client &&
        'navigate' in client
      ) {
        await client.focus();
        return client.navigate(url);
      }
    }

    // If no window found, open a new one
    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }

    return undefined;
  };

  // Handle follow action - need to fetch notification to get account ID
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
  // Mastodon sends a single notification payload, not an array
  let payload: MastodonPushPayload;
  try {
    payload = event.data?.json() as MastodonPushPayload;
  } catch (err) {
    console.error('Failed to parse push payload', err);
    return;
  }

  // show badge
  if ('setAppBadge' in navigator) {
    badgingNavigator.setAppBadge?.(1);
  }

  // Build actions based on notification type
  let actions: NotificationAction[] = [];
  if (payload.notification_type === 'follow') {
    actions = [
      {
        action: 'follow',
        title: 'Follow back',
      },
    ];
  }

  // show notification using the data Mastodon provides
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Coho', {
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/assets/icons/new-icons/icon-256x256.webp',
      tag: payload.notification_id || 'coho',
      badge: '/assets/icons/new-icons/icon-256x256.webp',
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

// Cache warming functions for better UX
const warmNotificationsCache = async (): Promise<void> => {
  try {
    const accessToken = (await get('accessToken')) as string;
    const server = (await get('server')) as string;

    if (!accessToken || !server) {
      console.log('[SW] Cache warming skipped: No auth credentials');
      return;
    }

    const url = `https://${server}/api/v1/notifications`;
    const response = await fetch(url, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    });

    if (response.ok) {
      const cache = await caches.open('notifications');
      await cache.put(url, response.clone());
      console.log('[SW] Notifications cache warmed');
    }
  } catch (error) {
    console.error('[SW] Failed to warm notifications cache:', error);
  }
};

const warmBookmarksCache = async (): Promise<void> => {
  try {
    const accessToken = (await get('accessToken')) as string;
    const server = (await get('server')) as string;

    if (!accessToken || !server) {
      console.log('[SW] Cache warming skipped: No auth credentials');
      return;
    }

    const url = `https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks?code=${accessToken}&server=${server}`;
    const response = await fetch(url, {
      method: 'GET',
    });

    if (response.ok) {
      const cache = await caches.open('bookmarks');
      await cache.put(url, response.clone());
      console.log('[SW] Bookmarks cache warmed');
    }
  } catch (error) {
    console.error('[SW] Failed to warm bookmarks cache:', error);
  }
};

const warmFavoritesCache = async (): Promise<void> => {
  try {
    const accessToken = (await get('accessToken')) as string;
    const server = (await get('server')) as string;

    if (!accessToken || !server) {
      console.log('[SW] Cache warming skipped: No auth credentials');
      return;
    }

    const url = `https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites?code=${accessToken}&server=${server}`;
    const response = await fetch(url, {
      method: 'GET',
    });

    if (response.ok) {
      const cache = await caches.open('favorites');
      await cache.put(url, response.clone());
      console.log('[SW] Favorites cache warmed');
    }
  } catch (error) {
    console.error('[SW] Failed to warm favorites cache:', error);
  }
};

const warmCache = async (): Promise<void> => {
  // Skip cache warming in development mode
  if (IS_DEV) {
    console.log('[SW] Development mode: cache warming skipped');
    return;
  }

  console.log('[SW] Starting cache warming...');

  // Run all cache warming operations in parallel for better performance
  await Promise.all([
    warmNotificationsCache(),
    warmBookmarksCache(),
    warmFavoritesCache(),
  ]);

  console.log('[SW] Cache warming completed');
};

// periodic background sync
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

  for (const mediaFile of mediaFiles) {
    await cache.put(
      // TODO: Handle scenarios in which mediaFile.name isn't set,
      // or doesn't include a proper extension.
      mediaFile.name,
      new Response(mediaFile, {
        headers: {
          'content-length': mediaFile.size.toString(),
          'content-type': mediaFile.type,
        },
      })
    );
  }

  return Response.redirect(`/home?name=${mediaFiles[0].name}`, 303);
}

const shareRouteHandler: RouteHandlerCallback = async ({ event }) => {
  return shareTargetHandler({ event: event as FetchEvent });
};

registerRoute('/share', shareRouteHandler, 'POST');

// Only register caching routes in production
if (!IS_DEV) {
  // background sync
  registerRoute(
    ({ request }) => request.url.includes('/boost?id'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request }) => request.url.includes('/reblog?id'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request }) => request.url.includes('/bookmark?id'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request }) => request.url.includes('/status?status'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // avatar photos - explicitly exclude documents to prevent HTML caching
  registerRoute(
    ({ request }) =>
      request.destination !== 'document' &&
      request.url.includes('/accounts/avatars'),
    new CacheFirst({
      cacheName: 'avatar',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    })
  );

  registerRoute(
    ({ request }) =>
      request.destination !== 'document' && request.url.includes('/user?code'),
    new CacheFirst({
      cacheName: 'user',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    })
  );

  // Network first for timeline
  registerRoute(
    ({ request }) => request.url.includes('timelines/home'),
    new NetworkFirst({
      cacheName: 'timeline',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 minutes
          maxAgeSeconds: 60 * 5,
        }),
      ],
    }),
    'GET'
  );

  // Network first for notifications
  registerRoute(
    ({ request }) => request.url.includes('/api/v1/notifications'),
    new NetworkFirst({
      cacheName: 'notifications',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 minutes
          maxAgeSeconds: 60 * 5,
        }),
      ],
    }),
    'GET'
  );

  registerRoute(
    ({ request }) =>
      request.url.includes(
        'https://us-central1-coho-mastodon.cloudfunctions.net/search'
      ),
    new NetworkFirst({
      cacheName: 'search',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 minutes
          maxAgeSeconds: 60 * 5,
        }),
      ],
    }),
    'GET'
  );

  // for bookmarks https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks
  registerRoute(
    ({ request }) =>
      request.url.includes(
        'https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks'
      ),
    new NetworkFirst({
      cacheName: 'bookmarks',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 minutes
          maxAgeSeconds: 60 * 5,
        }),
      ],
    }),
    'GET'
  );

  // for https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites
  registerRoute(
    ({ request }) =>
      request.url.includes(
        'https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites'
      ),
    new NetworkFirst({
      cacheName: 'favorites',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 minutes
          maxAgeSeconds: 60 * 5,
        }),
      ],
    }),
    'GET'
  );

  // cache first for local assets
  registerRoute(
    ({ request }) =>
      request.destination === 'image' && request.url.includes('/assets/icons/'),
    new CacheFirst({
      cacheName: 'images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          // max age is 5 days
          maxAgeSeconds: 60 * 60 * 24 * 5,
        }),
      ],
    }),
    'GET'
  );
}
