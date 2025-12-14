import type { TemplateResult } from 'lit';
import type { RouterOptions } from './nav-router.js';
/**
 * History-based fallback router for browsers without Navigation API support
 * (Firefox, older Safari versions)
 */
export declare class HistoryRouter extends EventTarget {
  private routes;
  private globalPlugins;
  private patterns;
  private currentRoute;
  private initialized;
  constructor(options: RouterOptions);
  /**
   * Handle click events on anchor elements for SPA navigation
   */
  private handleLinkClick;
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
   * Loads plugins for the initial route
   */
  init(): Promise<void>;
  /**
   * Render the current route's template
   */
  render(): TemplateResult | null;
}
