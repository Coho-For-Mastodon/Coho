# Technical Architecture

## Overview

Coho is a high-performance Progressive Web App (PWA) client for Mastodon, built with modern web standards. It leverages **Lit** for lightweight web components, **Vite** for tooling, and **Firebase Functions** for backend capabilities. The application is designed with an "Offline First" mindset, utilizing **Workbox** and **IndexedDB** to ensure a robust experience even with unstable network connections.

## Technology Stack

- **Frontend Framework**: [Lit 3.x](https://lit.dev/) (Web Components)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **State/Storage**: `idb-keyval` (IndexedDB wrapper), LocalStorage
- **Service Worker**: Workbox (Runtime caching, Background Sync)
- **Backend**: Firebase Functions (Node.js)
- **Testing**: Playwright

## Project Structure

The project follows a feature-based and layered architecture:

```
/
├── src/
│   ├── components/     # Reusable UI components (dumb & smart)
│   │   └── md/         # Custom Material Design 3 implementation
│   ├── pages/          # Top-level route views (lazy-loaded)
│   ├── services/       # Stateless business logic & API interaction
│   ├── mastodon/       # Typed Mastodon API client library
│   ├── utils/          # Shared utilities (Router, etc.)
│   ├── sw.ts           # Service Worker entry point
│   └── app-index.ts    # Application entry point
├── functions/          # Firebase Functions (Server-side logic)
└── public/             # Static assets
```

## Core Architectural Patterns

### 1. Routing & Lazy Loading

Routing is handled by a custom router implementation in `src/utils/router.ts`.

- **Hybrid Strategy**: It attempts to use the modern **Navigation API** for smoother transitions and state handling. If unavailable, it gracefully falls back to a History API implementation (`history-router.ts`).
- **Code Splitting**: All route components (pages) are lazy-loaded using dynamic `import()` statements. This ensures the initial bundle size remains small (`app-home.js`, `app-profile.js`, etc., are only loaded when needed).

### 2. Authentication & Dual Token Storage

To support both the main thread (UI) and the Service Worker (background tasks), authentication tokens are managed carefully:

- **Primary Storage**: Tokens are initially stored in `localStorage` for immediate synchronous access by the UI.
- **Synchronization**: On app startup (`app-index.ts`), credentials are synced to **IndexedDB** using `idb-keyval`.
- **Service Worker Access**: The Service Worker cannot access `localStorage`. It reads the synced tokens from IndexedDB to perform authenticated background fetches or push notification handling.

### 3. Service Layer

The `src/services/` directory contains stateless modules that handle data fetching and business logic.

- **Statelessness**: Services generally do not hold state. They fetch fresh credentials (via `localStorage`) for every request to ensure validity.
- **Mastodon Client**: The app includes a strongly-typed Mastodon API client in `src/mastodon/` which services use to communicate with instances.
- **Workers**: Heavy computations (like BlurHash generation or image filtering) are offloaded to Web Workers (`blurhash-worker.ts`, `image-filter-worker.ts`) to keep the main thread responsive.

### 4. Service Worker & Offline Support

The Service Worker (`src/sw.ts`) is a critical part of the architecture, built separately by Vite.

- **Runtime Caching**: We use a `NetworkFirst` strategy for navigation requests. This allows the app to load the latest version if online, but fall back to a cached version if offline.
- **Build Process**: The SW is built as a self-contained bundle with all dependencies inlined (see `vite.config.ts`).

### 5. Backend (Firebase Functions)

Located in `functions/`, this layer handles tasks that require secret management or server-side processing, such as:

- **AI Integration**: Proxies requests to OpenAI for features like image generation or text analysis, keeping API keys secure.
- **CORS Handling**: Manages cross-origin requests for the PWA.

## Data Flow

1.  **User Interaction**: User triggers an action in a Lit component.
2.  **Service Call**: Component calls a function in `src/services/`.
3.  **API Request**: Service uses `src/mastodon/` to fetch data from the user's Mastodon instance.
4.  **Reactivity**: Data is returned to the component, which updates its `@state` properties, triggering a re-render.
5.  **Persistence**: Critical data (settings, drafts) is saved to IndexedDB via `idb-keyval`.
