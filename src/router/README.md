# nav-router

A lightweight, framework-agnostic router built on the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) with automatic polyfills for older browsers.

## Features

- 🚀 **Modern** - Built on the Navigation API for native browser navigation
- 🔄 **View Transitions** - Automatic View Transitions API integration for smooth page animations
- 📦 **Lazy Loading** - Built-in plugin for code splitting and lazy route loading
- 🔌 **Plugin System** - Extensible with global and per-route plugins
- 🌐 **SSR Ready** - Safe to use in server-side rendering environments
- 🦾 **TypeScript** - Full TypeScript support with generic state typing
- 📱 **Polyfilled** - Automatic polyfills for browsers without Navigation API support

## Installation

```bash
npm install nav-router
```

### Peer Dependencies

The router has optional peer dependencies for polyfills (only loaded when needed):

```bash
npm install urlpattern-polyfill @virtualstate/navigation
```

## Quick Start

```typescript
import { Router, lazy, type Route } from 'nav-router';
import { html } from 'lit';

// Define your routes
const routes: Route[] = [
  {
    path: '/',
    title: 'Home',
    render: () => html`<home-page></home-page>`,
  },
  {
    path: '/about',
    title: 'About',
    plugins: [lazy(() => import('./pages/about.js'))],
    render: () => html`<about-page></about-page>`,
  },
  {
    path: '/user/:id',
    title: 'User Profile',
    plugins: [lazy(() => import('./pages/user.js'))],
    render: () => html`<user-page></user-page>`,
  },
];

// Create and initialize the router
const router = new Router({ routes });
await router.init();

// Listen for route changes
router.addEventListener('route-changed', (event) => {
  const { route } = event.detail;
  console.log('Navigated to:', route.path);
});
```

## API Reference

### Router

The main router class that extends `EventTarget`.

#### Constructor

```typescript
const router = new Router({
  routes: Route[],
  plugins?: RouterPlugin[]  // Global plugins run on every navigation
});
```

#### Methods

##### `init(): Promise<void>`

Initialize the router. Must be called before first render.

- Loads polyfills if needed (URLPattern, Navigation API)
- Builds route patterns for matching
- Sets up Navigation API event listeners
- Runs plugins for the initial route

```typescript
await router.init();
```

##### `navigate<T>(path: string | URL, options?: { state?: T }): Promise<void>`

Programmatically navigate to a path.

```typescript
// Simple navigation
await router.navigate('/about');

// Navigation with state
await router.navigate('/user/123', {
  state: { user: userData, fromPage: 'home' },
});

// Navigation with URL object
await router.navigate(new URL('/search?q=test', location.origin));
```

##### `getNavigationState<T>(): T | undefined`

Get the current navigation state from the history entry.

```typescript
interface UserPageState {
  user: User;
  scrollPosition?: number;
}

const state = router.getNavigationState<UserPageState>();
if (state?.user) {
  // Use the passed user data immediately
  this.user = state.user;
}
```

##### `render(): TemplateResult | null`

Render the current route's template. Returns `null` if no route matches.

```typescript
// In a Lit component:
render() {
  return html`
    <header>...</header>
    <main>${router.render()}</main>
    <footer>...</footer>
  `;
}
```

##### `getCurrentRoute(): Route | null`

Get the current matched route object.

```typescript
const route = router.getCurrentRoute();
console.log('Current path:', route?.path);
```

#### Events

##### `route-changed`

Dispatched when navigation completes.

```typescript
router.addEventListener('route-changed', (event: CustomEvent) => {
  const { route } = event.detail;
  console.log('Now at:', route.path, 'Title:', route.title);
});
```

### Types

#### Route

```typescript
interface Route {
  /** URL path pattern (supports URLPattern syntax like `/user/:id`) */
  path: string;
  /** Document title to set when this route is active */
  title: string;
  /** Function that returns the template to render */
  render: () => TemplateResult;
  /** Optional plugins to run before this route renders */
  plugins?: RouterPlugin[];
}
```

