/**
 * Component Precaching Service
 *
 * Precaches critical lazy-loaded components during idle time so they're
 * available offline. Uses the Network Information API to tier precaching:
 *
 * - All connections (including slow/unknown): Post dialog + its full dep tree
 * - Fast connections (4g): Additional happy-path pages (notifications, search, etc.)
 *
 * The SW's cache-first strategy for scripts means once a chunk is fetched,
 * it's cached permanently (hashed filenames = immutable assets).
 */

import { getNetworkQuality } from '../utils/network-monitor';

type PrecacheTask = () => Promise<unknown>;

/**
 * Determine the precaching tier based on network and user settings.
 *
 * Returns:
 * - 'none'     : data saver is on — skip all precaching
 * - 'critical' : slow/unknown connection — only post dialog
 * - 'extended' : fast connection — post dialog + more pages
 */
async function getPrecacheTier(): Promise<'none' | 'critical' | 'extended'> {
  // Respect the app's data saver setting
  const { getSettings } = await import('./settings');
  const settings = await getSettings();
  if (settings.data_saver) {
    return 'none';
  }

  const quality = getNetworkQuality();

  // If the browser exposes saveData and it's on, skip entirely
  if (quality === 'slow') {
    return 'none';
  }

  // Fast connection: 4g (only when the API is actually present and confirmed)
  if (quality === 'fast') {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      return 'extended';
    }
    // API unavailable (Safari/Firefox) — treat as unknown, be conservative
    return 'critical';
  }

  // Moderate or unknown (Safari/Firefox) — be conservative
  return 'critical';
}

/**
 * Critical tier: post dialog and its full dependency tree.
 * This is the single most important offline feature — users expect to
 * be able to compose posts at any time.
 */
function getCriticalTasks(): PrecacheTask[] {
  return [() => import('../components/post-dialog.js')];
}

/**
 * Extended tier: additional happy-path pages that authenticated
 * users commonly visit. Only loaded on fast connections.
 */
function getExtendedTasks(): PrecacheTask[] {
  return [
    () => import('../pages/search-page.js'),
    () => import('../components/notifications.js'),
    () => import('../pages/app-profile.js'),
  ];
}

/**
 * Request idle callback with Safari fallback.
 */
function idleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return (
      window as Window & { requestIdleCallback: typeof requestIdleCallback }
    ).requestIdleCallback(callback, options);
  }

  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
}

/**
 * Process a queue of precache tasks one-per-idle-period to avoid
 * blocking the main thread or saturating the network.
 */
function drainQueue(queue: PrecacheTask[]): void {
  let index = 0;

  const processNext = (_deadline: IdleDeadline): void => {
    if (index >= queue.length) {
      return;
    }

    const task = queue[index++];
    task().catch((err) => {
      console.warn('[Precache] Task failed (non-fatal):', err);
    });

    if (index < queue.length) {
      idleCallback(processNext, { timeout: 10000 });
    }
  };

  idleCallback(processNext, { timeout: 10000 });
}

/**
 * Main entry point. Call after the app is loaded and authenticated.
 * Waits for the page to be fully loaded + a delay, then starts
 * precaching components during idle time.
 */
export async function initComponentPrecache(): Promise<void> {
  // Delay before starting — the caller already waits for data preloading
  // to finish, so this just adds breathing room before fetching chunks.
  const PRECACHE_STARTUP_DELAY_MS = 5000;
  await new Promise((resolve) =>
    setTimeout(resolve, PRECACHE_STARTUP_DELAY_MS)
  );

  const tier = await getPrecacheTier();

  if (tier === 'none') {
    return;
  }

  const tasks: PrecacheTask[] = [...getCriticalTasks()];

  if (tier === 'extended') {
    tasks.push(...getExtendedTasks());
  }

  drainQueue(tasks);
}
