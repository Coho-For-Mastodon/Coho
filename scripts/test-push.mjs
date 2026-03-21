/**
 * Quick script to send a test FCM push notification.
 * Run with: node scripts/test-push.mjs
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a
 * Firebase service account key JSON file, OR run from a machine
 * authenticated with `gcloud auth application-default login`.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// ── Config ──────────────────────────────────────────────────────
// Paste the FCM token from your device/emulator logs here:
const FCM_TOKEN =
  'cwLimXX-QJ2ku6R8dtYZQr:APA91bEZ-NHZIEph_KKpEamRXC0GvsdHnIUdLm2GKzAreL5m3VDx616oz5sE9ET6aTbIheKo0AGrSGIPHYnOXA2R0oDtzI6dOU4PvIweA2SclEg5rSkDcgk';

// ── Init Firebase Admin ─────────────────────────────────────────
if (!getApps().length) {
  initializeApp({ projectId: 'coho-mastodon' });
}

// ── Send test message ───────────────────────────────────────────
// This mimics the exact data payload the push relay sends after
// decrypting a Mastodon Web Push notification.
const message = {
  token: FCM_TOKEN,
  data: {
    title: 'Test User mentioned you',
    body: 'Hey! This is a test notification from the push relay.',
    notification_id: '12345',
    notification_type: 'mention',
    icon: '',
    access_token: '',
    preferred_locale: 'en',
  },
  android: {
    priority: 'high',
  },
};

try {
  const messageId = await getMessaging().send(message);
  console.log('✅ Message sent successfully:', messageId);
} catch (error) {
  console.error('❌ Failed to send:', error.message);
  if (error.message.includes('credential')) {
    console.log(
      '\nMake sure you are authenticated. Run:\n' +
        '  gcloud auth application-default login\n' +
        'Or set GOOGLE_APPLICATION_CREDENTIALS to a service account key.'
    );
  }
}
