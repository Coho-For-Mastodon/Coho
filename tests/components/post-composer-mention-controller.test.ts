import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  searchAccounts: vi.fn(),
  findMentionMatch: vi.fn(),
  estimateMentionDropdownHeight: vi.fn(() => 120),
  getCaretCoordinates: vi.fn(() => ({ left: 12, top: 8, lineHeight: 20 })),
}));

vi.mock('../../src/services/account', () => ({
  searchAccounts: hoisted.searchAccounts,
}));

vi.mock('../../src/utils/mention-utils', () => ({
  findMentionMatch: hoisted.findMentionMatch,
  estimateMentionDropdownHeight: hoisted.estimateMentionDropdownHeight,
  getCaretCoordinates: hoisted.getCaretCoordinates,
}));

import {
  PostComposerMentionController,
  type MentionControllerState,
} from '../../src/components/post-composer/mention-controller';

function createState(
  overrides: Partial<MentionControllerState> = {}
): MentionControllerState {
  return {
    mentionOpen: false,
    mentionQuery: '',
    mentionResults: [],
    mentionLoading: false,
    mentionActiveIndex: -1,
    mentionAnchorLeft: 0,
    mentionAnchorTop: 0,
    mentionDropdownWidth: 280,
    mentionAnchorReady: false,
    ...overrides,
  };
}

function createHost(initialState: Partial<MentionControllerState> = {}) {
  let state = createState(initialState);
  let composerValue = 'hello @ali';
  let cursor: number | undefined;

  return {
    controller: new PostComposerMentionController({
      getState: () => state,
      setState: (patch) => {
        state = { ...state, ...patch };
      },
      getNativeTextArea: () => null,
      getTextAreaWrapper: () => null,
      getComposerValue: () => composerValue,
      setComposerValue: (value, nextCursor) => {
        composerValue = value;
        cursor = nextCursor;
      },
    }),
    getState: () => state,
    getComposerValue: () => composerValue,
    getCursor: () => cursor,
  };
}

describe('PostComposerMentionController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hoisted.searchAccounts.mockReset();
    hoisted.findMentionMatch.mockReset();
    hoisted.estimateMentionDropdownHeight.mockClear();
    hoisted.getCaretCoordinates.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('debounces mention search and selects the first returned account', async () => {
    hoisted.findMentionMatch.mockReturnValue({
      query: 'ali',
      start: 6,
      end: 10,
    });
    hoisted.searchAccounts.mockResolvedValue([{ acct: 'alice' }]);

    const host = createHost();

    host.controller.updateSuggestions('hello @ali', 10, null);

    expect(host.getState().mentionOpen).toBe(true);
    expect(host.getState().mentionQuery).toBe('ali');
    expect(hoisted.searchAccounts).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    expect(hoisted.searchAccounts).toHaveBeenCalledWith('ali', 6);
    expect(host.getState().mentionResults).toEqual([{ acct: 'alice' }]);
    expect(host.getState().mentionActiveIndex).toBe(0);
    expect(host.getState().mentionLoading).toBe(false);
  });

  it('applies a mention insertion and closes the picker', () => {
    hoisted.findMentionMatch.mockReturnValue({
      query: 'ali',
      start: 6,
      end: 10,
    });

    const host = createHost();

    host.controller.updateSuggestions('hello @ali', 10, null);
    host.controller.applyMention({ acct: 'alice' } as never);

    expect(host.getComposerValue()).toBe('hello @alice ');
    expect(host.getCursor()).toBe(13);
    expect(host.getState().mentionOpen).toBe(false);
    expect(host.getState().mentionResults).toEqual([]);
    expect(host.getState().mentionActiveIndex).toBe(-1);
  });

  it('wraps mention selection in both directions', () => {
    const host = createHost({
      mentionResults: [{ acct: 'alice' }, { acct: 'bob' }] as never,
      mentionActiveIndex: 1,
    });

    host.controller.moveSelection(1);
    expect(host.getState().mentionActiveIndex).toBe(0);

    host.controller.moveSelection(-1);
    expect(host.getState().mentionActiveIndex).toBe(1);
  });

  it('cancels a pending search when closed', async () => {
    hoisted.findMentionMatch.mockReturnValue({
      query: 'ali',
      start: 6,
      end: 10,
    });

    const host = createHost();

    host.controller.updateSuggestions('hello @ali', 10, null);
    host.controller.close();
    await vi.advanceTimersByTimeAsync(200);

    expect(hoisted.searchAccounts).not.toHaveBeenCalled();
    expect(host.getState().mentionOpen).toBe(false);
    expect(host.getState().mentionQuery).toBe('');
    expect(host.getState().mentionResults).toEqual([]);
  });
});
