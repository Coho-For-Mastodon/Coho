import type { TemplateResult } from 'lit';
import { ensurePolyfills, isBrowser } from './router-polyfills.js';
import type { Post } from '../interfaces/Post.js';
import type { Account } from '../mastodon/types/index.js';

/**
 * Navigation state that can be passed during navigation.
 * Use this to pass data (like a Post or Account) to the destination page.
 */
export interface NavigationState {
  post?: Post;
  account?: Account;
}

/**
 * Route plugin interface - called before navigation completes
 */
export interface RouterPlugin {
  name?: string;
  beforeNavigation?: () => void | Promise<void>;
}

/**
 * Route configuration
 */
export interface Route {
  path: string;
  title: string;
  render: () => TemplateResult;
  plugins?: RouterPlugin[];
}

/**
 * Router configuration options
 */
export interface RouterOptions {
  routes: Route[];
}

/**
 * Creates a lazy loading plugin that imports a module before navigation
 */
export function lazy(importFn: () => Promise<unknown>): RouterPlugin {
  return {
    name: 'lazy',
    beforeNavigation: async () => {
      await importFn();
    },
  };
}

/**
 * Lightweight router built on the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export class Router extends EventTarget {
  private routes: Route[];
  private patterns: Map<URLPattern, Route> = new Map();
  private currentRoute: Route | null = null;
  private initialized = false;

  constructor(options: RouterOptions) {
    super();
    this.routes = options.routes;

    // Skip initialization if not in browser (SSR)
    if (!isBrowser()) {
      return;
    }

    // Patterns will be built after polyfills are loaded in init()
  }

  /**
   * Set up Navigation API event listeners
   * Called after polyfills are loaded
   */
  private setupNavigationListeners(): void {
    // Listen for Navigation API navigate events (handles anchor clicks, back/forward, etc.)
    window.navigation.addEventListener('navigate', (event) => {
      // Only handle same-origin navigations
      const url = new URL(event.destination.url);

      if (url.origin !== window.location.origin) {
        return;
      }

      // Don't intercept downloads or form submissions
      if (event.downloadRequest || event.formData) {
        return;
      }

      // Can't intercept this navigation (e.g., cross-origin)
      if (!event.canIntercept) {
        return;
      }

      const route = this.matchRoute(url.pathname);
      if (!route) {
        return; // Let the browser handle unknown routes
      }

      // Check if this is actually a route change or just history state change (e.g., dialog closing)
      const isSameRoute = route.path === this.currentRoute?.path;

      event.intercept({
        focusReset: 'manual',
        scroll: 'manual',
        handler: async () => {
          await this.handleNavigation(route, {
            skipViewTransition: isSameRoute,
          });
        },
      });
    });

    // Handle popstate for back/forward that might not trigger navigate event
    window.addEventListener('popstate', () => {
      const route = this.matchRoute(window.location.pathname);
      if (route && route.path !== this.currentRoute?.path) {
        this.handleNavigation(route);
      }
    });
  }

  /**
   * Match a pathname to a route using URLPattern
   */
  private matchRoute(pathname: string): Route | null {
    for (const [pattern, route] of this.patterns) {
      if (pattern.test({ pathname })) {
        return route;
      }
    }
    return null;
  }

  /**
   * Run plugins and update current route
   */
  private async handleNavigation(
    route: Route,
    options?: { skipViewTransition?: boolean }
  ): Promise<void> {
    // Run route-specific beforeNavigation plugins (e.g., lazy loading)
    if (route.plugins) {
      for (const plugin of route.plugins) {
        if (plugin.beforeNavigation) {
          await plugin.beforeNavigation();
        }
      }
    }

    // Update document title
    if (route.title) {
      document.title = route.title;
    }

    // Update current route and dispatch event wrapped in View Transition
    const updateDOM = () => {
      this.currentRoute = route;
      this.dispatchEvent(
        new CustomEvent('route-changed', { detail: { route } })
      );
    };

    // Skip view transition if requested (e.g., when closing a dialog that pushed history state)
    if (options?.skipViewTransition) {
      updateDOM();
      return;
    }

    if ('startViewTransition' in document) {
      try {
        const transition = (
          document as Document & {
            startViewTransition: (cb: () => void) => {
              ready: Promise<void>;
              finished: Promise<void>;
              updateCallbackDone: Promise<void>;
            };
          }
        ).startViewTransition(updateDOM);

        // Wait for animations to finish
        await transition.finished;
      } catch (e) {
        // If transition fails, just update DOM normally
        console.warn('View transition failed:', e);
        updateDOM();
      }
    } else {
      updateDOM();
    }
  }

  /**
   * Programmatically navigate to a path
   * @param path - The path or URL to navigate to
   * @param options - Optional navigation options including state to pass to the destination
   */
  async navigate(
    path: string | URL,
    options?: { state?: NavigationState }
  ): Promise<void> {
    const url =
      typeof path === 'string' ? new URL(path, window.location.origin) : path;

    // Use Navigation API with View Transitions
    // Pass state to the history entry so it's available via navigation.currentEntry.getState()
    await window.navigation.navigate(url.href, {
      history: 'push',
      info: { viewTransition: true },
      state: options?.state,
    }).finished;
  }

  /**
   * Get the current navigation state from the current history entry.
   * Returns undefined if no state was passed during navigation.
   */
  getNavigationState(): NavigationState | undefined {
    return window.navigation?.currentEntry?.getState() as
      | NavigationState
      | undefined;
  }

  /**
   * Initialize the router - must be called before first render
   * Loads polyfills if needed, builds patterns, and runs plugins for initial route
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Skip initialization if not in browser (SSR)
    if (!isBrowser()) {
      return;
    }

    // Load polyfills if needed (URLPattern, Navigation API)
    await ensurePolyfills();

    // Build URLPattern matchers for each route (after polyfill is loaded)
    for (const route of this.routes) {
      const pattern = new URLPattern({ pathname: route.path });
      this.patterns.set(pattern, route);
    }

    // Set initial route
    this.currentRoute = this.matchRoute(window.location.pathname);

    // Set up Navigation API listeners
    this.setupNavigationListeners();

    this.initialized = true;

    // Run plugins for initial route
    if (this.currentRoute) {
      await this.handleNavigation(this.currentRoute);
    }
  }

  /**
   * Render the current route's template
   */
  render(): TemplateResult | null {
    if (!this.currentRoute) {
      return null;
    }
    return this.currentRoute.render();
  }
}
