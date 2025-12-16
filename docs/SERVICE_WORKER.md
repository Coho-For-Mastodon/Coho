# Service Worker Architecture

Coho uses a custom service worker implementation for PWA functionality. This document explains the setup, build process, and key features.

## File Structure

```
src/sw.ts              ← Source of truth (TypeScript)
vite.config.ts         ← Build plugins (build-sw-dev, build-sw)
public/sw.js           ← Dev build output (gitignored)
dist/sw.js             ← Production build output
index.html             ← Registration script
```

## Build Process

The service worker is built separately from the main app bundle using custom Vite plugins defined in `vite.config.ts`:

### Development (`build-sw-dev` plugin)

- **Trigger**: Runs on `configureServer` hook when dev server starts
- **Output**: `public/sw.js`
- **Format**: ES module, unminified for debugging
- **Version**: Injects `__APP_VERSION__` with ISO timestamp

### Production (`build-sw` plugin)

- **Trigger**: Runs on `writeBundle` hook after main build
- **Output**: `dist/sw.js`
- **Format**: ES module, minified with Terser
- **Optimizations**: Inlines all dynamic imports (critical for SW scope)

Both builds share a `CACHE_VERSION` constant for cache busting.

## Registration

The service worker is registered in `index.html`:

```javascript
const swUrl = '/sw.js';
const swOptions = { scope: '/', type: 'module' };
navigator.serviceWorker.register(swUrl, swOptions);
```

### Update Handling

- Listens for `controllerchange` → triggers page reload
- Listens for `SW_ACTIVATED` message → triggers reload
- Dispatches `pwa-update-available` custom event for UI notification

## Caching Strategies

| Content Type        | Strategy                    | Cache Name         |
| ------------------- | --------------------------- | ------------------ |
| Navigation requests | Network-first, SPA fallback | `pages-{VERSION}`  |
| Scripts & styles    | Cache-first                 | `assets-{VERSION}` |
| Images              | Cache-first (lazy)          | `images-{VERSION}` |
| API GET requests    | Network-first               | `pages-{VERSION}`  |
| API mutations       | Network-only                | —                  |

### Precached Resources

On install, the SW precaches:

- `/` (app shell)
- `/index.html`
- `/manifest.json`

## Features

### Push Notifications

Full Mastodon notification support with:

- Rich notification display (mentions, favorites, boosts, follows, polls)
- Notification actions (reply, favorite, boost)
- Badge count management via Badging API
- Click-to-navigate to relevant content

### Share Target

PWA share target handling:

- Caches shared media files temporarily
- Redirects to compose page with shared content
- Supports text, URLs, and media attachments

### Background Sync

Periodic background sync for:

- Timeline updates
- Notification polling
- Widget data refresh (Windows widgets)

### Offline Support

- Serves cached pages when offline
- Falls back to `/index.html` for SPA routes
- Queues failed mutations to IndexedDB for retry via Background Sync API

## Background Sync for Mutations

When a Mastodon API mutation (POST/PUT/DELETE) fails due to network error, the service worker:

1. **Queues the request** to IndexedDB with full request details (URL, method, headers, body)
2. **Registers for background sync** using the `sync` event API
3. **Returns a 202 Accepted** response so UI can update optimistically
4. **Replays queued requests** when connectivity is restored

### Supported Mutations

The following Mastodon API endpoints are queued for background sync:

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

### Queue Storage

Queued requests are stored in IndexedDB under the key `background-sync-queue` using `idb-keyval`. Each entry contains:

```typescript
interface QueuedRequest {
  id: string; // Unique ID for deduplication
  url: string; // Full request URL
  method: string; // HTTP method
  headers: Record<string, string>;
  body: string | null; // Serialized body
  timestamp: number; // When queued
}
```

### Replay Behavior

- 2xx responses: Request succeeded, removed from queue
- 4xx responses: Client error, removed from queue (won't succeed on retry)
- 5xx responses: Server error, kept in queue for retry
- Network error: Kept in queue for retry

## Authentication

The service worker accesses auth tokens from **IndexedDB** (not localStorage):

```typescript
import { get } from 'idb-keyval';

const accessToken = await get('accessToken');
const server = await get('server');
```

> **Important**: Auth tokens must be synced to IndexedDB. This happens in `app-index.ts` via `syncCredentialsToIndexedDB()`. The frontend uses localStorage, but the SW cannot access localStorage.

## Debugging

### Check SW Status

```javascript
// In browser console
navigator.serviceWorker.controller; // Active SW
navigator.serviceWorker.ready; // Promise for ready SW
```

### View Caches

DevTools → Application → Cache Storage

### Force Update

DevTools → Application → Service Workers → "Update on reload"

### Version Check

The SW logs its version on load:

```
[SW] Build version: 2025-12-15T22:30:00.000Z
```

## Cache Cleanup

Old caches are automatically deleted on activation:

```typescript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !Object.values(CACHE_NAMES).includes(key))
            .map((key) => caches.delete(key))
        )
      )
  );
});
```

## Why Not Workbox?

Coho uses a custom implementation instead of Workbox for:

1. **Full control** over caching strategies and SW lifecycle
2. **Smaller bundle** — no Workbox runtime overhead
3. **Custom features** — share target, widgets, Mastodon-specific push handling
4. **Simpler debugging** — straightforward code without abstraction layers

The tradeoff is more manual code, but it's well-suited for Coho's specific PWA requirements.
