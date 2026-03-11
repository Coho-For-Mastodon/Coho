import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getSyncQueue,
  saveSyncQueue,
  queueRequest,
  replayQueuedRequests,
  networkWithBackgroundSync,
  type BackgroundSyncConfig,
} from '../../src/sw/background-sync';
import type { QueuedRequest } from '../../src/sw/types';

// ============================================================================
// Test helpers
// ============================================================================

function createMockConfig(
  initialQueue: QueuedRequest[] = []
): BackgroundSyncConfig {
  let storedQueue = [...initialQueue];
  return {
    get: vi.fn(async () => storedQueue),
    set: vi.fn(async (_key: string, value: unknown) => {
      storedQueue = value as QueuedRequest[];
    }),
    syncTag: 'test-sync',
    queueKey: 'test-queue',
    registration: {
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
        getTags: vi.fn().mockResolvedValue([]),
      },
    } as unknown as BackgroundSyncConfig['registration'],
  };
}

function makeQueuedRequest(
  overrides: Partial<QueuedRequest> = {}
): QueuedRequest {
  return {
    id: 'test-1',
    url: 'https://example.com/api/v1/statuses',
    method: 'POST',
    headers: { Authorization: 'Bearer token123' },
    body: '{"status": "hello"}',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('background-sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ==========================================================================
  // getSyncQueue / saveSyncQueue
  // ==========================================================================

  describe('getSyncQueue', () => {
    it('returns empty array when no queue stored', async () => {
      const config = {
        get: vi.fn().mockResolvedValue(undefined),
        queueKey: 'q',
      };
      const result = await getSyncQueue(config);
      expect(result).toEqual([]);
    });

    it('returns stored queue', async () => {
      const items = [makeQueuedRequest()];
      const config = { get: vi.fn().mockResolvedValue(items), queueKey: 'q' };
      const result = await getSyncQueue(config);
      expect(result).toEqual(items);
    });
  });

  describe('saveSyncQueue', () => {
    it('saves queue to IndexedDB', async () => {
      const config = {
        set: vi.fn().mockResolvedValue(undefined),
        queueKey: 'q',
      };
      const items = [makeQueuedRequest()];
      await saveSyncQueue(config, items);
      expect(config.set).toHaveBeenCalledWith('q', items);
    });
  });

  // ==========================================================================
  // queueRequest
  // ==========================================================================

  describe('queueRequest', () => {
    it('serializes and enqueues a request', async () => {
      const config = createMockConfig();
      const request = new Request('https://example.com/api/v1/statuses', {
        method: 'POST',
        body: '{"status": "hello"}',
        headers: { 'Content-Type': 'application/json' },
      });

      await queueRequest(config, request);

      expect(config.set).toHaveBeenCalled();
      const savedQueue = (config.set as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as QueuedRequest[];
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].url).toBe('https://example.com/api/v1/statuses');
      expect(savedQueue[0].method).toBe('POST');
      expect(savedQueue[0].body).toBe('{"status": "hello"}');
    });

    it('registers for background sync', async () => {
      const config = createMockConfig();
      const request = new Request('https://example.com/api/v1/statuses', {
        method: 'POST',
        body: 'test',
      });

      await queueRequest(config, request);

      expect(config.registration.sync.register).toHaveBeenCalledWith(
        'test-sync'
      );
    });
  });

  // ==========================================================================
  // replayQueuedRequests
  // ==========================================================================

  describe('replayQueuedRequests', () => {
    it('does nothing when queue is empty', async () => {
      const config = createMockConfig();
      await replayQueuedRequests(config);
      // set is called once with an empty array (no change)
      expect(config.get).toHaveBeenCalled();
    });

    it('replays and clears successful requests', async () => {
      const items = [makeQueuedRequest()];
      const config = createMockConfig(items);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      );

      await replayQueuedRequests(config);

      // Queue should be saved as empty (all succeeded)
      expect(config.set).toHaveBeenCalledWith('test-queue', []);
    });

    it('re-queues requests on 5xx errors', async () => {
      const items = [makeQueuedRequest({ id: 'fail-1' })];
      const config = createMockConfig(items);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('Server Error', { status: 500 }))
      );

      await replayQueuedRequests(config);

      const savedQueue = (config.set as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as QueuedRequest[];
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].id).toBe('fail-1');
    });

    it('discards requests on 4xx errors', async () => {
      const items = [makeQueuedRequest()];
      const config = createMockConfig(items);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }))
      );

      await replayQueuedRequests(config);

      // 4xx should NOT be re-queued
      expect(config.set).toHaveBeenCalledWith('test-queue', []);
    });

    it('re-queues on network error', async () => {
      const items = [makeQueuedRequest({ id: 'net-fail' })];
      const config = createMockConfig(items);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      );

      await replayQueuedRequests(config);

      const savedQueue = (config.set as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as QueuedRequest[];
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].id).toBe('net-fail');
    });

    it('refreshes the Authorization header when refreshAuthHeader is provided', async () => {
      const items = [
        makeQueuedRequest({ headers: { Authorization: 'Bearer stale-token' } }),
      ];
      const config = createMockConfig(items);

      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      await replayQueuedRequests(config, {
        refreshAuthHeader: async () => 'Bearer fresh-token',
      });

      const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect((calledInit.headers as Record<string, string>).Authorization).toBe(
        'Bearer fresh-token'
      );
    });

    it('does not overwrite Authorization when refreshAuthHeader returns null', async () => {
      const items = [
        makeQueuedRequest({ headers: { Authorization: 'Bearer original' } }),
      ];
      const config = createMockConfig(items);

      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response('ok', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      await replayQueuedRequests(config, {
        refreshAuthHeader: async () => null,
      });

      const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect((calledInit.headers as Record<string, string>).Authorization).toBe(
        'Bearer original'
      );
    });
  });

  // ==========================================================================
  // networkWithBackgroundSync
  // ==========================================================================

  describe('networkWithBackgroundSync', () => {
    it('returns network response on success', async () => {
      const config = createMockConfig();
      const networkResponse = new Response('ok', { status: 200 });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(networkResponse));

      const request = new Request('https://example.com/api/v1/statuses', {
        method: 'POST',
      });
      const result = await networkWithBackgroundSync(config, request);

      expect(result.status).toBe(200);
    });

    it('returns 202 and queues request on network failure', async () => {
      const config = createMockConfig();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('offline'))
      );

      const request = new Request('https://example.com/api/v1/statuses', {
        method: 'POST',
        body: 'test',
      });
      const result = await networkWithBackgroundSync(config, request);

      expect(result.status).toBe(202);
      const body = await result.json();
      expect(body.queued).toBe(true);
    });
  });
});
