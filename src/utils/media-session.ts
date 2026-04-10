/**
 * MediaSession API integration for native media controls.
 *
 * Sets metadata (title, artist, artwork) and wires action handlers
 * so that OS-level controls (lock screen, notification shade, media keys)
 * can control playback within the PWA.
 */

export interface MediaSessionOptions {
  title: string;
  artist: string;
  artwork?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeekTo?: (time: number) => void;
}

const actionHandlers = new Map<MediaSessionAction, MediaSessionActionHandler>();

function setHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler
) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
    actionHandlers.set(action, handler);
  } catch {
    // Action not supported by this browser
  }
}

function clearHandler(action: MediaSessionAction) {
  try {
    navigator.mediaSession.setActionHandler(action, null);
    actionHandlers.delete(action);
  } catch {
    // Action not supported
  }
}

export function updateMediaSession(options: MediaSessionOptions): void {
  if (!('mediaSession' in navigator)) return;

  const artworkArray: MediaImage[] = options.artwork
    ? [{ src: options.artwork, sizes: '512x512', type: 'image/png' }]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: options.title,
    artist: options.artist,
    artwork: artworkArray,
  });

  if (options.onPlay) {
    setHandler('play', options.onPlay);
  }
  if (options.onPause) {
    setHandler('pause', options.onPause);
  }
  if (options.onStop) {
    setHandler('stop', options.onStop);
  }
  if (options.onSeekTo) {
    const seekHandler = options.onSeekTo;
    setHandler('seekto', (details) => {
      if (details.seekTime != null) {
        seekHandler(details.seekTime);
      }
    });
  }
}

export function clearMediaSession(): void {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = null;

  for (const action of actionHandlers.keys()) {
    clearHandler(action);
  }
  actionHandlers.clear();
}

export function updateMediaSessionPosition(
  currentTime: number,
  duration: number,
  playbackRate = 1
): void {
  if (!('mediaSession' in navigator)) return;
  if (!isFinite(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position: Math.min(currentTime, duration),
    });
  } catch {
    // Position state not supported or invalid values
  }
}
