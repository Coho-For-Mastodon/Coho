import type { Notification as MastodonNotification } from '../interfaces/Notification';
import {
  getNotifications as mastodonGetNotifications,
  clearNotifications as mastodonClearNotifications,
  checkNewNotifications as mastodonCheckNewNotifications,
  markNotificationsRead as mastodonMarkNotificationsRead,
} from '../mastodon/api/notifications';

import { getClientConfig } from '../mastodon/config/client';
import type {
  PushSubscription as MastodonPushSubscription,
  PushAlerts,
  PushPolicy,
} from '../mastodon/types/notification';

// Core notification functions with proper type casting
export const getNotifications = async (
  maxId?: string,
  limit: number = 20
): Promise<MastodonNotification[]> => {
  const data = await mastodonGetNotifications(maxId, limit);
  return data as unknown as MastodonNotification[];
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
  const registration = await navigator.serviceWorker.getRegistration();

  let vapidKey: string | undefined;
  let subscription: PushSubscription | null | undefined;

  const { url, accessToken } = getClientConfig();

  // First, try to get VAPID key from app credentials
  // This is the correct way according to Mastodon docs
  try {
    const appResponse = await fetch(
      `https://${url}/api/v1/apps/verify_credentials`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      }
    );

    if (appResponse.ok) {
      const appData = await appResponse.json();
      vapidKey = appData.vapid_key;
      console.log('Got VAPID key from app credentials:', vapidKey);
    }
  } catch (error) {
    console.log('Could not get VAPID key from app credentials:', error);
  }

  // Fallback: Try to get existing subscription from Mastodon API which contains the server_key
  if (!vapidKey) {
    try {
      const existingSubResponse = await fetch(
        `https://${url}/api/v1/push/subscription`,
        {
          method: 'GET',
          headers: new Headers({
            Authorization: `Bearer ${accessToken}`,
          }),
        }
      );

      if (existingSubResponse.ok) {
        const existingSub = await existingSubResponse.json();
        vapidKey = existingSub.server_key;
        console.log('Got VAPID key from existing subscription:', vapidKey);
      }
    } catch (error) {
      console.log('No existing subscription found:', error);
    }
  }

  // If we have the VAPID key, create a browser push subscription
  if (vapidKey) {
    console.log(
      'Creating push subscription with VAPID key:',
      vapidKey,
      registration
    );
    subscription = await registration?.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.log('Created push subscription:', subscription);
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

  const response = await fetch(`https://${url}/api/v1/push/subscription`, {
    method: 'POST',
    headers: new Headers({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
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
  });
  const res = await response.json();
  console.log('subToPush', res);

  const doWeHavePermission = Notification.permission === 'granted';
  let permission: NotificationPermission | undefined;

  if (!doWeHavePermission) {
    console.log('Requesting notification permission from user...');
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (registration as any).periodicSync.register('get-notifications', {
          minInterval,
        });
      }
    } catch {
      console.log('Periodic Sync could not be registered!');
    }
  }
};

/**
 * Fetch the current push subscription from the Mastodon server.
 * Returns null if no subscription exists (404).
 */
export const getPushSubscription =
  async (): Promise<MastodonPushSubscription | null> => {
    const { url, accessToken } = getClientConfig();

    try {
      const response = await fetch(`https://${url}/api/v1/push/subscription`, {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error('getPushSubscription failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
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
  const { url, accessToken } = getClientConfig();

  const body: { data: { alerts: PushAlerts; policy?: PushPolicy } } = {
    data: {
      alerts: options.alerts,
    },
  };

  if (options.policy) {
    body.data.policy = options.policy;
  }

  const response = await fetch(`https://${url}/api/v1/push/subscription`, {
    method: 'PUT',
    headers: new Headers({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error('modifyPush failed:', response.status);
    return null;
  }

  const res = await response.json();
  console.log('modifyPush', res);
  return res;
};

export const unsubToPush = async () => {
  // get push subscription
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/push/subscription`, {
    method: 'DELETE',
    headers: new Headers({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(subscription),
  });
  const res = await response.json();
  console.log('unsubToPush', res);

  await subscription.unsubscribe();
};
