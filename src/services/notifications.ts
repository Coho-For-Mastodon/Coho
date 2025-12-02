// Helper functions to always get fresh values from localStorage
const getServer = () => localStorage.getItem('server') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';

export const getNotifications = async () => {
  // const notifyResponse = await fetch(`http://localhost:8000/notifications?code=${accessToken}&server=${server}`);
  // const data = await notifyResponse.json();
  // return data;

  // get notifications from mastodon api
  const accessToken = getAccessToken();
  const server = getServer();
  const notifyResponse = await fetch(`https://${server}/api/v1/notifications`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await notifyResponse.json();
  return data;
};

export const clearNotifications = async () => {
  // const response = await fetch(`https://mammothserver.azurewebsites.net/clearNotifications?code=${accessToken}&server=${server}`, {
  //     method: 'POST',
  // });
  // const data = await response.json();
  // return data;

  // clear notifications from mastodon api
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(`https://${server}/api/v1/notifications/clear`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

export const checkNewNotifications = async (): Promise<boolean> => {
  const accessToken = getAccessToken();
  const server = getServer();

  try {
    const response = await fetch(
      `https://${server}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    if (data && data.length > 0) {
      const latestId = data[0].id;
      const lastReadId = localStorage.getItem('lastReadNotificationId');

      if (!lastReadId) {
        // First run, mark as read to avoid initial badge
        localStorage.setItem('lastReadNotificationId', latestId);
        return false;
      }

      return latestId !== lastReadId;
    }
  } catch (e) {
    console.error('Error checking notifications', e);
  }

  return false;
};

export const markNotificationsRead = async () => {
  const accessToken = getAccessToken();
  const server = getServer();

  try {
    const response = await fetch(
      `https://${server}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      }
    );

    if (!response.ok) return;

    const data = await response.json();
    if (data && data.length > 0) {
      localStorage.setItem('lastReadNotificationId', data[0].id);
    }
  } catch (e) {
    console.error('Error marking notifications read', e);
  }
};

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

  const accessToken = getAccessToken();
  const server = getServer();

  // First, try to get VAPID key from app credentials
  // This is the correct way according to Mastodon docs
  try {
    const appResponse = await fetch(
      `https://${server}/api/v1/apps/verify_credentials`,
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
        `https://${server}/api/v1/push/subscription`,
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

  const response = await fetch(`https://${server}/api/v1/push/subscription`, {
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

  // ask for permission to show notifications
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // show notification
    registration?.showNotification('Coho', {
      body: 'You have successfully subscribed to push notifications!',
      icon: '/assets/icons/128-icon.png',
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
      console.log('Periodic Sync could not be registered!');
    }
  }
};

export const modifyPush = async (flags?: string[]) => {
  let data: { alerts: Record<string, boolean> } | undefined;
  if (flags) {
    data = {
      alerts: {
        follow: flags.includes('follow'),
        reblog: flags.includes('reblog'),
        favourite: flags.includes('favourite'),
        mention: flags.includes('mention'),
        poll: flags.includes('poll'),
        follow_request: flags.includes('follow_request'),
        status: flags.includes('status'),
        update: flags.includes('update'),
      },
    };
  } else {
    data = {
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
    };
  }

  const accessToken = getAccessToken();
  const server = getServer();

  const response = await fetch(`https://${server}/api/v1/push/subscription`, {
    method: 'PUT',
    headers: new Headers({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      data,
    }),
  });
  const res = await response.json();
  console.log('modifyPush', res);
};

export const unsubToPush = async () => {
  // get push subscription
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const accessToken = getAccessToken();
  const server = getServer();

  const response = await fetch(`https://${server}/api/v1/push/subscription`, {
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
