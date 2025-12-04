/// <reference lib="webworker" />

import { NetworkOnly, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { precacheAndRoute } from 'workbox-precaching';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import * as navigationPreload from 'workbox-navigation-preload';
import { get, set } from 'idb-keyval';

// Type augmentation for Service Worker
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
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

// Make idb-keyval available on self for backwards compatibility
self.idbKeyval = { get, set };

// Detect development mode - Vite dev server serves from localhost with HMR
const IS_DEV =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

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

// Enable navigation preload for supporting browsers (production only)
if (!IS_DEV) {
  navigationPreload.enable();
}

// Navigation route - use NetworkOnly in dev to avoid caching
const navigationRoute = new NavigationRoute(
  IS_DEV
    ? new NetworkOnly()
    : new NetworkFirst({
        cacheName: 'navigations',
      })
);

registerRoute(navigationRoute);

addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'WARM_CACHE') {
    // Warm cache on app boot if network conditions are good
    (event as any).waitUntil(warmCache());
  }
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
      (navigator as any).setAppBadge(data.length);
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
    (navigator as any).clearAppBadge();
  }

  const notificationData = event.notification.data;

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
        await self.clients.openWindow('/home?tab=notifications');
      })()
    );
    return;
  }

  event.waitUntil(self.clients.openWindow('/home?tab=notifications'));
});

self.addEventListener('push', async (event: PushEvent) => {
  // Mastodon sends a single notification payload, not an array
  const payload = event.data?.json() as MastodonPushPayload;

  // show badge
  if ('setAppBadge' in navigator) {
    (navigator as any).setAppBadge(1);
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

    const response = await fetch(`https://${server}/api/v1/notifications`, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    });

    if (response.ok) {
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

    const response = await fetch(
      `https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks?code=${accessToken}&server=${server}`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
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

    const response = await fetch(
      `https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites?code=${accessToken}&server=${server}`,
      {
        method: 'GET',
      }
    );

    if (response.ok) {
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
  const periodicSyncEvent = event as any; // PeriodicSyncEvent not yet in TypeScript lib

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

registerRoute('/share', shareTargetHandler as any, 'POST');

// Only register caching routes in production
if (!IS_DEV) {
  // register a route for /
  registerRoute(
    'index.html',
    new NetworkFirst({
      cacheName: 'root',
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

  // avatar photos
  registerRoute(
    ({ request }) => request.url.includes('/accounts/avatars'),
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
    ({ request }) => request.url.includes('/user?code'),
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

// Only precache in production - in dev, manifest is empty/undefined
if (!IS_DEV) {
  const manifest = self.__WB_MANIFEST;
  if (manifest) {
    precacheAndRoute(manifest);
  }
} else if (IS_DEV) {
  console.log('[SW] Development mode: caching disabled');
}
