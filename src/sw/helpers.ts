/**
 * Service Worker Shared Helpers
 *
 * Utility functions used across multiple SW modules. Deduplicates
 * common patterns like HTML stripping, auth header construction,
 * and window management.
 */

import { get } from 'idb-keyval';
import type {
  CohoServiceWorkerGlobalScope,
  NavigatorBadge,
  NotificationAction,
} from './types';

declare const self: CohoServiceWorkerGlobalScope;

// ============================================================================
// HTML Utilities
// ============================================================================

/**
 * Strip HTML tags from a string. Used to sanitize notification body text
 * that may contain Mastodon HTML content.
 */
export function stripHtml(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, '');
}

// ============================================================================
// Auth Utilities
// ============================================================================

/**
 * Read authentication credentials from IndexedDB and return
 * the server hostname and an Authorization header.
 *
 * The service worker cannot access localStorage, so credentials
 * are synced to IndexedDB by the main app (app-index.ts).
 */
export async function getAuthHeaders(): Promise<{
  server: string;
  headers: Headers;
}> {
  const accessToken = (await get('accessToken')) as string;
  const server = (await get('server')) as string;

  return {
    server,
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  };
}

// ============================================================================
// Notification Utilities
// ============================================================================

/**
 * Build the "Follow back" notification action array.
 * Used by both periodic-sync notifications and Web Push notifications.
 */
export function buildFollowAction(): NotificationAction[] {
  return [
    {
      action: 'follow',
      title: 'Follow back',
    },
  ];
}

/** The badging-capable navigator (not all browsers support it) */
export const badgingNavigator = navigator as Navigator &
  Partial<NavigatorBadge>;

// ============================================================================
// Window Management
// ============================================================================

/**
 * Focus an existing app window or open a new one.
 * Used by notification click handlers to navigate the user.
 */
export async function focusOrOpenWindow(
  url: string
): Promise<WindowClient | null | undefined> {
  const urlObj = new URL(url, self.location.origin);
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    const clientUrl = new URL(client.url, self.location.origin);
    if (
      clientUrl.hostname === urlObj.hostname &&
      'focus' in client &&
      'navigate' in client
    ) {
      await client.focus();
      return client.navigate(url);
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }

  return undefined;
}

// ============================================================================
// Mastodon API Helpers
// ============================================================================

/**
 * Follow a user on Mastodon. Used by notification click "Follow back" action.
 */
export async function followAUser(id: string): Promise<void> {
  const { server, headers } = await getAuthHeaders();

  await fetch(`https://${server}/api/v1/accounts/${id}/follow`, {
    method: 'POST',
    headers,
  });
}
