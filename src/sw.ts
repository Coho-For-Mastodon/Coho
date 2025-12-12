/// <reference lib="webworker" />

import { NetworkOnly, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { get, set } from 'idb-keyval';
import { RouteHandlerCallback } from 'workbox-core';

declare const __APP_VERSION__: string;

// Log build version for debugging
console.log('[SW] Build version:', __APP_VERSION__);

// Type augmentation for Badging API (not yet in all TypeScript libs)
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

// Navigator with Badging API support
const badgingNavigator = navigator as Navigator & Partial<NavigatorBadge>;

// Make idb-keyval available on self for backwards compatibility
self.idbKeyval = { get, set };

// Detect development mode - Vite dev server serves from localhost with HMR
const IS_DEV =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// ============================================================================
// NAVIGATION - RUNTIME CACHING (No Precaching)
// ============================================================================
// Use NetworkFirst for navigation requests - fetches from network when available,
// falls back to cache for offline support. The HTML/JS/CSS gets cached at runtime
// on first visit, enabling offline access without precaching.
if (!IS_DEV) {
  const navigationRoute = new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigation-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    }),
    {
      denylist: [
        // Exclude specific paths if needed (e.g. backend API routes)
        /^\/api\//,
      ],
    }
  );
  registerRoute(navigationRoute);
} else {
  console.log('[SW] Development mode: caching disabled');
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
});

// Clean up old caches when a new service worker activates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // IMPORTANT: Claim clients FIRST before any cleanup
      // This ensures the new SW controls all tabs as quickly as possible
      // to prevent stale content from being served during cache cleanup
      await self.clients.claim();
      console.log('[SW] Claimed all clients');

      // Clean up any old workbox precache entries from previous versions
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old workbox-precache caches (no longer used)
          if (cacheName.includes('workbox-precache')) {
            console.log('[SW] Deleting old precache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );

      console.log('[SW] Activated');

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

// Background sync for offline actions
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

    // show notification
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

  console.log('[SW] Share target received', mediaFiles.length, 'files');

  for (const mediaFile of mediaFiles) {
    // Use a proper URL path as the cache key for reliable matching
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

const shareRouteHandler: RouteHandlerCallback = async ({ event }) => {
  return shareTargetHandler({ event: event as FetchEvent });
};

registerRoute('/share', shareRouteHandler, 'POST');

// Only register caching routes in production
if (!IS_DEV) {
  // ============================================================================
  // BACKGROUND SYNC FOR OFFLINE ACTIONS
  // ============================================================================
  // These routes queue failed requests and replay them when back online

  // Firebase function routes (boost/favorite, reblog, bookmark)
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

  // Firebase function for posting statuses
  registerRoute(
    ({ request }) => request.url.includes('/postStatus'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Firebase function for following users
  registerRoute(
    ({ request }) => request.url.includes('/follow?id'),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API routes - for creating new posts and replies
  // Matches: https://{server}/api/v1/statuses (POST for new status/reply)
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' && url.pathname === '/api/v1/statuses',
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - favorite/unfavorite a post
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/favou?rite$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/unfavou?rite$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - reblog/unreblog a post
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/reblog$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/unreblog$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - bookmark/unbookmark a post
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/bookmark$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/statuses\/\d+\/unbookmark$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - follow/unfollow a user
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/follow$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/unfollow$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - mute/unmute a user
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/mute$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/unmute$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - block/unblock a user
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/block$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' &&
      /\/api\/v1\/accounts\/\d+\/unblock$/.test(url.pathname),
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Direct Mastodon API - report a user
  registerRoute(
    ({ request, url }) =>
      request.method === 'POST' && url.pathname === '/api/v1/reports',
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );

  // Runtime caching for JavaScript files - CacheFirst since they're hashed/versioned
  registerRoute(
    ({ request, url }) =>
      request.destination === 'script' && url.origin === self.location.origin,
    new CacheFirst({
      cacheName: 'js-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // Runtime caching for CSS files - CacheFirst since they're hashed/versioned
  registerRoute(
    ({ request, url }) =>
      request.destination === 'style' && url.origin === self.location.origin,
    new CacheFirst({
      cacheName: 'css-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    })
  );

  // User profile credentials - NetworkFirst to work offline while keeping data fresh
  // This caches /api/v1/accounts/verify_credentials so the app can load user info offline
  registerRoute(
    ({ request, url }) =>
      request.method === 'GET' &&
      url.pathname === '/api/v1/accounts/verify_credentials',
    new NetworkFirst({
      cacheName: 'user-credentials',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 5, // One per logged-in account
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    }),
    'GET'
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

  // header/banner photos for profiles
  registerRoute(
    ({ request }) =>
      request.destination !== 'document' &&
      request.url.includes('/accounts/headers'),
    new CacheFirst({
      cacheName: 'header-images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    })
  );

  // Cache profile images from Mastodon CDNs (files.*, media.*, cdn.*)
  // These URLs may not follow the /accounts/avatars pattern on all instances
  registerRoute(
    ({ request, url }) =>
      request.destination === 'image' &&
      (url.hostname.startsWith('files.') ||
        url.hostname.startsWith('media.') ||
        url.hostname.startsWith('cdn.')),
    new CacheFirst({
      cacheName: 'mastodon-media',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    })
  );

  // Cache post media attachments from /media_attachments/ path
  // This allows viewing previously loaded posts with images while offline
  registerRoute(
    ({ request }) =>
      request.destination === 'image' &&
      request.url.includes('/media_attachments/'),
    new CacheFirst({
      cacheName: 'post-media',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 3, // 3 days (media can be large)
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

  // Network first for hashtag timelines - enables offline viewing of previously visited hashtags
  registerRoute(
    ({ request, url }) =>
      request.method === 'GET' &&
      /\/api\/v1\/timelines\/tag\//.test(url.pathname),
    new NetworkFirst({
      cacheName: 'hashtag-timelines',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20, // Cache up to 20 different hashtag feeds
          maxAgeSeconds: 60 * 60 * 24, // 24 hours - hashtags change less frequently
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
