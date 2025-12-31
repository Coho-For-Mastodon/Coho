import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Router, lazy, type Route } from '../../src/utils/nav-router';

// Mock polyfills module
vi.mock('../../src/utils/router-polyfills.js', () => ({
  ensurePolyfills: vi.fn().mockResolvedValue(undefined),
  isBrowser: vi.fn().mockReturnValue(true),
}));

describe('Router', () => {
  let router: Router;
  let originalPathname: string;

  const createTestRoutes = (): Route[] => [
    {
      path: '/',
      title: 'Home',
      render: () =>
        ({ _$litType$: 1, strings: ['<div>Home</div>'], values: [] }) as never,
    },
    {
      path: '/about',
      title: 'About',
      render: () =>
        ({ _$litType$: 1, strings: ['<div>About</div>'], values: [] }) as never,
    },
    {
      path: '/user/:id',
      title: 'User Profile',
      render: () =>
        ({ _$litType$: 1, strings: ['<div>User</div>'], values: [] }) as never,
    },
    {
      path: '/post/:id/comment/:commentId',
      title: 'Comment',
      render: () =>
        ({
          _$litType$: 1,
          strings: ['<div>Comment</div>'],
          values: [],
        }) as never,
    },
  ];

  // Helper to change URL in browser mode using history API
  const navigateToPath = (path: string) => {
    history.pushState({}, '', path);
  };

  beforeEach(() => {
    // Save original pathname
    originalPathname = window.location.pathname;
    // Reset to root
    history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original pathname
    history.pushState({}, '', originalPathname);
  });

  describe('constructor', () => {
    it('should create a router with routes', () => {
      router = new Router({ routes: createTestRoutes() });
      expect(router).toBeInstanceOf(Router);
    });

    it('should accept global plugins', () => {
      const globalPlugin = {
        name: 'global',
        beforeNavigation: vi.fn(),
      };
      router = new Router({
        routes: createTestRoutes(),
        plugins: [globalPlugin],
      });
      expect(router).toBeInstanceOf(Router);
    });
  });

  describe('init', () => {
    it('should initialize the router and set up listeners', async () => {
      router = new Router({ routes: createTestRoutes() });
      const addEventListenerSpy = vi.spyOn(
        window.navigation,
        'addEventListener'
      );
      await router.init();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'navigate',
        expect.any(Function)
      );
      addEventListenerSpy.mockRestore();
    });

    it('should only initialize once', async () => {
      router = new Router({ routes: createTestRoutes() });
      const addEventListenerSpy = vi.spyOn(
        window.navigation,
        'addEventListener'
      );
      await router.init();
      await router.init();

      // addEventListener should only be called once
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      addEventListenerSpy.mockRestore();
    });

    it('should set initial route based on current pathname', async () => {
      navigateToPath('/about');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const template = router.render();
      expect(template).toBeDefined();
    });

    it('should dispatch route-changed event on init', async () => {
      router = new Router({ routes: createTestRoutes() });
      const routeChangedHandler = vi.fn();
      router.addEventListener('route-changed', routeChangedHandler);

      await router.init();

      expect(routeChangedHandler).toHaveBeenCalled();
    });
  });

  describe('route matching', () => {
    it('should match static routes', async () => {
      navigateToPath('/about');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const template = router.render();
      expect(template).toBeDefined();
    });

    it('should match routes with single parameter', async () => {
      navigateToPath('/user/123');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const template = router.render();
      expect(template).toBeDefined();
    });

    it('should match routes with multiple parameters', async () => {
      navigateToPath('/post/456/comment/789');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const template = router.render();
      expect(template).toBeDefined();
    });

    it('should return null for unmatched routes', async () => {
      navigateToPath('/nonexistent');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const template = router.render();
      expect(template).toBeNull();
    });
  });

  describe('navigate', () => {
    beforeEach(async () => {
      router = new Router({ routes: createTestRoutes() });
      await router.init();
    });

    it('should call Navigation API navigate', async () => {
      const navigateSpy = vi.spyOn(window.navigation, 'navigate');
      await router.navigate('/about');

      expect(navigateSpy).toHaveBeenCalledWith(
        expect.stringContaining('/about'),
        expect.objectContaining({ history: 'push' })
      );
      navigateSpy.mockRestore();
    });

    it('should handle URL objects', async () => {
      const navigateSpy = vi.spyOn(window.navigation, 'navigate');
      const url = new URL('/about', window.location.origin);
      await router.navigate(url);

      expect(navigateSpy).toHaveBeenCalledWith(
        expect.stringContaining('/about'),
        expect.any(Object)
      );
      navigateSpy.mockRestore();
    });

    it('should handle array input (bug fix)', async () => {
      const navigateSpy = vi.spyOn(window.navigation, 'navigate');
      // This tests the existing bug workaround
      await router.navigate(['/about'] as unknown as string);

      expect(navigateSpy).toHaveBeenCalledWith(
        expect.stringContaining('/about'),
        expect.any(Object)
      );
      navigateSpy.mockRestore();
    });
  });

  describe('render', () => {
    it('should return null when no route matches', async () => {
      navigateToPath('/unknown-route');

      router = new Router({ routes: createTestRoutes() });
      await router.init();

      expect(router.render()).toBeNull();
    });

    it('should return template result when route matches', async () => {
      router = new Router({ routes: createTestRoutes() });
      await router.init();

      const result = router.render();
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });

  describe('plugins', () => {
    it('should run route-specific beforeNavigation plugins', async () => {
      const beforeNavigation = vi.fn();
      const routes: Route[] = [
        {
          path: '/',
          title: 'Home',
          plugins: [{ beforeNavigation }],
          render: () =>
            ({
              _$litType$: 1,
              strings: ['<div>Home</div>'],
              values: [],
            }) as never,
        },
      ];

      router = new Router({ routes });
      await router.init();

      expect(beforeNavigation).toHaveBeenCalled();
    });

    it('should run route-specific afterNavigation plugins', async () => {
      const afterNavigation = vi.fn();
      const routes: Route[] = [
        {
          path: '/',
          title: 'Home',
          plugins: [{ afterNavigation }],
          render: () =>
            ({
              _$litType$: 1,
              strings: ['<div>Home</div>'],
              values: [],
            }) as never,
        },
      ];

      router = new Router({ routes });
      await router.init();

      expect(afterNavigation).toHaveBeenCalled();
    });

    it('should run global plugins before route plugins', async () => {
      const callOrder: string[] = [];
      const globalPlugin = {
        beforeNavigation: vi.fn(() => {
          callOrder.push('global');
        }),
      };
      const routePlugin = {
        beforeNavigation: vi.fn(() => {
          callOrder.push('route');
        }),
      };

      const routes: Route[] = [
        {
          path: '/',
          title: 'Home',
          plugins: [routePlugin],
          render: () =>
            ({
              _$litType$: 1,
              strings: ['<div>Home</div>'],
              values: [],
            }) as never,
        },
      ];

      router = new Router({ routes, plugins: [globalPlugin] });
      await router.init();

      expect(callOrder).toEqual(['global', 'route']);
    });
  });

  describe('document title', () => {
    it('should update document title on navigation', async () => {
      router = new Router({ routes: createTestRoutes() });
      await router.init();

      expect(document.title).toBe('Home');
    });
  });

  describe('EventTarget', () => {
    it('should extend EventTarget', () => {
      router = new Router({ routes: createTestRoutes() });
      expect(router).toBeInstanceOf(EventTarget);
    });

    it('should dispatch route-changed events', async () => {
      router = new Router({ routes: createTestRoutes() });
      const handler = vi.fn();
      router.addEventListener('route-changed', handler);

      await router.init();

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.route).toBeDefined();
      expect(event.detail.route.path).toBe('/');
    });
  });
});

describe('lazy plugin', () => {
  it('should create a plugin with beforeNavigation', () => {
    const importFn = vi.fn().mockResolvedValue({});
    const plugin = lazy(importFn);

    expect(plugin.name).toBe('lazy');
    expect(plugin.beforeNavigation).toBeDefined();
  });

  it('should call import function on beforeNavigation', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} });
    const plugin = lazy(importFn);

    await plugin.beforeNavigation!();

    expect(importFn).toHaveBeenCalled();
  });

  it('should wait for import to complete', async () => {
    let resolved = false;
    const importFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve({});
          }, 10);
        })
    );

    const plugin = lazy(importFn);
    await plugin.beforeNavigation!();

    expect(resolved).toBe(true);
  });
});
