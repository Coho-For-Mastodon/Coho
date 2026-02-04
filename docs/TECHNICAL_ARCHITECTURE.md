# Technical Architecture

## Overview

Coho is a fast, offline-first Progressive Web App (PWA) Mastodon client. It is built with **Lit 3** and **Vite**, uses a custom **Navigation API**-based router, and ships with a **custom service worker** for resilient offline behavior. The architecture emphasizes:

- **Offline-first**: optimistic UI updates and background sync for mutations.
- **Performance-first**: lazy loading, workers for heavy work, and minimal main-thread overhead.
- **Design consistency**: in-repo MD3 components and shared tokens.

## Technology Stack

- **Frontend**: Lit 3 (Web Components) + TypeScript
- **Routing**: `nav-router` (Navigation API + polyfills + View Transitions)
- **Build**: Vite (custom plugins for SW build and template minification)
- **Storage**: `localStorage`, IndexedDB via `idb-keyval`, Cache Storage
- **Service Worker**: Custom SW at `src/sw.ts` (no Workbox)
- **Backend**: Firebase Functions (OpenAI integrations + CORS handling)
- **AI/ML (client)**: `@huggingface/transformers` + browser AI APIs (when available)
- **Testing**: Vitest + Playwright
- **Localization**: `@lit/localize`

## Project Structure

```
/
├── src/
│   ├── components/     # Reusable UI components
│   │   └── md/         # Custom Material Design 3 components (preferred)
│   ├── pages/          # Route-level views (lazy-loaded)
│   ├── router/         # nav-router + route definitions
│   ├── services/       # Stateless business logic & API access
│   ├── mastodon/       # Typed Mastodon API client
│   ├── utils/          # Shared utilities and workers
│   ├── styles/         # Shared styles and MD3 tokens
│   ├── controllers/    # App controllers
│   ├── sw.ts           # Service worker source of truth
│   └── app-index.ts    # Application entry point
├── functions/          # Firebase Functions (server-side logic)
└── public/             # Static assets
```

## Core Architectural Patterns

### 1. Routing & Lazy Loading

Routing is handled by `src/router/nav-router.ts` and configured in `src/router/routes.ts`.

- **Navigation API-first**: Uses the native Navigation API when available, with polyfills for older browsers (`@virtualstate/navigation`, `urlpattern-polyfill`).
- **View Transitions**: Integrated into the router for smooth page transitions.
- **Code Splitting**: Routes are lazy-loaded via the `lazy()` plugin so pages only load when visited.

### 2. Authentication & Token Sync

- **Primary storage**: Auth tokens are stored in `localStorage` for synchronous UI access.
- **Service worker access**: On app startup, credentials are synced into IndexedDB so the SW can read them.
- **Centralized auth handling**: `src/utils/api-client.ts` injects auth headers and clears both storages on 401s.

### 3. Service Layer & API Client

- **Stateless services**: `src/services/` modules call the Mastodon client in `src/mastodon/`.
- **Centralized fetch wrapper**: `src/utils/api-client.ts` provides retries, timeouts, and consistent error handling.
- **Optimistic updates**: `src/utils/optimistic-updates.ts` updates UI immediately and relies on SW background sync when offline.

### 4. Service Worker & Offline Support

The service worker is defined in `src/sw.ts` and built via custom Vite plugins in `vite.config.ts`.

- **Versioned caches**: `__APP_VERSION__` is embedded at build time and used to namespace caches.
- **Navigation handling**: Stale-while-revalidate for app shell navigation (fast loads with background refresh).
- **Assets & images**: Cache-first strategies for scripts, styles, and images.
- **API requests**: Network-first for GETs; mutation requests are queued for Background Sync when offline.
- **Share target**: `/share` POST requests are intercepted to support Web Share Target flows.
- **Lifecycle**: Supports `SKIP_WAITING` messages and notifies clients on activation.

### 5. Web Workers & Heavy Tasks

CPU-heavy tasks are offloaded to Web Workers to keep the main thread responsive:

- `src/services/whisper-worker.ts` (audio transcription)
- `src/services/blurhash-worker.ts` (blurhash generation)
- `src/services/image-filter-worker.ts` (image filtering)
- `src/utils/markdown-worker.ts` (markdown parsing)
- `src/utils/img-worker.ts` (image processing)
- `src/utils/timeline-worker.ts` (timeline processing)

### 6. Localization & Theming

- **Localization**: `@lit/localize` with `msg()` for user-facing strings.
- **Theming**: MD3 tokens live in `src/styles/md-tokens.css`, with runtime theme updates in `src/utils/theme-color.ts`.

### 7. Build-Time Performance Optimizations

- **Custom SW builds**: Vite builds the SW separately for dev and production with inlined dependencies.
- **Template minification**: Custom plugins minify Lit `html`` and `css`` templates.
- **SSR login shell**: `scripts/ssr-login.mjs` can pre-render the login view and inject it into `dist/index.html` for faster LCP.

## Data Flow (Typical Request)

1. **User action** in a Lit component.
2. **Service call** in `src/services/` (often using `api-client`).
3. **API request** to the Mastodon instance.
4. **Optimistic UI update** (if applicable).
5. **Persistence** to IndexedDB / Cache Storage.
6. **Background sync** replays queued mutations when online.
