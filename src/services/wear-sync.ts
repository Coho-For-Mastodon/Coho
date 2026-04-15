/**
 * Pushes auth credentials to a paired Wear OS watch via the
 * WearSyncBridge Capacitor plugin so the watch can independently
 * call the Mastodon API.
 *
 * Returns true if sync succeeded, false otherwise.
 */
export async function syncCredentialsToWearOS(): Promise<boolean> {
  try {
    const { isNativePlatform } = await import('../utils/platform.js');
    if (!isNativePlatform()) return false;

    const { registerPlugin } = await import('@capacitor/core');
    const WearSyncBridge = registerPlugin('WearSyncBridge');
    const server = localStorage.getItem('server') || '';
    const accessToken = localStorage.getItem('accessToken') || '';
    const acct = localStorage.getItem('acct') || '';
    if (!server || !accessToken) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (WearSyncBridge as any).syncCredentials({
      server,
      accessToken,
      acct,
    });
    return true;
  } catch {
    // Wear sync bridge not available
    return false;
  }
}
