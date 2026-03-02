import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  safeCachePut,
  warnCacheSkip,
  networkFirst,
  cacheFirst,
  navigationHandler,
} from '../../src/sw/strategies';

// ============================================================================
// Mocks
// ============================================================================

// Mock the cache-policy module
vi.mock('../../src/sw/cache-policy', () => ({
  evaluateCacheResponse: vi.fn((_req: unknown, _res: Response) => ({
    shouldCache: true,
  })),
}));

import { evaluateCacheResponse } from '../../src/sw/cache-policy';
const mockEvaluate = vi.mocked(evaluateCacheResponse);

/** Create a minimal mock Cache */
function createMockCache(matchResult?: Response) {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(matchResult ?? null),
    addAll: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue([]),
    matchAll: vi.fn().mockResolvedValue([]),
  } satisfies Record<keyof Cache, unknown>;
}

/** Stub globalThis.caches.open to return our mock */
function stubCachesOpen(mockCache: ReturnType<typeof createMockCache>) {
  vi.stubGlobal('caches', {
    open: vi.fn().mockResolvedValue(mockCache),
    has: vi.fn().mockResolvedValue(false),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(null),
  });
}

/** Create a basic Request-like object */
function makeRequest(url: string, opts?: { destination?: string }): Request {
  const req = new Request(url);
  if (opts?.destination) {
    Object.defineProperty(req, 'destination', {
      value: opts.destination,
      writable: false,
    });
  }
  return req;
}

describe('strategies', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEvaluate.mockReturnValue({ shouldCache: true });
  });

  // ==========================================================================
  // safeCachePut
  // ==========================================================================

  describe('safeCachePut', () => {
    it('puts a response into cache', async () => {
      const cache = createMockCache();
      const response = new Response('ok');
      await safeCachePut(cache as unknown as Cache, '/foo', response);
      expect(cache.put).toHaveBeenCalledWith('/foo', response);
    });

    it('catches errors from broken body streams', async () => {
      const cache = createMockCache();
      cache.put.mockRejectedValueOnce(new Error('NetworkError'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await safeCachePut(cache as unknown as Cache, '/foo', new Response('ok'));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('cache.put() failed'),
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // warnCacheSkip
  // ==========================================================================

  describe('warnCacheSkip', () => {
    it('warns for script requests', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('https://example.com/app.js', {
        destination: 'script',
      });
      warnCacheSkip(req, 'MIME mismatch');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CACHE_GUARD'),
        'MIME mismatch',
        req.url
      );
    });

    it('does not warn for image requests', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const req = makeRequest('https://example.com/pic.png', {
        destination: 'image',
      });
      warnCacheSkip(req, 'some reason');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // networkFirst
  // ==========================================================================

  describe('networkFirst', () => {
    it('returns network response and caches it', async () => {
      const mockCache = createMockCache();
      stubCachesOpen(mockCache);

      const networkResponse = new Response('fresh data', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(networkResponse));

      const req = makeRequest('https://example.com/api/data');
      const result = await networkFirst(req, 'test-cache');

      expect(result).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('falls back to cache when network fails', async () => {
      const cachedResponse = new Response('cached data', { status: 200 });
      const mockCache = createMockCache(cachedResponse);
      stubCachesOpen(mockCache);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      );

      const req = makeRequest('https://example.com/api/data');
      const result = await networkFirst(req, 'test-cache');

      expect(result).toBe(cachedResponse);
    });

    it('throws when network fails and no cache', async () => {
      const mockCache = createMockCache(); // match returns null
      stubCachesOpen(mockCache);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      );

      const req = makeRequest('https://example.com/api/data');
      await expect(networkFirst(req, 'test-cache')).rejects.toThrow(
        'Failed to fetch'
      );
    });

    it('skips caching when evaluateCacheResponse says no', async () => {
      const mockCache = createMockCache();
      stubCachesOpen(mockCache);
      mockEvaluate.mockReturnValue({
        shouldCache: false,
        reason: 'MIME mismatch',
      });

      const networkResponse = new Response('<!doctype html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(networkResponse));

      const req = makeRequest('https://example.com/app.js', {
        destination: 'script',
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await networkFirst(req, 'test-cache');

      expect(result).toBe(networkResponse);
      expect(mockCache.put).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // cacheFirst
  // ==========================================================================

  describe('cacheFirst', () => {
    it('returns cached response when available', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const cachedResponse = new Response('cached', { status: 200 });
      const mockCache = createMockCache(cachedResponse);
      stubCachesOpen(mockCache);

      const req = makeRequest('https://example.com/app.js');
      const result = await cacheFirst(req, 'test-cache');

      expect(result).toBe(cachedResponse);
      // Should not have fetched from network
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches from network and caches when not in cache', async () => {
      const mockCache = createMockCache(); // match returns null
      stubCachesOpen(mockCache);

      const networkResponse = new Response('fresh', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(networkResponse));

      const req = makeRequest('https://example.com/app.js');
      const result = await cacheFirst(req, 'test-cache');

      expect(result).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // navigationHandler
  // ==========================================================================

  describe('navigationHandler', () => {
    it('returns network response for app shell', async () => {
      const mockCache = createMockCache();
      stubCachesOpen(mockCache);

      const networkResponse = new Response('<!doctype html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(networkResponse));

      const req = makeRequest('https://example.com/some/path');
      const result = await navigationHandler(req, 'pages-v1');

      expect(result).toBe(networkResponse);
      // Should cache the app shell
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('falls back to cached index.html when offline', async () => {
      const cachedIndex = new Response('cached html', { status: 200 });
      const mockCache = createMockCache(cachedIndex);
      stubCachesOpen(mockCache);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('offline'))
      );

      const req = makeRequest('https://example.com/some/path');
      const result = await navigationHandler(req, 'pages-v1');

      expect(result).toBe(cachedIndex);
    });

    it('returns 503 when completely offline with no cache', async () => {
      const mockCache = createMockCache(); // match returns null
      stubCachesOpen(mockCache);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('offline'))
      );

      const req = makeRequest('https://example.com/some/path');
      const result = await navigationHandler(req, 'pages-v1');

      expect(result.status).toBe(503);
    });
  });
});
