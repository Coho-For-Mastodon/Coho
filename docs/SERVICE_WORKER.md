# Service Worker Architecture

Coho uses a custom service worker for PWA functionality, offline resilience, and background work. This document describes the build, registration, caching strategies, and key features.

## File Structure

```
src/sw.ts              ← Source of truth (TypeScript)
vite.config.ts         ← Build plugins (dev-service-worker, build-sw)
public/sw.js           ← Dev build output (gitignored)
dist/sw.js             ← Production build output
index.html             ← Registration script
```

## Build Process

The service worker is built separately from the main app using custom Vite plugins in `vite.config.ts`.

### Development (`dev-service-worker` plugin)

- **Trigger**: `buildStart` when Vite dev server starts (`apply: 'serve'`)
- **Output**: `public/sw.js`
- **Format**: ES module, unminified
- **Version**: Injects `__APP_VERSION__` with an ISO timestamp

### Production (`build-sw` plugin)

- **Trigger**: `closeBundle` after the main build completes (`apply: 'build'`)
- **Output**: `dist/sw.js`
- **Format**: ES module, minified with Terser
- **Optimizations**: Inlines all imports (required for SW scope)

Both builds inject `__APP_VERSION__`, which is used to version cache names.

## Registration

The service worker is registered in `index.html` after a 15s delay to prioritize initial page load:

```javascript
const swUrl = '/sw.js';
const swOptions = { scope: '/', type: 'module' };

navigator.serviceWorker.register(swUrl, swOptions);
```

### Update Handling

- **`controllerchange`**: forces a page reload when a new SW takes control.
- **`SW_ACTIVATED` message**: forces a reload when activation completes.
- **`pwa-update-available` event**: dispatched with `updateServiceWorker()` to call `SKIP_WAITING`.

## Caching Strategy

| Content Type        | Strategy                        | Cache Name          |
| ------------------- | ------------------------------- | ------------------- |
| Navigation requests | Stale-while-revalidate app shell | `pages-{VERSION}`   |
| Scripts & styles    | Cache-first                      | `assets-{VERSION}`  |
| Images              | Cache-first                      | `images-{VERSION}`  |
| API GET requests    | Network-first                    | `pages-{VERSION}`   |
| Mutations           | Network with background sync     | —                   |

### Precached Resources

On install, the SW precaches:

- `/`
- `/index.html`
- `/manifest.json`

## Offline & Background Sync

### Mutation Queue

For Mastodon API mutations and other non-GET API requests, the SW attempts a network request. If it fails due to a network error, the request is queued and replayed later.

- **Sync tag**: `mastodon-api-sync`
- **Queue key**: `background-sync-queue` (IndexedDB via `idb-keyval`)

Queued requests are stored as:

```typescript
interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}
```

### Replay Behavior

- 2xx responses: removed from queue
- 4xx responses: removed from queue (won't succeed on retry)
- 5xx responses: kept for retry
- Network error: kept for retry

### Supported Mutation Endpoints

The following Mastodon API endpoints are queued when offline:

| Action                      | Endpoint Pattern                          |
| --------------------------- | ----------------------------------------- |
| Create post                 | `POST /api/v1/statuses`                   |
| Edit/delete post            | `PUT/DELETE /api/v1/statuses/:id`         |
| Favorite/unfavorite         | `POST /api/v1/statuses/:id/(un)favourite` |
| Boost/unboost               | `POST /api/v1/statuses/:id/(un)reblog`    |
| Bookmark/unbookmark         | `POST /api/v1/statuses/:id/(un)bookmark`  |
| Pin/unpin                   | `POST /api/v1/statuses/:id/(un)pin`       |
| Follow/unfollow             | `POST /api/v1/accounts/:id/(un)follow`    |
| Block/unblock               | `POST /api/v1/accounts/:id/(un)block`     |
| Mute/unmute                 | `POST /api/v1/accounts/:id/(un)mute`      |
| Vote in poll                | `POST /api/v1/polls/:id/votes`            |
| Clear/dismiss notifications | `POST /api/v1/notifications/...`          |

## Share Target

`/share` POST requests are intercepted to support the Web Share Target flow.

- Shared files are cached in `shareTarget` cache storage.
- The user is redirected to `/home` with query parameters referencing cached files.

## Notifications & Widgets

### Push Notifications

- Handles Mastodon push payloads, strips HTML, and shows rich notifications.
- Uses the Badging API when available.
- Notification actions include “Follow back” for follow events.

### Notification Clicks

- Clears badge counts.
- Focuses or opens a window to the relevant route.
- Supports follow-back action by fetching the notification and issuing a follow request.

### Windows Widgets

- Responds to `widgetinstall` and updates widget templates via `self.widgets`.

### Periodic Sync

Uses `periodicsync` to keep content fresh:

- `get-notifications` → fetches notifications and triggers badges/notifications
- `timeline-sync` → refreshes timeline cache in IndexedDB

## Authentication

The service worker cannot access `localStorage`, so credentials are synced to IndexedDB by the app:

```typescript
const accessToken = await get('accessToken');
const server = await get('server');
```

`app-index.ts` performs the sync on startup.

## Cache Cleanup

Old caches are deleted on activation, excluding the share-target cache:

```typescript
if (!Object.values(CACHE_NAMES).includes(cacheName) && cacheName !== 'shareTarget') {
  return caches.delete(cacheName);
}
```

## Debugging

### Check SW Status

```javascript
navigator.serviceWorker.controller;
navigator.serviceWorker.ready;
```

### View Caches

DevTools → Application → Cache Storage

### Force Update

DevTools → Application → Service Workers → “Update on reload”

### Version Check

The SW logs its version on load:

```
[SW] Build version: 2026-02-04T18:32:00.000Z
```

## Why Not Workbox?

Coho uses a custom SW for:

- Full control over caching, lifecycle, and background sync
- Smaller runtime footprint
- Custom features like share target handling and Mastodon-specific notifications
- Easier debugging without extra abstraction layers
