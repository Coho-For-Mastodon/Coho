/**
 * Syncable Request Patterns
 *
 * Mastodon API paths that should be queued for background sync when offline.
 * These are mutation endpoints (POST/PUT/DELETE) that modify user data.
 *
 * This module is Coho/Mastodon-specific. The background-sync module is generic.
 */

/**
 * Mastodon API mutation patterns. Each regex matches a pathname that represents
 * a state-changing operation on the Mastodon server.
 */
export const SYNCABLE_PATTERNS: ReadonlyArray<RegExp> = [
  /\/api\/v1\/statuses$/, // Create post
  /\/api\/v1\/statuses\/\d+$/, // Edit/delete post
  /\/api\/v1\/statuses\/\d+\/favourite$/, // Favorite
  /\/api\/v1\/statuses\/\d+\/unfavourite$/, // Unfavorite
  /\/api\/v1\/statuses\/\d+\/reblog$/, // Reblog/boost
  /\/api\/v1\/statuses\/\d+\/unreblog$/, // Unreblog
  /\/api\/v1\/statuses\/\d+\/bookmark$/, // Bookmark
  /\/api\/v1\/statuses\/\d+\/unbookmark$/, // Unbookmark
  /\/api\/v1\/statuses\/\d+\/pin$/, // Pin
  /\/api\/v1\/statuses\/\d+\/unpin$/, // Unpin
  /\/api\/v1\/statuses\/\d+\/mute$/, // Mute conversation
  /\/api\/v1\/statuses\/\d+\/unmute$/, // Unmute conversation
  /\/api\/v1\/accounts\/\d+\/follow$/, // Follow
  /\/api\/v1\/accounts\/\d+\/unfollow$/, // Unfollow
  /\/api\/v1\/accounts\/\d+\/block$/, // Block
  /\/api\/v1\/accounts\/\d+\/unblock$/, // Unblock
  /\/api\/v1\/accounts\/\d+\/mute$/, // Mute account
  /\/api\/v1\/accounts\/\d+\/unmute$/, // Unmute account
  /\/api\/v1\/polls\/\d+\/votes$/, // Vote in poll
  /\/api\/v1\/notifications\/clear$/, // Clear notifications
  /\/api\/v1\/notifications\/\d+\/dismiss$/, // Dismiss notification
];

/**
 * Check if a request URL matches a syncable Mastodon API pattern.
 * GET requests are never syncable (they don't mutate data).
 */
export function isSyncableRequest(url: URL, method: string): boolean {
  if (method === 'GET') return false;
  return SYNCABLE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}
