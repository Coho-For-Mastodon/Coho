/**
 * Utilities for preserving intended navigation destination through OAuth flow.
 *
 * When a user initiates login from a page with intent params (e.g., /home?tab=notifications),
 * the OAuth redirect to the identity provider and back will lose those params.
 * This module stores the intended destination in localStorage so it survives the redirect.
 */

const REDIRECT_KEY = 'coho:authRedirect';

/**
 * Store the intended redirect destination before starting OAuth flow.
 * Call this before redirecting to the OAuth provider.
 *
 * @param url - The full path with query params to redirect to after auth (e.g., "/home?tab=notifications")
 */
export function setAuthRedirect(url: string): void {
  try {
    localStorage.setItem(REDIRECT_KEY, url);
  } catch {
    // localStorage may be unavailable in some privacy contexts; ignore.
  }
}

/**
 * Get and consume the stored redirect destination after OAuth completes.
 * Returns the stored URL and removes it from storage (one-time use).
 *
 * @returns The stored redirect URL, or null if none was stored
 */
export function consumeAuthRedirect(): string | null {
  try {
    const url = localStorage.getItem(REDIRECT_KEY);
    if (url) {
      localStorage.removeItem(REDIRECT_KEY);
    }
    return url;
  } catch {
    // localStorage may be unavailable in some privacy contexts; ignore.
    return null;
  }
}

/**
 * Check if there's a pending auth redirect without consuming it.
 */
export function hasAuthRedirect(): boolean {
  try {
    return localStorage.getItem(REDIRECT_KEY) !== null;
  } catch {
    return false;
  }
}
