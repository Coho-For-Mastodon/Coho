/**
 * Periodic Sync Handlers
 *
 * Handles periodic background sync events for timeline caching
 * and notification checks.
 */

import { set } from 'idb-keyval';
import type { PeriodicSyncEvent } from './types';
import { getAuthHeaders } from './helpers';
import { getNotifications } from './notifications';

/**
 * Sync the home timeline in the background. Fetches the latest
 * timeline posts and stores them in IndexedDB for offline access.
 */
export async function timelineSync(): Promise<void> {
  const { server, headers } = await getAuthHeaders();

  const timelineResponse = await fetch(
    `https://${server}/api/v1/timelines/home`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!timelineResponse.ok) {
    console.error(
      '[periodic-sync] timelineSync failed',
      timelineResponse.status,
      timelineResponse.statusText
    );
    return;
  }
  const data = await timelineResponse.json();
  await set('timeline-cache', data);
}

/**
 * Handle a periodic sync event by dispatching to the appropriate handler.
 */
export function handlePeriodicSync(event: Event): void {
  const periodicSyncEvent = event as PeriodicSyncEvent;

  switch (periodicSyncEvent.tag) {
    case 'get-notifications':
      periodicSyncEvent.waitUntil(getNotifications());
      break;
    case 'timeline-sync':
      periodicSyncEvent.waitUntil(timelineSync());
      break;
    default:
      break;
  }
}
