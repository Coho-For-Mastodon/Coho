import type { TemplateResult } from 'lit';
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
export declare function lazy(importFn: () => Promise<unknown>): RouterPlugin;
/**
 * Lightweight router built on the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export declare class Router extends EventTarget {
  private routes;
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
   * @param path - The path or URL to navigate to
   * @param options - Optional navigation options including state to pass to the destination
   */
  navigate(
    path: string | URL,
    options?: {
      state?: NavigationState;
    }
  ): Promise<void>;
  /**
   * Get the current navigation state from the current history entry.
   * Returns undefined if no state was passed during navigation.
   */
  getNavigationState(): NavigationState | undefined;
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
