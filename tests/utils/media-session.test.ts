import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  updateMediaSession,
  clearMediaSession,
  updateMediaSessionPosition,
} from '../../src/utils/media-session';

// Minimal MediaMetadata stub used for assertions
class FakeMediaMetadata {
  title: string;
  artist: string;
  artwork: MediaImage[];
  constructor(init: { title: string; artist: string; artwork: MediaImage[] }) {
    this.title = init.title;
    this.artist = init.artist;
    this.artwork = init.artwork;
  }
}

function createMockMediaSession() {
  const handlers = new Map<string, MediaSessionActionHandler | null>();
  return {
    metadata: null as unknown,
    setActionHandler: vi.fn(
      (action: string, handler: MediaSessionActionHandler | null) => {
        handlers.set(action, handler);
      }
    ),
    setPositionState: vi.fn(),
    _handlers: handlers,
  };
}

describe('media-session', () => {
  let mockSession: ReturnType<typeof createMockMediaSession>;

  beforeEach(() => {
    mockSession = createMockMediaSession();
    Object.defineProperty(navigator, 'mediaSession', {
      value: mockSession,
      writable: true,
      configurable: true,
    });
    // Provide a global MediaMetadata constructor
    (globalThis as Record<string, unknown>).MediaMetadata = FakeMediaMetadata;
  });

  afterEach(() => {
    clearMediaSession();
    delete (globalThis as Record<string, unknown>).MediaMetadata;
  });

  it('sets metadata with title, artist, and artwork', () => {
    updateMediaSession({
      title: 'My Audio',
      artist: 'Test User',
      artwork: 'https://example.com/avatar.png',
    });

    const meta = mockSession.metadata as FakeMediaMetadata;
    expect(meta.title).toBe('My Audio');
    expect(meta.artist).toBe('Test User');
    expect(meta.artwork).toEqual([
      {
        src: 'https://example.com/avatar.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ]);
  });

  it('sets metadata without artwork when omitted', () => {
    updateMediaSession({ title: 'Audio', artist: 'User' });

    const meta = mockSession.metadata as FakeMediaMetadata;
    expect(meta.artwork).toEqual([]);
  });

  it('registers play and pause action handlers', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();

    updateMediaSession({ title: 'A', artist: 'B', onPlay, onPause });

    expect(mockSession.setActionHandler).toHaveBeenCalledWith('play', onPlay);
    expect(mockSession.setActionHandler).toHaveBeenCalledWith('pause', onPause);
  });

  it('registers seekto action handler that forwards seekTime', () => {
    const onSeekTo = vi.fn();
    updateMediaSession({ title: 'A', artist: 'B', onSeekTo });

    // Find the registered handler
    const seekHandler = mockSession._handlers.get('seekto') as (details: {
      seekTime?: number;
    }) => void;
    expect(seekHandler).toBeDefined();

    seekHandler({ seekTime: 42 });
    expect(onSeekTo).toHaveBeenCalledWith(42);
  });

  it('clearMediaSession resets metadata and removes handlers', () => {
    updateMediaSession({
      title: 'A',
      artist: 'B',
      onPlay: vi.fn(),
      onPause: vi.fn(),
    });

    clearMediaSession();

    expect(mockSession.metadata).toBeNull();
    // Handlers should be cleared (set to null)
    const calls = mockSession.setActionHandler.mock.calls;
    const nullCalls = calls.filter(
      ([, handler]: [string, unknown]) => handler === null
    );
    expect(nullCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('updateMediaSessionPosition calls setPositionState', () => {
    updateMediaSessionPosition(10, 60);

    expect(mockSession.setPositionState).toHaveBeenCalledWith({
      duration: 60,
      playbackRate: 1,
      position: 10,
    });
  });

  it('updateMediaSessionPosition skips invalid duration', () => {
    updateMediaSessionPosition(10, NaN);
    updateMediaSessionPosition(10, 0);
    updateMediaSessionPosition(10, -1);

    expect(mockSession.setPositionState).not.toHaveBeenCalled();
  });

  it('updateMediaSessionPosition clamps position to duration', () => {
    updateMediaSessionPosition(100, 60);

    expect(mockSession.setPositionState).toHaveBeenCalledWith({
      duration: 60,
      playbackRate: 1,
      position: 60,
    });
  });
});
