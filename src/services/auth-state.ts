/**
 * Auth state utilities for managing guest mode and authentication state
 */

// Default server for guest mode (unauthenticated browsing)
const GUEST_SERVER = 'mastodon.social';

/**
 * Check if the user is in guest mode (not authenticated)
 */
export function isGuestMode(): boolean {
  const accessToken = localStorage.getItem('accessToken');
  return !accessToken || accessToken.length === 0;
}

/**
 * Get the server URL to use. For guests, returns mastodon.social.
 * For authenticated users, returns their configured server.
 */
export function getGuestServer(): string {
  return GUEST_SERVER;
}

/**
 * Get the effective server - uses user's server if authenticated,
 * otherwise falls back to guest server
 */
export function getEffectiveServer(): string {
  const userServer = localStorage.getItem('server');
  if (userServer && !isGuestMode()) {
    return userServer;
  }
  return GUEST_SERVER;
}

/**
 * Enter guest mode - sets up localStorage for guest browsing
 */
export function enterGuestMode(): void {
  // Clear any stale auth tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  // Set the server to guest server for public API calls
  localStorage.setItem('server', GUEST_SERVER);
  localStorage.setItem('guestMode', 'true');
}

/**
 * Exit guest mode (called when user logs in)
 */
export function exitGuestMode(): void {
  localStorage.removeItem('guestMode');
}

/**
 * Check if explicitly in guest mode (vs just not logged in)
 */
export function isExplicitGuestMode(): boolean {
  return localStorage.getItem('guestMode') === 'true';
}
