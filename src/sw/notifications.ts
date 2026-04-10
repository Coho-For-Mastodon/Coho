/**
 * Notification Handlers
 *
 * Handles push notifications, notification clicks, and periodic
 * notification checks for Mastodon.
 */

import { get } from 'idb-keyval';
import type {
  CohoServiceWorkerGlobalScope,
  MastodonPushPayload,
  NotificationAction,
  NotificationData,
  PushSubscriptionChangeEvent,
} from './types';

declare const self: CohoServiceWorkerGlobalScope;
import { DEFAULT_ICON } from './constants';
import {
  stripHtml,
  getAuthHeaders,
  buildFollowAction,
  badgingNavigator,
  focusOrOpenWindow,
  followAUser,
} from './helpers';

// ============================================================================
// Periodic Notification Check
// ============================================================================

/**
 * Fetch notifications from the Mastodon API and show a system notification
 * for the most recent one. Called by the periodic sync handler.
 */
export async function getNotifications(): Promise<void> {
  const { server, headers } = await getAuthHeaders();

  const notifyResponse = await fetch(`https://${server}/api/v1/notifications`, {
    method: 'GET',
    headers,
  });

  // Only attempt to parse JSON on successful responses.
  if (!notifyResponse.ok) {
    // If we are being rate limited, return gracefully so periodic checks continue.
    if (notifyResponse.status === 429) {
      console.warn('Rate limited when fetching notifications');
    }
    return;
  }

  const raw = await notifyResponse.json().catch(() => null);
  if (!Array.isArray(raw) || raw.length === 0) {
    return;
  }
  const data = raw as NotificationData[];
  if ('setAppBadge' in navigator) {
    badgingNavigator.setAppBadge?.(data.length);
  }

  let message = '';
  let actions: NotificationAction[] = [];
  let title = 'Coho';

  switch (data[0].type) {
    case 'mention':
      message = `${data[0].status?.content || ''}`;
      title = `${data[0].account.display_name} mentioned you`;
      break;
    case 'reblog':
      message = `${data[0].account.display_name} boosted your post`;
      break;
    case 'favourite':
      message = `${data[0].account.display_name} favorited your post`;
      break;
    case 'follow':
      message = `${data[0].account.display_name} followed you`;
      title = 'New Follower';
      actions = buildFollowAction();
      break;
    case 'follow_request':
      message = `${data[0].account.display_name} requested to follow you`;
      title = 'Follow request';
      break;
    case 'poll':
      message = `${data[0].account.display_name} updated a poll`;
      title = 'Poll update';
      break;
    case 'status':
      message = `${data[0].account.display_name} posted a new status`;
      title = 'New status';
      break;
    case 'update':
      message = `${data[0].account.display_name} updated a post`;
      title = 'Post update';
      break;
    default:
      message = `You have ${data.length} new notifications`;
      break;
  }

  message = stripHtml(message);

  await self.registration.showNotification(title, {
    body: message,
    icon: DEFAULT_ICON,
    tag: 'coho',
    renotify: false,
    actions: actions,
    data: {
      url: data[0].account.url,
      accountId: data[0].account.id,
    },
  });
}

// ============================================================================
// Push Handler
// ============================================================================

/**
 * Handle an incoming Web Push event from Mastodon.
 * Parses the payload and shows a system notification.
 */
export function handlePush(event: PushEvent): void {
  let payload: MastodonPushPayload;
  try {
    payload = event.data?.json() as MastodonPushPayload;
  } catch (err) {
    console.error('Failed to parse push payload', err);
    // Still call waitUntil so the browser doesn't terminate the SW prematurely
    event.waitUntil(Promise.resolve());
    return;
  }

  if ('setAppBadge' in navigator) {
    badgingNavigator.setAppBadge?.(1);
  }

  let actions: NotificationAction[] = [];
  if (payload.notification_type === 'follow') {
    actions = buildFollowAction();
  }

  payload.body = payload.body ? stripHtml(payload.body) : payload.body;

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title || 'Coho', {
        body: payload.body || 'You have a new notification',
        icon: payload.icon || DEFAULT_ICON,
        tag: payload.notification_id || 'coho',
        badge: DEFAULT_ICON,
        renotify: true,
        actions: actions,
        data: {
          access_token: payload.access_token,
          notification_id: payload.notification_id,
          notification_type: payload.notification_type,
          preferred_locale: payload.preferred_locale,
        },
      });

      // Notify open clients so they can refresh (e.g. DM thread on mention)
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({
          type: 'push-notification',
          notificationType: payload.notification_type,
          notificationId: payload.notification_id,
        });
      }
    })()
  );
}

