import type { TemplateResult } from 'lit';

/**
 * Route plugin interface - called during navigation lifecycle
 */
export interface RouterPlugin {
  name?: string;
  beforeNavigation?: () => void | Promise<void>;
  afterNavigation?: () => void | Promise<void>;
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
 * Lightweight router built on the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export class Router extends EventTarget {
  private routes: Route[];
  private globalPlugins: RouterPlugin[];
  private patterns: Map<URLPattern, Route> = new Map();
  private currentRoute: Route | null = null;
  private initialized = false;

  constructor(options: RouterOptions) {
    super();
    this.routes = options.routes;
    this.globalPlugins = options.plugins || [];

    // Build URLPattern matchers for each route
    for (const route of this.routes) {
      const pattern = new URLPattern({ pathname: route.path });
      this.patterns.set(pattern, route);
    }

    // Set initial route (plugins run lazily on first render)
    this.currentRoute = this.matchRoute(window.location.pathname);

    // Listen for Navigation API navigate events (handles anchor clicks, back/forward, etc.)
    window.navigation.addEventListener('navigate', (event) => {
      // Only handle same-origin navigations
      const url = new URL(event.destination.url);
      const isBackNavigation =
        event.navigationType === 'traverse' &&
        event.destination.index < (window.navigation.currentEntry?.index ?? 0);

      console.log(
        '[Router] navigate event:',
        url.pathname,
        'type:',
        event.navigationType,
        'isBack:',
        isBackNavigation
      );

      if (url.origin !== window.location.origin) {
        console.log('[Router] Skipping: cross-origin');
        return;
      }

      // Don't intercept downloads or form submissions
      if (event.downloadRequest || event.formData) {
        console.log('[Router] Skipping: download or form');
        return;
      }

      // Can't intercept this navigation (e.g., cross-origin)
      if (!event.canIntercept) {
        console.log('[Router] Skipping: canIntercept is false');
        return;
      }

      const route = this.matchRoute(url.pathname);
      if (!route) {
        console.log('[Router] Skipping: no matching route');
        return; // Let the browser handle unknown routes
      }

      console.log('[Router] Intercepting navigation to:', route.path);
      event.intercept({
        focusReset: 'manual',
        scroll: 'manual',
        handler: async () => {
          await this.handleNavigation(route, isBackNavigation);
        },
      });
    });

    // Handle popstate for back/forward that might not trigger navigate event
    window.addEventListener('popstate', () => {
      const route = this.matchRoute(window.location.pathname);
      if (route && route.path !== this.currentRoute?.path) {
        this.handleNavigation(route, true); // Assume back for popstate
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
    isBack: boolean = false
  ): Promise<void> {
    // Run global beforeNavigation plugins
    for (const plugin of this.globalPlugins) {
      if (plugin.beforeNavigation) {
        await plugin.beforeNavigation();
      }
    }

    // Run route-specific beforeNavigation plugins
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

    // Skip view transition for /home (has fixed elements that flash)
    const skipTransition = false;

    if ('startViewTransition' in document && !skipTransition) {
      try {
        // Add class to document for back navigation animation direction
        if (isBack) {
          document.documentElement.classList.add('back-navigation');
        }

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

        // Clean up class
        document.documentElement.classList.remove('back-navigation');
      } catch (e) {
        // If transition fails, just update DOM normally
        console.warn('View transition failed:', e);
        document.documentElement.classList.remove('back-navigation');
        updateDOM();
      }
    } else {
      updateDOM();
    }

    // Run global afterNavigation plugins
    for (const plugin of this.globalPlugins) {
      if (plugin.afterNavigation) {
        await plugin.afterNavigation();
      }
    }

    // Run route-specific afterNavigation plugins
    if (route.plugins) {
      for (const plugin of route.plugins) {
        if (plugin.afterNavigation) {
          await plugin.afterNavigation();
        }
      }
    }
  }

  /**
   * Programmatically navigate to a path
   */
  async navigate(path: string | URL): Promise<void> {
    // Handle array passed by mistake (fixes existing bug in codebase)
    if (Array.isArray(path)) {
      path = path[0];
    }

    const url =
      typeof path === 'string' ? new URL(path, window.location.origin) : path;

    // Use Navigation API with View Transitions
    await window.navigation.navigate(url.href, {
      history: 'push',
      info: { viewTransition: true },
    }).finished;
  }

  /**
   * Initialize the router - must be called before first render
   * Loads plugins for the initial route
   */
  async init(): Promise<void> {
    if (this.initialized || !this.currentRoute) {
      return;
    }
    this.initialized = true;
    await this.handleNavigation(this.currentRoute);
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
