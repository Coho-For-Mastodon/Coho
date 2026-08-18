import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const workerInstances: Array<{
    onmessage: ((event: MessageEvent<string>) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  }> = [];

  class MarkdownWorker {
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    postMessage = vi.fn(() => {
      this.onmessage?.({ data: 'ok' } as MessageEvent<string>);
    });
    terminate = vi.fn();

    constructor() {
      workerInstances.push(this);
    }
  }

  return {
    publishPost: vi.fn(),
    publishPollPost: vi.fn(),
    replyToPost: vi.fn(),
    editPost: vi.fn(),
    showInfoToast: vi.fn(),
    perfMark: vi.fn(),
    perfMeasure: vi.fn(),
    hapticConfirm: vi.fn(),
    hapticReject: vi.fn(),
    MarkdownWorker: vi.fn(MarkdownWorker),
    workerInstances,
  };
});

vi.mock('../../src/services/posts', () => ({
  publishPost: hoisted.publishPost,
  publishPollPost: hoisted.publishPollPost,
  replyToPost: hoisted.replyToPost,
  editPost: hoisted.editPost,
}));

vi.mock('../../src/utils/optimistic-updates', () => ({
  showInfoToast: hoisted.showInfoToast,
}));

vi.mock('../../src/utils/perf-observer', () => ({
  perfMark: hoisted.perfMark,
  perfMeasure: hoisted.perfMeasure,
}));

vi.mock('../../src/utils/haptics', () => ({
  hapticConfirm: hoisted.hapticConfirm,
  hapticReject: hoisted.hapticReject,
}));

vi.mock('../../src/utils/markdown-worker?worker', () => ({
  default: hoisted.MarkdownWorker,
}));

import {
  PostComposerPublishOrchestrator,
  type PublishOrchestratorState,
} from '../../src/components/post-composer/publish-orchestrator';

function flushPromises() {
  return Promise.resolve().then(() => Promise.resolve());
}

function createState(
  overrides: Partial<PublishOrchestratorState> = {}
): PublishOrchestratorState {
  return {
    autoPublish: true,
    attachments: [],
    visibility: 'public',
    sensitive: false,
    spoilerText: '',
    scheduleEnabled: false,
    compact: false,
    pollEnabled: false,
    replyToId: null,
    quotedStatusId: null,
    editingPostId: null,
    isPublishing: false,
    publishSuccess: false,
    ...overrides,
  };
}

function createHost(initialState: Partial<PublishOrchestratorState> = {}) {
  let state = createState(initialState);
  const resetComposer = vi.fn();
  const dispatchSubmit = vi.fn();
  const dispatchPublished = vi.fn();
  let status = 'hello world';
  let pollPayload = null;
  let scheduledAt: string | null = null;

  return {
    orchestrator: new PostComposerPublishOrchestrator({
      getState: () => state,
      setState: (patch) => {
        state = { ...state, ...patch };
      },
      getStatus: () => status,
      getPollPayload: () => pollPayload,
      resolveScheduledAtForSubmission: () => scheduledAt,
      resetComposer,
      dispatchSubmit,
      dispatchPublished,
    }),
    getState: () => state,
    resetComposer,
    dispatchSubmit,
    dispatchPublished,
    setStatus: (value: string) => {
      status = value;
    },
    setPollPayload: (
      value: { options: string[]; expiresIn: number; multiple: boolean } | null
    ) => {
      pollPayload = value;
    },
    setScheduledAt: (value: string | null) => {
      scheduledAt = value;
    },
  };
}

describe('PostComposerPublishOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hoisted.publishPost.mockReset();
    hoisted.publishPollPost.mockReset();
    hoisted.replyToPost.mockReset();
    hoisted.editPost.mockReset();
    hoisted.showInfoToast.mockReset();
    hoisted.perfMark.mockReset();
    hoisted.perfMeasure.mockReset();
    hoisted.hapticConfirm.mockReset();
    hoisted.hapticReject.mockReset();
    hoisted.MarkdownWorker.mockClear();
    hoisted.workerInstances.length = 0;
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('dispatches submit payload when autoPublish is disabled', async () => {
    const host = createHost({
      autoPublish: false,
      attachments: [{ id: 'media-1', preview_url: 'x', description: null }],
      sensitive: true,
      spoilerText: 'cw',
      replyToId: 'reply-1',
      quotedStatusId: 'quote-1',
      pollEnabled: true,
    });

    host.setScheduledAt('2026-05-09T09:30:00.000Z');
    host.setPollPayload({
      options: ['A', 'B'],
      expiresIn: 3600,
      multiple: true,
    });

    await host.orchestrator.submit();

    expect(host.dispatchSubmit).toHaveBeenCalledWith({
      status: 'hello world',
      attachments: [{ id: 'media-1', preview_url: 'x', description: null }],
      visibility: 'public',
      sensitive: true,
      spoilerText: 'cw',
      poll: { options: ['A', 'B'], expiresIn: 3600, multiple: true },
      scheduledAt: '2026-05-09T09:30:00.000Z',
      replyToId: 'reply-1',
      quotedStatusId: 'quote-1',
    });
  });

  it('blocks submit while attachments are still pending', async () => {
    const host = createHost({
      attachments: [
        {
          id: 'temp-1',
          preview_url: 'blob:temp-1',
          description: null,
          pending: true,
        },
      ],
    });

    await host.orchestrator.submit();

    expect(hoisted.showInfoToast).toHaveBeenCalled();
    expect(hoisted.MarkdownWorker).not.toHaveBeenCalled();
    expect(host.dispatchSubmit).not.toHaveBeenCalled();
  });

  it('publishes a standard post and dispatches the published event after the success delay', async () => {
    hoisted.publishPost.mockResolvedValue({ id: 'post-1' });
    const host = createHost();

    await host.orchestrator.submit();
    await flushPromises();
    await vi.dynamicImportSettled();

    expect(hoisted.publishPost).toHaveBeenCalledWith(
      'hello world',
      undefined,
      false,
      '',
      'public',
      undefined,
      undefined,
      undefined
    );
    expect(host.getState().isPublishing).toBe(false);
    expect(host.getState().publishSuccess).toBe(true);
    expect(hoisted.hapticConfirm).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(host.resetComposer).toHaveBeenCalled();
    expect(host.dispatchPublished).toHaveBeenCalledWith({
      status: 'hello world',
      scheduledAt: null,
      edited: false,
    });
    expect(host.getState().publishSuccess).toBe(false);
  });

  it('triggers hapticReject when publishing fails while online', async () => {
    hoisted.publishPost.mockRejectedValue(new Error('Network error'));
    const host = createHost();

    await host.orchestrator.submit();
    await flushPromises();
    await vi.dynamicImportSettled();

    expect(hoisted.hapticReject).toHaveBeenCalled();
    expect(host.getState().isPublishing).toBe(false);
    expect(host.getState().publishSuccess).toBe(false);
  });

  it('blocks scheduled publishing while offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const host = createHost({ scheduleEnabled: true });
    host.setScheduledAt('2026-05-09T09:30:00.000Z');

    await host.orchestrator.submit();

    expect(hoisted.showInfoToast).toHaveBeenCalledWith(expect.anything());
    expect(hoisted.MarkdownWorker).not.toHaveBeenCalled();
    expect(hoisted.publishPost).not.toHaveBeenCalled();
  });
});
