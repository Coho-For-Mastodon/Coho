import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { TagInfo } from '../types/tag';

/**
 * Get information about a single hashtag, including whether the
 * current user is following it.
 * @see https://docs.joinmastodon.org/methods/tags/#get
 */
export async function getTag(name: string): Promise<TagInfo> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/tags/${encodeURIComponent(name)}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch tag: ${response.status}`);
  }
  return response.json();
}

/**
 * Follow a hashtag so its posts appear in the home timeline.
 * @see https://docs.joinmastodon.org/methods/tags/#follow
 */
export async function followTag(name: string): Promise<TagInfo> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/tags/${encodeURIComponent(name)}/follow`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error(`Failed to follow tag: ${response.status}`);
  }
  return response.json();
}

/**
 * Unfollow a hashtag.
 * @see https://docs.joinmastodon.org/methods/tags/#unfollow
 */
export async function unfollowTag(name: string): Promise<TagInfo> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/tags/${encodeURIComponent(name)}/unfollow`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error(`Failed to unfollow tag: ${response.status}`);
  }
  return response.json();
}

/**
 * List all hashtags the current user follows.
 * Supports Link-header pagination; returns the raw response for
 * callers that need the headers.
 * @see https://docs.joinmastodon.org/methods/followed_tags/#get
 */
export async function getFollowedTags(): Promise<TagInfo[]> {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/followed_tags`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch followed tags: ${response.status}`);
  }
  return response.json();
}
