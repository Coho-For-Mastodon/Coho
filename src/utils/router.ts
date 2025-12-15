import { html, type TemplateResult } from 'lit';
import { lazy, type Route, type RouterOptions, Router } from './nav-router.js';

// Re-export lazy and types for convenience
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
 * Check if the Navigation API is available
 */
const hasNavigationAPI =
  typeof window !== 'undefined' && 'navigation' in window;

/**
 * Route configuration shared by both router implementations
 */
const routeConfig: RouterOptions = {
  routes: [
    {
      path: '/',
      title: 'login',
      render: () => html`<app-login></app-login>`,
    },
    {
      path: '/home',
      title: 'home',
      plugins: [lazy(() => import('../pages/app-home.js'))],
      render: () => html`<app-home></app-home>`,
    },
    {
      path: '/search',
      title: 'search',
      plugins: [lazy(() => import('../pages/search-page.js'))],
      render: () => html`<search-page></search-page>`,
    },
    {
      path: '/account',
      title: 'profile',
      plugins: [lazy(() => import('../pages/app-profile.js'))],
      render: () => {
        return html`<app-profile></app-profile>`;
      },
    },
    {
      path: '/followers',
      title: 'followers',
      plugins: [lazy(() => import('../pages/app-followers.js'))],
      render: () => html`<app-followers></app-followers>`,
    },
    {
      path: '/about',
      title: 'about',
      plugins: [lazy(() => import('../pages/app-about/app-about.js'))],
      render: () => html`<app-about></app-about>`,
    },
    {
      path: '/messages',
      title: 'messages',
      plugins: [lazy(() => import('../pages/app-messages.js'))],
      render: () => html`<app-messages></app-messages>`,
    },
    {
      path: '/following',
      title: 'following',
      plugins: [lazy(() => import('../pages/app-following.js'))],
      render: () => html`<app-following></app-following>`,
    },
    {
      path: '/hashtag',
      title: 'hashtags',
      plugins: [lazy(() => import('../pages/app-hashtags.js'))],
      render: () => html`<app-hashtags></app-hashtags>`,
    },
    {
      path: '/home/post',
      title: 'post',
      plugins: [lazy(() => import('../pages/post-detail.js'))],
      render: () => html`<post-detail></post-detail>`,
    },
    {
      path: '/post/:id',
      title: 'post',
      plugins: [lazy(() => import('../pages/post-detail.js'))],
      render: () => html`<post-detail></post-detail>`,
    },
    {
      path: '/editaccount',
      title: 'edit account',
      plugins: [lazy(() => import('../pages/edit-page.js'))],
      render: () => html`<edit-page></edit-page>`,
    },
    {
      path: '/explore',
      title: 'explore',
      plugins: [lazy(() => import('../pages/app-explore.js'))],
      render: () => html`<app-explore></app-explore>`,
    },
    {
      path: '/media',
      title: 'media',
      plugins: [lazy(() => import('../pages/app-media.js'))],
      render: () => html`<app-media></app-media>`,
    },
    {
      path: '/createaccount',
      title: 'create account',
      plugins: [lazy(() => import('../pages/create-account.js'))],
      render: () => html`<create-account></create-account>`,
    },
  ],
};

/**
 * Create the appropriate router based on browser capabilities
 * - Uses Navigation API router for Chrome, Edge, Safari 26.2+
 * - Lazy-loads History API fallback for Firefox and older Safari
 */
async function createRouter(): Promise<IRouter> {
  if (hasNavigationAPI) {
    return new Router(routeConfig);
  } else {
    // Lazy load the history-based fallback for browsers without Navigation API
    console.log(
      '[Router] Navigation API not available, using history fallback'
    );
    const { HistoryRouter } = await import('./history-router.js');
    return new HistoryRouter(routeConfig);
  }
}

// Router instance - initialized lazily
let routerInstance: IRouter | null = null;
let routerPromise: Promise<IRouter> | null = null;

/**
 * Get the router instance, creating it if necessary
 * This ensures the router is only created once and shared across the app
 */
export async function getRouter(): Promise<IRouter> {
  if (routerInstance) {
    return routerInstance;
  }

  if (!routerPromise) {
    routerPromise = createRouter().then((r) => {
      routerInstance = r;
      return r;
    });
  }

  return routerPromise;
}

/**
 * Proxy router that forwards all calls to the actual router instance
 * This allows synchronous imports while the real router loads async
 */
class RouterProxy extends EventTarget implements IRouter {
  private pendingListeners: Array<{ type: string; listener: EventListener }> =
    [];

  async navigate(path: string | URL): Promise<void> {
    const r = await getRouter();
    return r.navigate(path);
  }

  async init(): Promise<void> {
    const r = await getRouter();

    // Forward any pending event listeners
    for (const { type, listener } of this.pendingListeners) {
      r.addEventListener(type, listener);
    }
    this.pendingListeners = [];

    return r.init();
  }

  render(): TemplateResult | null {
    // For synchronous render, we need the router to be initialized
    // This should only be called after init()
    if (!routerInstance) {
      return null;
    }
    return routerInstance.render();
  }

  override addEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null
  ): void {
    if (listener === null) return;

    const eventListener = listener as EventListener;

    if (routerInstance) {
      routerInstance.addEventListener(type, eventListener);
    } else {
      // Queue listener to be added when router is ready
      this.pendingListeners.push({ type, listener: eventListener });
    }
  }

  override removeEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null
  ): void {
    if (listener === null) return;

    const eventListener = listener as EventListener;

    if (routerInstance) {
      routerInstance.removeEventListener(type, eventListener);
    } else {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => l.type !== type || l.listener !== eventListener
      );
    }
  }
}

/**
 * Export a proxy that can be imported synchronously
 * The actual router implementation is loaded based on browser capabilities
 */
export const router: IRouter = new RouterProxy();