#### RouterPlugin

```typescript
interface RouterPlugin {
  /** Optional name for debugging */
  name?: string;
  /** Called before navigation completes */
  beforeNavigation?: () => void | Promise<void>;
}
```

#### RouterOptions

```typescript
interface RouterOptions {
  /** Route definitions for the application */
  routes: Route[];
  /** Global plugins that run on every navigation */
  plugins?: RouterPlugin[];
}
```

#### NavigationState

Base type for navigation state. Extend this for your app-specific state:

```typescript
type NavigationState = Record<string, unknown>;

// Your app:
interface MyAppState extends NavigationState {
  user?: User;
  scrollPosition?: number;
}
```

### Plugins

#### `lazy(importFn)`

Built-in plugin for lazy loading route modules.

```typescript
import { lazy } from 'nav-router';

const routes: Route[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    plugins: [lazy(() => import('./pages/dashboard.js'))],
    render: () => html`<dashboard-page></dashboard-page>`,
  },
];
```

#### Custom Plugins

Create custom plugins for authentication, analytics, etc.:

```typescript
const authGuard: RouterPlugin = {
  name: 'auth-guard',
  beforeNavigation: async () => {
    if (!isAuthenticated()) {
      // Redirect or show login
      throw new Error('Not authenticated');
    }
  },
};

const analytics: RouterPlugin = {
  name: 'analytics',
  beforeNavigation: () => {
    trackPageView(window.location.pathname);
  },
};

// Use as global plugin
const router = new Router({
  routes,
  plugins: [analytics],
});

// Or per-route
const routes: Route[] = [
  {
    path: '/admin',
    title: 'Admin',
    plugins: [authGuard, lazy(() => import('./pages/admin.js'))],
    render: () => html`<admin-page></admin-page>`,
  },
];
```

## Polyfill Utilities

The router includes utilities for checking browser support:

```typescript
import {
  hasNavigationAPI,
  hasURLPattern,
  ensurePolyfills,
  isBrowser,
} from 'nav-router/polyfills';

// Check support
console.log('Navigation API:', hasNavigationAPI());
console.log('URLPattern:', hasURLPattern());

// Manually load polyfills (router.init() does this automatically)
await ensurePolyfills();

// Check if in browser (useful for SSR)
if (isBrowser()) {
  // Safe to use browser APIs
}
```

## Integration with Lit

The router works seamlessly with Lit components:

```typescript
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router } from './router.js';

@customElement('my-app')
export class MyApp extends LitElement {
  @state() private _route = router.getCurrentRoute();

  connectedCallback() {
    super.connectedCallback();
    router.addEventListener('route-changed', this._onRouteChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    router.removeEventListener('route-changed', this._onRouteChanged);
  }

  private _onRouteChanged = () => {
    this._route = router.getCurrentRoute();
    this.requestUpdate();
  };

  render() {
    return html`
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <main>${router.render()}</main>
    `;
  }
}
```

## URL Parameters

Access URL parameters using the standard `URLPattern` result:

```typescript
// Route: /user/:id/post/:postId
const url = new URL(window.location.href);
const pattern = new URLPattern({ pathname: '/user/:id/post/:postId' });
const match = pattern.exec(url);

if (match) {
  const { id, postId } = match.pathname.groups;
  console.log('User ID:', id, 'Post ID:', postId);
}
```

## View Transitions

The router automatically uses the View Transitions API when available. Style your transitions with CSS:

```css
/* Fade transition (default) */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Slide transition for specific elements */
.page {
  view-transition-name: page;
}

::view-transition-old(page) {
  animation: slide-out 0.3s ease-out;
}

::view-transition-new(page) {
  animation: slide-in 0.3s ease-out;
}
```

## Browser Support

| Browser | Native Support | With Polyfills |
| ------- | -------------- | -------------- |
| Chrome  | 102+           | ✅             |
| Edge    | 102+           | ✅             |
| Firefox | ❌             | ✅             |
| Safari  | ❌             | ✅             |

## License

MIT
