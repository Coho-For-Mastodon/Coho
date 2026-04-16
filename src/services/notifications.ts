import type { Notification as MastodonNotification } from '../interfaces/Notification';
import {
  getNotifications as mastodonGetNotifications,
  clearNotifications as mastodonClearNotifications,
  checkNewNotifications as mastodonCheckNewNotifications,
  markNotificationsRead as mastodonMarkNotificationsRead,
} from '../mastodon/api/notifications';

import type {
  PushSubscription as MastodonPushSubscription,
  PushAlerts,
  PushPolicy,
} from '../mastodon/types/notification';
import {
  apiFetch,
  buildMastodonUrl,
  fetchMastodonJson,
  ApiError,
} from '../utils/api-client';

// Core notification functions with proper type casting
export const getNotifications = async (
  maxId?: string,
  limit: number = 20
): Promise<MastodonNotification[]> => {
  const data = await mastodonGetNotifications(maxId, limit);
  return data;
};

export const clearNotifications = mastodonClearNotifications;
export const checkNewNotifications = mastodonCheckNewNotifications;
export const markNotificationsRead = mastodonMarkNotificationsRead;

// App-specific push notification functions

function urlBase64ToUint8Array(key: string) {
  const padding = '='.repeat((4 - (key.length % 4)) % 4);
  const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subToPush = async () => {
  // On native Capacitor platforms, delegate to the FCM-based flow
  const { isNativePlatform } = await import('../utils/platform.js');
  if (isNativePlatform()) {
    const { subToPushNative } = await import('./push-native.js');
    return subToPushNative();
  }

  const registration = await navigator.serviceWorker.getRegistration();

  let vapidKey: string | undefined;
  let subscription: PushSubscription | null | undefined;

  // First, try to get VAPID key from app credentials
  // This is the correct way according to Mastodon docs
  try {
    const appResponse = await apiFetch(
      buildMastodonUrl('/api/v1/apps/verify_credentials'),
      { skipResponseCheck: true, retries: 0 }
    );

    if (appResponse.ok) {
      const appData = await appResponse.json();
      vapidKey = appData.vapid_key;
    }
  } catch (_error) {
    // VAPID key unavailable from app credentials — try fallback
  }

  // Fallback: Try to get existing subscription from Mastodon API which contains the server_key
  if (!vapidKey) {
    try {
      const existingSubResponse = await apiFetch(
        buildMastodonUrl('/api/v1/push/subscription'),
        { skipResponseCheck: true, retries: 0 }
      );

      if (existingSubResponse.ok) {
        const existingSub = await existingSubResponse.json();
        vapidKey = existingSub.server_key;
      }
    } catch (_error) {
      // No existing subscription available
    }
  }

  // If we have the VAPID key, create a browser push subscription
  if (vapidKey) {
    subscription = await registration?.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } else {
    // Check if browser already has a subscription
    subscription = await registration?.pushManager.getSubscription();

    if (!subscription) {
      throw new Error(
        'Cannot create push subscription: No VAPID key available. Your Mastodon server may not support Web Push notifications.'
      );
    }
  }

  if (!subscription) {
    return;
  }

  // Convert subscription to the format Mastodon expects
  const subscriptionJSON = subscription.toJSON();

  const response = await apiFetch(
    buildMastodonUrl('/api/v1/push/subscription'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: {
          endpoint: subscriptionJSON.endpoint,
          keys: {
            p256dh: subscriptionJSON.keys?.p256dh,
            auth: subscriptionJSON.keys?.auth,
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
  const res = await response.json();

  const doWeHavePermission = Notification.permission === 'granted';
  let permission: NotificationPermission | undefined;

  if (!doWeHavePermission) {
    permission = await Notification.requestPermission();
  } else {
    permission = 'granted';
  }

  if (permission === 'granted') {
    // show notification
    registration?.showNotification('Coho', {
      body: 'You have successfully subscribed to push notifications!',
      icon: '/assets/icons/new-icons/icon-128x128.png',
      tag: 'coho-subscribe',
    });
  }

  if (res) {
    try {
      // set minInterval to twice a day
      const minInterval = 12 * 60 * 60 * 1000;

      if (registration) {
        await registration.periodicSync.register('get-notifications', {
          minInterval,
        });
      }
    } catch {
      // Periodic Sync registration not supported
    }
  }
};

/**
 * Fetch the current push subscription from the Mastodon server.
 * Returns null if no subscription exists (404).
 */
export const getPushSubscription =
  async (): Promise<MastodonPushSubscription | null> => {
    try {
      return await fetchMastodonJson<MastodonPushSubscription>(
        '/api/v1/push/subscription'
      );
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) {
        return null;
      }
      console.error('getPushSubscription error:', error);
      return null;
    }
  };

/**
 * Update which notification types trigger push alerts and the push policy.
 * Uses PUT /api/v1/push/subscription.
 */
export const modifyPush = async (options: {
  alerts: PushAlerts;
  policy?: PushPolicy;
}): Promise<MastodonPushSubscription | null> => {
  const body: { data: { alerts: PushAlerts; policy?: PushPolicy } } = {
    data: {
      alerts: options.alerts,
    },
  };

  if (options.policy) {
    body.data.policy = options.policy;
  }

  try {
    return await fetchMastodonJson<MastodonPushSubscription>(
      '/api/v1/push/subscription',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    console.error('modifyPush failed:', error);
    return null;
  }
};

export const unsubToPush = async () => {
  // On native Capacitor platforms, delegate to the FCM-based flow
  const { isNativePlatform } = await import('../utils/platform.js');
  if (isNativePlatform()) {
    const { unsubToPushNative } = await import('./push-native.js');
    return unsubToPushNative();
  }

  // get push subscription
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const response = await apiFetch(
    buildMastodonUrl('/api/v1/push/subscription'),
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    }
  );
  await response.json();

  await subscription.unsubscribe();
};
