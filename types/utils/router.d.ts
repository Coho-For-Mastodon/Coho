import { type TemplateResult } from 'lit';
import { lazy, type Route, type RouterOptions } from './nav-router.js';
export { lazy };
export type { Route, RouterOptions };
/**
 * Router interface that both Navigation API and History API routers implement
 */
interface IRouter extends EventTarget {
  navigate(path: string | URL): Promise<void>;
  init(): Promise<void>;
  render(): TemplateResult | null;
}
/**
 * Get the router instance, creating it if necessary
 * This ensures the router is only created once and shared across the app
 */
export declare function getRouter(): Promise<IRouter>;
/**
 * Export a proxy that can be imported synchronously
 * The actual router implementation is loaded based on browser capabilities
 */
export declare const router: IRouter;
