/**
 * Verify the browser's push subscription endpoint matches what Mastodon has.
 * If they differ (e.g. the browser rotated the endpoint while the SW handler
 * failed or wasn't supported), re-POST the current subscription to Mastodon.
 */
export async function verifyPushSubscription() {
  try {
    const { isNativePlatform } = await import('./platform.js');
    if (isNativePlatform()) return;

    const reg = await navigator.serviceWorker.getRegistration();
    const browserSub = await reg?.pushManager.getSubscription();
    if (!browserSub) return; // Not subscribed — nothing to verify

    const { getPushSubscription } = await import('../services/notifications');
    const serverSub = await getPushSubscription();
    if (!serverSub) return; // No server subscription — user may not have set up push

    if (browserSub.endpoint !== serverSub.endpoint) {
      // Push endpoint mismatch — re-sync with server
      const { getClientConfig } = await import('../mastodon/config/client');
      const { url, accessToken } = getClientConfig();
      const subJSON = browserSub.toJSON();

      await fetch(`https://${url}/api/v1/push/subscription`, {
        method: 'POST',
        headers: new Headers({
          'Authorization': `Bearer ${accessToken}`,
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
            alerts: serverSub.alerts,
            policy: serverSub.policy || 'all',
          },
        }),
      });
      // re-sync successful
    }
  } catch (error) {
    // Non-critical — log and continue
    console.warn('[App] Push subscription verification failed:', error);
  }
}
