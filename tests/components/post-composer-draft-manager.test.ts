import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  listDraftsForContext: vi.fn(),
  saveDraftForContext: vi.fn(),
  showInfoToast: vi.fn(),
}));

vi.mock('../../src/services/drafts', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/services/drafts')
  >('../../src/services/drafts');

  return {
    ...actual,
    listDraftsForContext: hoisted.listDraftsForContext,
    saveDraftForContext: hoisted.saveDraftForContext,
  };
});

vi.mock('../../src/utils/optimistic-updates', () => ({
  showInfoToast: hoisted.showInfoToast,
}));

import {
  PostComposerDraftManager,
  type DraftManagerState,
} from '../../src/components/post-composer/draft-manager';

function createState(
  overrides: Partial<DraftManagerState> = {}
): DraftManagerState {
  return {
    statusText: '',
    visibility: 'public',
    sensitive: false,
    spoilerText: '',
    pollEnabled: false,
    pollOptions: ['', ''],
    pollDurationSeconds: 60 * 60,
    pollMultiple: false,
    pollError: null,
    scheduleEnabled: false,
    scheduleDate: '',
    scheduleTime: '',
    scheduleError: null,
    attachments: [],
    draftStatus: 'idle',
    availableDrafts: [],
    draftPickerOpen: false,
    selectedDraftId: '',
    draftDirty: false,
    draftLoaded: false,
    draftKey: null,
    lastSavedStatusText: '',
    compact: false,
    replyToId: null,
    ...overrides,
  };
}

function createHost(initialState: Partial<DraftManagerState> = {}) {
  let state = createState(initialState);
  const clearAttachments = vi.fn(() => {
    state = { ...state, attachments: [] };
  });
  const restorePendingAttachment = vi.fn(
    (file: File, description: string | null) => {
      state = {
        ...state,
        attachments: [
          ...state.attachments,
          {
            id: `restored-${state.attachments.length + 1}`,
            preview_url: `blob:${file.name}`,
            description,
            pending: true,
            file,
          },
        ],
      };
    }
  );
  const dispatchDraftSaved = vi.fn();

  return {
    manager: new PostComposerDraftManager({
      getState: () => state,
      setState: (patch) => {
        state = { ...state, ...patch };
      },
      syncComposerValue: async (value) => {
        state = { ...state, statusText: value };
      },
      clearAttachments,
      restorePendingAttachment,
      dispatchDraftSaved,
    }),
    getState: () => state,
    clearAttachments,
    restorePendingAttachment,
    dispatchDraftSaved,
  };
}

