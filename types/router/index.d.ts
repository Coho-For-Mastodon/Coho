/**
 * @fileoverview nav-router - A lightweight router built on the Navigation API
 *
 * This module provides a modern, framework-agnostic router with automatic polyfills
 * for older browsers, View Transitions API integration, and a plugin system.
 *
 * @packageDocumentation
 *
 * @example Basic usage
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
 * ```
 */
export {
  Router,
  lazy,
  type Route,
  type RouterOptions,
  type RouterPlugin,
  type NavigationState,
} from './nav-router.js';
export {
  ensurePolyfills,
  hasNavigationAPI,
  hasURLPattern,
  isBrowser,
} from './polyfills.js';