// ============================================================================
// Push Subscription Change Handler
// ============================================================================

/**
 * Handle browser-initiated push subscription changes.
 * Re-subscribes and updates the Mastodon server with the new endpoint
 * so push notifications continue working.
 */
export function handlePushSubscriptionChange(
  event: PushSubscriptionChangeEvent
): void {
  event.waitUntil(
    (async () => {
      try {
        // Use the new subscription if the browser already created one,
        // otherwise re-subscribe with the old subscription's options.
        let newSub = event.newSubscription;
        if (!newSub) {
          const options = event.oldSubscription?.options ?? {
            userVisibleOnly: true,
          };
          newSub = await self.registration.pushManager.subscribe(options);
        }

        const subJSON = newSub.toJSON();
        const { server, headers } = await getAuthHeaders();

        // Update Mastodon with the new push endpoint and keys
        const response = await fetch(
          `https://${server}/api/v1/push/subscription`,
          {
            method: 'POST',
            headers: new Headers({
              'Authorization': headers.get('Authorization') || '',
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              subscription: {
                endpoint: subJSON.endpoint,
                keys: {
                  p256dh: subJSON.keys?.p256dh,
                  auth: subJSON.keys?.auth,
                },
              },
              data: {
                alerts: {
                  follow: true,
                  reblog: true,
                  favourite: true,
                  mention: true,
                  poll: true,
                  follow_request: true,
                  status: true,
                  update: true,
                },
                policy: 'all',
              },
            }),
          }
        );

        if (!response.ok) {
          console.error(
            '[SW] Push subscription update failed:',
            response.status,
            response.statusText
          );
        } else {
          console.log('[SW] Push subscription updated successfully');
        }
      } catch (error) {
        // Network failure or missing credentials — the foreground health
        // check will retry on next app open.
        console.error('[SW] Failed to handle subscription change:', error);
      }
    })()
  );
}

// ============================================================================
// Notification Click Handler
// ============================================================================

/**
 * Determine the target URL based on the notification type.
 */
function getTargetUrl(
  notificationData: Record<string, string> | undefined
): string {
  if (
    !notificationData?.notification_type ||
    !notificationData?.notification_id
  ) {
    return '/home?tab=notifications';
  }

  const { notification_type, notification_id } = notificationData;

  switch (notification_type) {
    case 'mention':
    case 'reblog':
    case 'favourite':
    case 'poll':
    case 'status':
    case 'update':
      return `/post/notification?notification_id=${notification_id}`;
    case 'follow':
    case 'follow_request':
    case 'admin.sign_up':
    case 'admin.report':
      return '/home?tab=notifications';
    default:
      return '/home?tab=notifications';
  }
}

/**
 * Handle user clicks on a notification.
 * Closes the notification, clears the badge, and focuses/opens the app.
 */
export function handleNotificationClick(event: NotificationEvent): void {
  event.notification.close();

  if ('clearAppBadge' in navigator) {
    badgingNavigator.clearAppBadge?.();
  }

  const notificationData = event.notification.data;
  const targetUrl = getTargetUrl(notificationData);

  // Handle "Follow back" action
  if (
    event.action === 'follow' &&
    notificationData?.notification_id &&
    notificationData?.access_token
  ) {
    // Note: Uses access_token from the push payload (stored in notification data)
    // rather than getAuthHeaders(), because the token that registered the push
    // subscription may differ from the currently-stored token.
    event.waitUntil(
      (async () => {
        try {
          const server = (await get('server')) as string;
          const response = await fetch(
            `https://${server}/api/v1/notifications/${notificationData.notification_id}`,
            {
              method: 'GET',
              headers: new Headers({
                Authorization: `Bearer ${notificationData.access_token}`,
              }),
            }
          );
          if (response.ok) {
            const notification = await response.json();
            if (notification.account?.id) {
              await followAUser(notification.account.id, {
                server,
                accessToken: notificationData.access_token,
              });
            }
          }
        } catch (error) {
          console.error('Failed to follow user:', error);
        }
        await focusOrOpenWindow(targetUrl);
      })()
    );
    return;
  }

  event.waitUntil(focusOrOpenWindow(targetUrl));
}
