/**
 * Native Push Notifications (Capacitor Android)
 *
 * Uses @capacitor/push-notifications for FCM token management and a
 * Firebase Function relay to bridge Mastodon's Web Push to FCM.
 *
 * The relay presents a standard Web Push endpoint to Mastodon, so the
 * Mastodon API call is identical to the PWA flow — only the subscription
 * source differs.
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { getClientConfig } from '../mastodon/config/client';

// ---------------------------------------------------------------------------
// Relay Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for the push relay Firebase Functions.
 * In production this points to the deployed Cloud Function; during local
 * development you can override via localStorage for testing with the emulator.
 */
function getRelayBaseUrl(): string {
  return (
    localStorage.getItem('pushRelayBaseUrl') ||
    'https://us-central1-coho-mastodon.cloudfunctions.net'
  );
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const RELAY_REGISTRATION_ID_KEY = 'pushRelayRegistrationId';
const FCM_TOKEN_KEY = 'pushRelayFcmToken';

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

/**
 * Subscribe to push notifications on a native Capacitor platform.
 *
 * 1. Requests notification permission
 * 2. Gets an FCM token from the OS
 * 3. Registers with the push relay → gets a Web Push–compatible endpoint
 * 4. Sends that endpoint to Mastodon via POST /api/v1/push/subscription
 */
export async function subToPushNative(): Promise<void> {
  console.log('[NativePush] Starting subscription...');

  // 1. Request permission
  let permResult = await PushNotifications.checkPermissions();
  console.log('[NativePush] Permission status:', permResult.receive);

  if (permResult.receive === 'prompt') {
    permResult = await PushNotifications.requestPermissions();
    console.log('[NativePush] Permission after request:', permResult.receive);
  }
  if (permResult.receive !== 'granted') {
    throw new Error('Push notification permission denied');
  }

  // 2. Register with the OS and get the FCM token.
  //    Await the addListener calls so Capacitor has fully wired them
  //    before we call register().
  const fcmToken = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('[NativePush] FCM registration timed out after 15s');
      reject(new Error('FCM registration timed out'));
    }, 15_000);

    let settled = false;

    const setup = async () => {
      await PushNotifications.addListener('registration', (token) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        console.log('[NativePush] FCM token received');
        resolve(token.value);
      });

      await PushNotifications.addListener('registrationError', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        console.error('[NativePush] FCM registration error:', err);
        reject(new Error(err.error || 'FCM registration failed'));
      });

      console.log('[NativePush] Listeners ready, calling register()...');
      await PushNotifications.register();
      console.log('[NativePush] register() returned');
    };

    setup().catch((err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });

  localStorage.setItem(FCM_TOKEN_KEY, fcmToken);
  console.log('[NativePush] FCM token stored, registering with relay...');

  // 3. Register with the relay
  const relayUrl = `${getRelayBaseUrl()}/pushRelay`;
  console.log('[NativePush] Registering with relay...');

  let relayResponse: Response;
  try {
    relayResponse = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', fcmToken }),
    });
  } catch (fetchErr) {
    console.error('[NativePush] Relay fetch failed:', fetchErr);
    throw fetchErr;
  }

  console.log('[NativePush] Relay response status:', relayResponse.status);

  if (!relayResponse.ok) {
    const errBody = await relayResponse.text().catch(() => '');
    console.error('[NativePush] Relay error body:', errBody);
    throw new Error(`Push relay registration failed: ${relayResponse.status}`);
  }

  const relay: {
    registrationId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } = await relayResponse.json();

  localStorage.setItem(RELAY_REGISTRATION_ID_KEY, relay.registrationId);

  // 4. Register the Web Push–compatible subscription with Mastodon
  const { url, accessToken } = getClientConfig();

  const mastodonResponse = await fetch(
    `https://${url}/api/v1/push/subscription`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: {
          endpoint: relay.endpoint,
          keys: {
            p256dh: relay.keys.p256dh,
            auth: relay.keys.auth,
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

  if (!mastodonResponse.ok) {
    throw new Error(
      `Mastodon push subscription failed: ${mastodonResponse.status}`
    );
  }

  console.log('[NativePush] Subscribed via relay', relay.registrationId);
}

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

export async function unsubToPushNative(): Promise<void> {
  const registrationId = localStorage.getItem(RELAY_REGISTRATION_ID_KEY);
  const { url, accessToken } = getClientConfig();

  // Delete from Mastodon
  try {
    await fetch(`https://${url}/api/v1/push/subscription`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    console.log('[NativePush] Mastodon unsub failed (may already be gone)');
  }

  // Delete from relay
  if (registrationId) {
    try {
      await fetch(`${getRelayBaseUrl()}/pushRelay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unregister',
          registrationId,
        }),
      });
    } catch {
      console.log('[NativePush] Relay unsub failed');
    }
    localStorage.removeItem(RELAY_REGISTRATION_ID_KEY);
  }

  localStorage.removeItem(FCM_TOKEN_KEY);

  await PushNotifications.removeAllListeners();
  console.log('[NativePush] Unsubscribed');
}

// ---------------------------------------------------------------------------
// Check subscription status
// ---------------------------------------------------------------------------

export function isNativePushSubscribed(): boolean {
  return !!localStorage.getItem(RELAY_REGISTRATION_ID_KEY);
}

// ---------------------------------------------------------------------------
// Notification target URL routing (mirrors src/sw/notifications.ts)
// ---------------------------------------------------------------------------

function getTargetUrl(data: Record<string, string>): string {
  if (!data?.notification_type || !data?.notification_id) {
    return '/home?tab=notifications';
  }

  switch (data.notification_type) {
    case 'mention':
    case 'reblog':
    case 'favourite':
    case 'poll':
    case 'status':
    case 'update':
      return `/post/notification?notification_id=${data.notification_id}`;
    case 'follow':
    case 'follow_request':
    case 'admin.sign_up':
    case 'admin.report':
      return '/home?tab=notifications';
    default:
      return '/home?tab=notifications';
  }
}

// ---------------------------------------------------------------------------
// Setup Listeners (call once at app startup on native)
// ---------------------------------------------------------------------------

/**
 * Attach listeners for incoming FCM push notifications and user taps.
 * Also handles FCM token refresh by re-registering with the relay.
 */
export function setupNativePushListeners(): void {
  // Foreground notification received
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[NativePush] Foreground notification received');

    const data = notification.data as Record<string, string> | undefined;
    if (!data) return;

    // Broadcast to the app — same message shape the service worker uses
    // so components like conversation-thread can react
    window.postMessage(
      {
        type: 'push-notification',
        notificationType: data.notification_type,
        notificationId: data.notification_id,
      },
      '*'
    );
  });

  // User tapped a notification
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    async (action) => {
      console.log('[NativePush] Notification tap');

      const data = action.notification.data as
        | Record<string, string>
        | undefined;
      const targetUrl = getTargetUrl(data || {});

      // Lazy-import router to avoid circular dependencies
      const { router } = await import('../router/routes');
      router.navigate(targetUrl);
    }
  );

  // FCM token refresh — re-register with relay + update Mastodon subscription.
  // Only acts when the user already has an active relay registration AND the
  // token actually changed (guards against the initial registration event
  // firing into this listener during subToPushNative).
  PushNotifications.addListener('registration', async (token) => {
    const previousToken = localStorage.getItem(FCM_TOKEN_KEY);
    const registrationId = localStorage.getItem(RELAY_REGISTRATION_ID_KEY);

    // Skip if this is the initial registration (no relay yet) or token unchanged
    if (!registrationId || token.value === previousToken) return;

    console.log('[NativePush] FCM token refreshed, re-registering');

    // Clean up old relay registration
    if (registrationId) {
      try {
        await fetch(`${getRelayBaseUrl()}/pushRelay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unregister',
            registrationId,
          }),
        });
      } catch {
        // Best effort
      }
      localStorage.removeItem(RELAY_REGISTRATION_ID_KEY);
    }

    // Re-subscribe with the new token
    try {
      await subToPushNative();
    } catch (err) {
      console.error(
        '[NativePush] Re-registration after token refresh failed',
        err
      );
    }
  });
}
