import type { TemplateResult } from 'lit';
import type { Route, RouterPlugin, RouterOptions } from './nav-router.js';

/**
 * History-based fallback router for browsers without Navigation API support
 * (Firefox, older Safari versions)
 */
export class HistoryRouter extends EventTarget {
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

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      const route = this.matchRoute(window.location.pathname);
      if (route) {
        this.handleNavigation(route, false);
      }
    });

    // Intercept link clicks for SPA navigation
    document.addEventListener('click', (event) => {
      this.handleLinkClick(event);
    });
  }

  /**
   * Handle click events on anchor elements for SPA navigation
   */
  private handleLinkClick(event: MouseEvent): void {
    // Only handle left clicks without modifiers
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // Find the anchor element
    const anchor = (event.target as Element).closest('a');
    if (!anchor) {
      return;
    }

    // Only handle same-origin links
    const href = anchor.getAttribute('href');
    if (!href) {
      return;
    }

    // Skip external links, downloads, and special protocols
    if (
      anchor.target === '_blank' ||
      anchor.hasAttribute('download') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      return;
    }

    try {
      const url = new URL(href, window.location.origin);

      // Skip external origins
      if (url.origin !== window.location.origin) {
        return;
      }

      const route = this.matchRoute(url.pathname);
      if (!route) {
        return; // Let the browser handle unknown routes
      }

      // Prevent default navigation and handle internally
      event.preventDefault();

      // Update URL and handle navigation
      window.history.pushState({}, '', url.href);
      this.handleNavigation(route, true);
    } catch {
      // Invalid URL, let browser handle it
      return;
    }
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
    _isPush: boolean
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
    const skipTransition = route.path === '/home';

    if ('startViewTransition' in document && !skipTransition) {
      const transition = (
        document as Document & {
          startViewTransition: (cb: () => void) => {
            finished: Promise<void>;
          };
        }
      ).startViewTransition(updateDOM);

      await transition.finished;
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

    const route = this.matchRoute(url.pathname);
    if (!route) {
      // For unknown routes, do a full navigation
      window.location.href = url.href;
      return;
    }

    // Push to history and handle navigation
    window.history.pushState({}, '', url.href);
    await this.handleNavigation(route, true);
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
    await this.handleNavigation(this.currentRoute, false);
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