describe('PostComposerDraftManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    hoisted.listDraftsForContext.mockReset();
    hoisted.saveDraftForContext.mockReset();
    hoisted.showInfoToast.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('loads drafts for the active reply context', async () => {
    localStorage.setItem('server', 'tech.lgbt');
    localStorage.setItem('currentUserID', 'user-123');
    hoisted.listDraftsForContext.mockResolvedValue([
      {
        id: 'draft-1',
        status: 'hello world',
        visibility: 'public',
        sensitive: false,
        spoilerText: '',
        poll: null,
        schedule: null,
        replyToId: 'reply-1',
        attachments: [],
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    ]);

    const host = createHost({ replyToId: 'reply-1' });

    await host.manager.loadDraftForContext();

    expect(host.getState().draftKey).toBe(
      'draft:tech.lgbt:user-123:reply:reply-1'
    );
    expect(hoisted.listDraftsForContext).toHaveBeenCalledWith(
      'draft:tech.lgbt:user-123:reply:reply-1'
    );
    expect(host.getState().availableDrafts).toHaveLength(1);
    expect(host.getState().selectedDraftId).toBe('draft-1');
  });

  it('applies draft fields and restores pending attachments', async () => {
    const host = createHost();
    const pendingBlob = new Blob(['pending'], { type: 'image/png' });

    await host.manager.applyDraft({
      id: 'draft-2',
      status: 'restored draft',
      visibility: 'private',
      sensitive: true,
      spoilerText: 'cw',
      poll: {
        options: ['A', 'B'],
        expiresIn: 7200,
        multiple: true,
      },
      schedule: { date: '2026-05-09', time: '09:30' },
      replyToId: null,
      attachments: [
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: 'existing',
          pending: false,
        },
        {
          id: 'temp-1',
          preview_url: '',
          description: 'pending upload',
          pending: true,
          file: pendingBlob,
        },
      ],
      updatedAt: '2026-05-08T00:00:00.000Z',
    });

    expect(host.clearAttachments).toHaveBeenCalled();
    expect(host.restorePendingAttachment).toHaveBeenCalledTimes(1);
    expect(host.restorePendingAttachment.mock.calls[0][0]).toBeInstanceOf(File);
    expect(host.restorePendingAttachment.mock.calls[0][0].type).toBe(
      'image/png'
    );
    expect(host.getState().statusText).toBe('restored draft');
    expect(host.getState().visibility).toBe('private');
    expect(host.getState().sensitive).toBe(true);
    expect(host.getState().scheduleEnabled).toBe(true);
    expect(host.getState().attachments).toHaveLength(2);
    expect(host.getState().draftStatus).toBe('saved');
    expect(host.getState().draftDirty).toBe(false);
    expect(host.getState().lastSavedStatusText).toBe('restored draft');
    expect(host.getState().draftLoaded).toBe(true);

    await vi.advanceTimersByTimeAsync(650);
    expect(host.getState().draftLoaded).toBe(false);
  });

  it('saves the current draft snapshot and dispatches the saved event', async () => {
    hoisted.saveDraftForContext.mockResolvedValue({ id: 'saved-draft-1' });

    const host = createHost({
      draftKey: 'draft:tech.lgbt:user-123:new',
      statusText: 'hello draft',
      sensitive: true,
      spoilerText: 'cw',
      pollEnabled: true,
      pollOptions: ['A', 'B'],
      pollDurationSeconds: 3600,
      pollMultiple: true,
      scheduleEnabled: true,
      scheduleDate: '2026-05-09',
      scheduleTime: '09:30',
      draftDirty: true,
      attachments: [
        {
          id: 'temp-1',
          preview_url: 'blob:temp-1',
          description: 'pending upload',
          pending: true,
          file: new File(['draft'], 'draft.png', { type: 'image/png' }),
        },
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: 'uploaded',
          pending: false,
        },
      ],
    });

    hoisted.listDraftsForContext.mockResolvedValue([
      {
        id: 'saved-draft-1',
        status: 'hello draft',
        visibility: 'public',
        sensitive: true,
        spoilerText: 'cw',
        poll: null,
        schedule: null,
        replyToId: null,
        attachments: [],
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    ]);

    await host.manager.saveDraft();

    expect(hoisted.saveDraftForContext).toHaveBeenCalledWith(
      'draft:tech.lgbt:user-123:new',
      expect.objectContaining({
        status: 'hello draft',
        spoilerText: 'cw',
        schedule: { date: '2026-05-09', time: '09:30' },
        poll: {
          options: ['A', 'B'],
          expiresIn: 3600,
          multiple: true,
        },
        attachments: [
          expect.objectContaining({
            id: 'temp-1',
            preview_url: '',
            pending: true,
          }),
          expect.objectContaining({
            id: 'media-1',
            preview_url: 'https://cdn.example.com/media-1.png',
            pending: false,
          }),
        ],
      })
    );
    expect(host.dispatchDraftSaved).toHaveBeenCalledWith('saved-draft-1');
    expect(host.getState().selectedDraftId).toBe('saved-draft-1');
    expect(host.getState().draftStatus).toBe('saved');
    expect(host.getState().draftDirty).toBe(false);
    expect(host.getState().lastSavedStatusText).toBe('hello draft');
  });
});
