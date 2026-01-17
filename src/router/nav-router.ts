import type { TemplateResult } from 'lit';

let polyfillsLoaded = false;

function hasNavigationAPI(): boolean {
  return typeof window !== 'undefined' && 'navigation' in window;
}

function hasURLPattern(): boolean {
  return typeof URLPattern !== 'undefined';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function ensurePolyfills(): Promise<void> {
  if (polyfillsLoaded) return;

  const loadPromises: Promise<unknown>[] = [];

  if (!hasURLPattern()) {
    loadPromises.push(import('urlpattern-polyfill'));
  }

  if (!hasNavigationAPI()) {
    loadPromises.push(import('@virtualstate/navigation/polyfill'));
  }

  if (loadPromises.length > 0) {
    await Promise.all(loadPromises);
  }

  polyfillsLoaded = true;
}

/**
 * Base navigation state type - extend this for app-specific state.
 *
 * @example
 * ```typescript
 * // Define your app's navigation state
 * interface MyAppState {
 *   user?: User;
 *   data?: SomeData;
 * }
 *
 * // Pass state during navigation
 * router.navigate('/user/123', { state: { user: myUser } });
 *
 * // Retrieve state in your component
 * const state = router.getNavigationState<MyAppState>();
 * ```
 */
export type NavigationState = Record<string, unknown>;

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
  /** Route definitions for the application */
  routes: Route[];
  /** Global plugins that run on every navigation */
  plugins?: RouterPlugin[];
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
 * Lightweight router built on the Navigation API.
 *
 * A modern, framework-agnostic router that leverages the Navigation API
 * for seamless SPA navigation with automatic polyfills for older browsers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 *
 * @example
 * ```typescript
 * import { Router, lazy, type Route } from 'nav-router';
 * import { html } from 'lit';
 *
 * const routes: Route[] = [
 *   { path: '/', title: 'Home', render: () => html`<home-page></home-page>` },
 *   {
 *     path: '/about',
 *     title: 'About',
 *     plugins: [lazy(() => import('./pages/about.js'))],
 *     render: () => html`<about-page></about-page>`
 *   }
 * ];
 *
 * const router = new Router({ routes });
 * await router.init();
 *
 * // Listen for route changes
 * router.addEventListener('route-changed', (e) => {
 *   console.log('Navigated to:', e.detail.route.path);
 * });
 * ```
 *
 * @fires route-changed - Dispatched when navigation completes with `{ detail: { route: Route } }`
 */
export class Router extends EventTarget {
  private routes: Route[];
  private globalPlugins: RouterPlugin[];
  private patterns: Map<URLPattern, Route> = new Map();
  private currentRoute: Route | null = null;
  private initialized = false;

  /**
   * Create a new Router instance.
   *
   * @param options - Router configuration including routes and optional global plugins
   */
  constructor(options: RouterOptions) {
    super();
    this.routes = options.routes;
    this.globalPlugins = options.plugins || [];
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
   * Run plugins and update current route.
   * Executes global plugins first, then route-specific plugins.
   */
  private async handleNavigation(
    route: Route,
    options?: { skipViewTransition?: boolean }
  ): Promise<void> {
    // Run global beforeNavigation plugins first
    for (const plugin of this.globalPlugins) {
      if (plugin.beforeNavigation) {
        await plugin.beforeNavigation();
      }
    }

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
   * Programmatically navigate to a path.
   *
   * @param path - The path or URL to navigate to
   * @param options - Optional navigation options including state to pass to the destination
   *
   * @example
   * ```typescript
   * // Simple navigation
   * await router.navigate('/about');
   *
   * // Navigation with state
   * await router.navigate('/user/123', {
   *   state: { user: userData, fromPage: 'home' }
   * });
   *
   * // Navigation with URL object
   * await router.navigate(new URL('/search?q=test', location.origin));
   * ```
   */
  async navigate<T extends NavigationState = NavigationState>(
    path: string | URL,
    options?: { state?: T }
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
   *
   * @typeParam T - The expected state type (defaults to NavigationState)
   * @returns The navigation state or undefined
   *
   * @example
   * ```typescript
   * interface UserPageState {
   *   user: User;
   *   scrollPosition?: number;
   * }
   *
   * // In your page component:
   * const state = router.getNavigationState<UserPageState>();
   * if (state?.user) {
   *   // Use the passed user data immediately
   *   this.user = state.user;
   * } else {
   *   // Fallback to fetching
   *   this.user = await fetchUser(this.userId);
   * }
   * ```
   */
  getNavigationState<T extends NavigationState = NavigationState>():
    | T
    | undefined {
    return window.navigation?.currentEntry?.getState() as T | undefined;
  }

  /**
   * Initialize the router - must be called before first render.
   *
   * This method:
   * - Loads polyfills if needed (URLPattern, Navigation API)
   * - Builds route patterns for matching
   * - Sets up Navigation API event listeners
   * - Runs plugins for the initial route
   *
   * @example
   * ```typescript
   * const router = new Router({ routes });
   *
   * // Must initialize before using
   * await router.init();
   *
   * // Now safe to render and navigate
   * document.body.innerHTML = router.render();
   * ```
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
   * Render the current route's template.
   *
   * @returns The TemplateResult from the current route's render function,
   *          or null if no route matches.
   *
   * @example
   * ```typescript
   * // In a Lit component:
   * render() {
   *   return html`
   *     <header>...</header>
   *     <main>${router.render()}</main>
   *     <footer>...</footer>
   *   `;
   * }
   * ```
   */
  render(): TemplateResult | null {
    if (!this.currentRoute) {
      return null;
    }
    return this.currentRoute.render();
  }
}
