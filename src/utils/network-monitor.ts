/**
 * Network Monitor
 *
 * Centralises detection of network quality using the Network Information API.
 * Provides reactive helpers for adaptive loading (image quality, fetch limits)
 * and lets components subscribe to connection-quality changes.
 *
 * Quality tiers:
 *   'fast'   – 4g or API unavailable
 *   'medium' – 3g
 *   'slow'   – slow-2g, 2g, or saveData enabled
 */

export type NetworkQuality = 'fast' | 'medium' | 'slow';

type QualityListener = (quality: NetworkQuality) => void;

// ---------------------------------------------------------------------------
// Internal registry
// ---------------------------------------------------------------------------
const _listeners: QualityListener[] = [];

function _dispatch() {
  const quality = getNetworkQuality();
  for (const listener of _listeners) {
    listener(quality);
  }
}

// Listen for connection changes and proxy to all registered listeners.
// Use addEventListener so we don't overwrite handlers set by other code.
if (typeof navigator !== 'undefined' && navigator.connection) {
  navigator.connection.addEventListener('change', _dispatch);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current network quality tier.
 * Falls back to 'fast' when the Network Information API is unavailable.
 */
export function getNetworkQuality(): NetworkQuality {
  const connection =
    typeof navigator !== 'undefined' ? navigator.connection : undefined;
  if (!connection) return 'fast';

  if (connection.saveData) return 'slow';

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'medium';
    case '4g':
      return 'fast';
    default:
      return 'fast';
  }
}

/**
 * Returns true when conditions warrant loading smaller/preview images.
 * Triggers on slow-2g, 2g, 3g, or data-saver mode.
 */
export function shouldUseReducedImageQuality(): boolean {
  const quality = getNetworkQuality();
  return quality === 'slow' || quality === 'medium';
}

/**
 * Picks the best image URL for the current network conditions.
 * @param fullUrl      The full-resolution image URL (e.g. MediaAttachment.url)
 * @param previewUrl   The lower-resolution preview URL (e.g. MediaAttachment.preview_url)
 */
export function getAdaptiveImageUrl(
  fullUrl: string,
  previewUrl: string
): string {
  return shouldUseReducedImageQuality() ? previewUrl : fullUrl;
}

/**
 * Returns the number of posts that should be fetched per timeline page
 * based on current network conditions.
 */
export function getTimelineLimit(): number {
  const quality = getNetworkQuality();
  if (quality === 'slow') return 5;
  if (quality === 'medium') return 7;
  return 10;
}

/**
 * Returns true when the connection is too slow or data-saver is on,
 * indicating background work (prefetch, preload) should be skipped.
 * Includes 3g since prefetching on mobile data is wasteful.
 */
export function isSlowConnection(): boolean {
  const quality = getNetworkQuality();
  return quality === 'slow' || quality === 'medium';
}

/**
 * Subscribe to network quality changes.
 * The callback is invoked whenever the underlying NetworkInformation fires
 * a change event. Returns an unsubscribe function.
 *
 * @example
 * const unsub = onNetworkQualityChange((q) => this._slowNetwork = q === 'slow');
 * // later:
 * unsub();
 */
export function onNetworkQualityChange(callback: QualityListener): () => void {
  _listeners.push(callback);
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}
