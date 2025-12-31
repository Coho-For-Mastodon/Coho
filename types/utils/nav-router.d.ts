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
export declare function lazy(importFn: () => Promise<unknown>): RouterPlugin;
/**
 * Lightweight router built on the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export declare class Router extends EventTarget {
  private routes;
  private globalPlugins;
  private patterns;
  private currentRoute;
  private initialized;
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
   * Run plugins and update current route
   */
  private handleNavigation;
  /**
   * Programmatically navigate to a path
   */
  navigate(path: string | URL): Promise<void>;
  /**
   * Initialize the router - must be called before first render
   * Loads polyfills if needed, builds patterns, and runs plugins for initial route
   */
  init(): Promise<void>;
  /**
   * Render the current route's template
   */
  render(): TemplateResult | null;
}
