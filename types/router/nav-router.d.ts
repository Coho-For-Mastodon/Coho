import type { TemplateResult } from 'lit';
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
export declare function lazy(importFn: () => Promise<unknown>): RouterPlugin;
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
export declare class Router extends EventTarget {
  private routes;
  private globalPlugins;
  private patterns;
  private currentRoute;
  private initialized;
  /**
   * Create a new Router instance.
   *
   * @param options - Router configuration including routes and optional global plugins
   */
  constructor(options: RouterOptions);
  /**
   * Set up Navigation API event listeners
   * Called after polyfills are loaded
   */
  private setupNavigationListeners;
  /**
   * Match a pathname to a route using URLPattern
   */
  private matchRoute;
  /**
   * Run plugins and update current route.
   * Executes global plugins first, then route-specific plugins.
   */
  private handleNavigation;
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
  navigate<T extends NavigationState = NavigationState>(
    path: string | URL,
    options?: {
      state?: T;
    }
  ): Promise<void>;
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
    | undefined;
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
  init(): Promise<void>;
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
  render(): TemplateResult | null;
  /**
   * Get the current matched route.
   *
   * @returns The current Route object or null if no route is matched
   */
  getCurrentRoute(): Route | null;
}
