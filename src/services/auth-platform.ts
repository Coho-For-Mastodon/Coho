import { isNativePlatform } from '../utils/platform.js';

/**
 * Parsed OAuth callback parameters.
 */
export interface OAuthCallbackParams {
  code: string;
  state: string;
}

/**
 * Open the OAuth authorization URL in the appropriate context.
 *
 * - Web: navigates the current tab (`window.location.href`).
 * - Capacitor: opens a Chrome Custom Tab / SFSafariViewController
 *   via `@capacitor/browser` so the user stays in a system browser
 *   context (cookie jar, password manager, etc.).
 */
export async function openOAuthUrl(url: string): Promise<void> {
  if (isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    window.location.href = url;
  }
}

/**
 * Listen for an OAuth callback URL delivered via an App Link / Universal Link.
 *
 * Returns a promise that resolves with the parsed `code` and `state` when the
 * OS hands a matching URL back to the app. The listener is automatically
 * cleaned up after the first matching callback (or on `signal.abort()`).
 *
 * Only meaningful on Capacitor — on web the callback arrives via normal
 * navigation to `/auth/callback` and is handled by the route component.
 */
export function waitForNativeCallback(
  signal?: AbortSignal
): Promise<OAuthCallbackParams> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    let settled = false;

    Promise.all([import('@capacitor/app'), import('@capacitor/browser')]).then(
      async ([{ App }, { Browser }]) => {
        const appHandle = await App.addListener('appUrlOpen', ({ url }) => {
          const params = parseCallbackUrl(url);
          if (params && !settled) {
            settled = true;
            appHandle.remove();
            browserHandle.remove();
            Browser.close().catch(() => {});
            resolve(params);
          }
        });

        // If the user closes the browser without completing OAuth, reject.
        // A short delay avoids racing with appUrlOpen when an App Link
        // redirect also triggers browserFinished.
        const browserHandle = await Browser.addListener(
          'browserFinished',
          () => {
            setTimeout(() => {
              if (!settled) {
                settled = true;
                appHandle.remove();
                browserHandle.remove();
                reject(new DOMException('Browser closed', 'AbortError'));
              }
            }, 500);
          }
        );

        signal?.addEventListener(
          'abort',
          () => {
            if (!settled) {
              settled = true;
              appHandle.remove();
              browserHandle.remove();
              reject(new DOMException('Aborted', 'AbortError'));
            }
          },
          { once: true }
        );
      }
    );
  });
}

/**
 * Check if the app was cold-launched via a deep link that carries OAuth
 * callback parameters. Returns the params if present, otherwise `null`.
 *
 * Should be called once during app startup before the `appUrlOpen` listener
 * is registered, because cold-launch URLs are only available via
 * `App.getLaunchUrl()` and are NOT re-delivered as `appUrlOpen` events.
 */
export async function consumeLaunchCallback(): Promise<OAuthCallbackParams | null> {
  if (!isNativePlatform()) return null;

  const { App } = await import('@capacitor/app');
  const result = await App.getLaunchUrl();
  if (!result?.url) return null;
  return parseCallbackUrl(result.url);
}

/**
 * Parse an OAuth callback URL and extract `code` and `state` params.
 * Returns `null` if the URL doesn't match the expected callback path.
 */
function parseCallbackUrl(url: string): OAuthCallbackParams | null {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith('/auth/callback')) return null;
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (code && state) return { code, state };
    return null;
  } catch {
    return null;
  }
}
