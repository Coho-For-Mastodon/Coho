import { set } from 'idb-keyval';
import { getUsersPosts } from './account';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import { Post } from '../interfaces/Post';

import {
  getPublicTimeline as mastodonGetPublicTimeline,
  getPreviewTimeline as mastodonGetPreviewTimeline,
  getTrendingStatuses as mastodonGetTrendingStatuses,
  getTrendingTags as mastodonGetTrendingTags,
  getTrendingLinks as mastodonGetTrendingLinks,
  getHashtagTimeline as mastodonGetHashtagTimeline,
  getStatus as mastodonGetStatus,
  getMediaTimeline as mastodonGetMediaTimeline,
  enrichPostsWithReplyContext as mastodonEnrichPostsWithReplyContext,
  groupSelfThreads as mastodonGroupSelfThreads,
  unfavoritePost as mastodonUnfavoritePost,
  unreblogPost as mastodonUnreblogPost,
} from '../mastodon/api/timelines';

// Re-export enrichPostsWithReplyContext with proper typing for backwards compatibility
export const enrichPostsWithReplyContext = async (
  posts: Post[]
): Promise<Post[]> => {
  return mastodonEnrichPostsWithReplyContext(posts);
};

// Re-export groupSelfThreads for thread grouping in timelines
export const groupSelfThreads = (posts: Post[]): Post[] => {
  return mastodonGroupSelfThreads(posts);
};

// Re-export type
export type { Post };

import { apiFetch, buildMastodonUrl } from '../utils/api-client';

// timeline.ts uses mastodon.social as fallback for preview/guest mode
const getServer = () => localStorage.getItem('server') || 'mastodon.social';
const getAccessToken = () => localStorage.getItem('accessToken') || '';

// Pagination state - scoped per timeline type to prevent cross-contamination
const lastPageIDs = new Map<string, string>();
let lastPreviewPageID = '';

/** Get the lastPageID for a specific timeline type */
const getLastPageID = (type = 'home'): string => lastPageIDs.get(type) || '';

/** Set the lastPageID for a specific timeline type */
const setLastPageID = (type: string, id: string): void => {
  lastPageIDs.set(type, id);
};

export const getHomeTimeline = async (): Promise<Post[]> => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getTimelinePaginated`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, server }),
      skipAuth: true,
    }
  );
  return response.json();
};

export const mixTimeline = async (type = 'home'): Promise<Post[]> => {
  // run getPaginatedHomeTimeline and getTrendingStatuses in parallel
  const [homeResult, trendingResult, searchedResult] = await Promise.allSettled(
    [
      getPaginatedHomeTimeline(type),
      getTrendingStatuses(),
      addSomeInterestFinds(),
    ]
  );

  // Extract successful results as arrays, fallback to empty array on failure
  const home =
    homeResult.status === 'fulfilled' && Array.isArray(homeResult.value)
      ? homeResult.value
      : [];
  const trending =
    trendingResult.status === 'fulfilled' && Array.isArray(trendingResult.value)
      ? trendingResult.value
      : [];
  const searched =
    searchedResult.status === 'fulfilled' && Array.isArray(searchedResult.value)
      ? searchedResult.value
      : [];

  const timeline = home.concat(trending);
  const timeline2 = timeline.concat(searched);

  set('latest-mixed-timeline', timeline2);

  return timeline2;
};

export const addSomeInterestFinds = async (): Promise<Post[]> => {
  const { get } = await import('idb-keyval');
  const interests = await get('interests');

  if (interests && interests.length > 0) {
    const interest = interests[Math.floor(Math.random() * interests.length)];

    const accessToken = getAccessToken();
    const url = buildMastodonUrl('/api/v2/search', {
      q: interest,
      resolve: true,
      limit: 5,
      type: 'accounts',
    });

    const response = await apiFetch(url, {
      skipAuth: !accessToken,
    });
    const data = await response.json();

    if (data.accounts && data.accounts.length > 0) {
      // get statuses from account
      const account =
        data.accounts[Math.floor(Math.random() * data.accounts.length)];

      // get posts from account
      const posts = await getUsersPosts(account.id);

      return posts.slice(0, 5);
    } else {
      return [];
    }
  } else {
    return [];
  }
};

// Wrapper for preview timeline with pagination state
export const getPreviewTimeline = async (): Promise<Post[]> => {
  const data = await mastodonGetPreviewTimeline(lastPreviewPageID || undefined);

  // Validate response is an array
  if (!Array.isArray(data)) {
    console.warn('getPreviewTimeline: Invalid response, expected array', data);
    return [];
  }

  if (data.length > 0) {
    lastPreviewPageID = data[data.length - 1].id;
  }

  return data;
};

// Re-export trending functions from mastodon library
export const getTrendingLinks = mastodonGetTrendingLinks;
export const getTrendingStatuses = mastodonGetTrendingStatuses;
export const getTrendingTags = mastodonGetTrendingTags;

export const resetLastPageID = (type?: string): Promise<void> => {
  return new Promise((resolve) => {
    if (type) {
      lastPageIDs.delete(type);
    } else {
      lastPageIDs.clear();
    }
    resolve();
  });
};

export const getPaginatedHomeTimeline = async (
  type = 'home',
  maxId?: string
): Promise<Post[]> => {
  try {
    handlePeriodic();
  } catch {
    // Periodic sync registration is best-effort
  }

  const accessToken = getAccessToken();

  // Normalize type
  if (type === 'for you') {
    type = 'home';
  }

  // Use provided maxId, fall back to lastPageID for this type, or fetch from beginning
  const effectiveMaxId = maxId || getLastPageID(type);
  const params: Record<string, string | number | boolean | undefined> = {
    limit: 10,
  };
  if (effectiveMaxId && effectiveMaxId.length > 0) {
    params.max_id = effectiveMaxId;
  }

  const url = buildMastodonUrl(`/api/v1/timelines/${type}`, params);
  const response = await apiFetch(url, {
    skipAuth: !accessToken,
  });

  const data = await response.json();

  if (data.length > 0) {
    setLastPageID(type, data[data.length - 1].id);
  }

  return data;
};

/**
 * Prefetch the next page of timeline data.
 * This is a fire-and-forget operation - the SW will cache the response.
 * Does not update lastPageID to avoid interfering with normal pagination.
 */
export const prefetchNextPage = (maxId: string, type = 'home'): void => {
  if (type.startsWith('list:')) {
    return;
  }

  const url = buildMastodonUrl(`/api/v1/timelines/${type}`, {
    limit: 10,
    max_id: maxId,
  });

  // Fire-and-forget fetch - SW will cache the response
  apiFetch(url, {
    priority: 'low' as RequestPriority,
  }).catch(() => {
    // Silently ignore prefetch errors
  });
};

// Use mastodon library's getPublicTimeline
export const getPublicTimeline = async (
  local: boolean = false,
  maxId?: string
): Promise<Post[]> => {
  return mastodonGetPublicTimeline(local, maxId);
};

// Use Firebase function for boostPost (favorite) - this route has background sync support
export const boostPost = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  // Use Firebase function URL so service worker can queue for background sync when offline
  const response = await apiFetch(`${FIREBASE_FUNCTIONS_BASE_URL}/boost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server, id }),
    skipAuth: true,
  });
  return response.json();
};

export const unboostPost = async (id: string) => {
  return mastodonUnfavoritePost(id);
};

// Use mastodon library's reblogPost but with Firebase fallback
export const reblogPost = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(`${FIREBASE_FUNCTIONS_BASE_URL}/reblog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server, id }),
    skipAuth: true,
  });
  return response.json();
};

export const unreblogPost = async (id: string) => {
  return mastodonUnreblogPost(id);
};

// Use Firebase function for getReplies
export const getReplies = async (
  id: string
): Promise<{ ancestors: Post[]; descendants: Post[] }> => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(`${FIREBASE_FUNCTIONS_BASE_URL}/getReplies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server, id }),
    skipAuth: true,
  });
  return response.json();
};

export const reply = async (id: string, replyContent: string) => {
  const formData = new FormData();
  formData.append('status', replyContent);
  formData.append('in_reply_to_id', id);

  const url = buildMastodonUrl('/api/v1/statuses');
  const response = await apiFetch(url, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

/**
 * Vote in a poll.
 * Mastodon API: POST /api/v1/polls/:id/votes
 */
export const votePoll = async (
  pollId: string,
  choices: number[]
): Promise<NonNullable<Post['poll']>> => {
  const formData = new FormData();
  for (const choice of choices) {
    formData.append('choices[]', String(choice));
  }

  const url = buildMastodonUrl(`/api/v1/polls/${pollId}/votes`);
  const response = await apiFetch(url, {
    method: 'POST',
    body: formData,
  });

  return response.json();
};

// Use mastodon library's getMediaTimeline
export const mediaTimeline = mastodonGetMediaTimeline;

export const searchTimeline = async (query: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(`${FIREBASE_FUNCTIONS_BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server, query }),
    skipAuth: true,
  });
  return response.json();
};

// Use mastodon library's getHashtagTimeline
export const getHashtagTimeline = mastodonGetHashtagTimeline;

// Use mastodon library's getStatus
export const getAStatus = mastodonGetStatus;

async function handlePeriodic(): Promise<unknown> {
  const registration: ServiceWorkerRegistration =
    await navigator.serviceWorker.ready;
  if ('periodicSync' in registration) {
    try {
      const tags = await registration.periodicSync.getTags();

      if (tags.includes('timeline-sync') === false) {
        await registration.periodicSync.register('timeline-sync', {
          // An interval of one day.
          minInterval: 24 * 60 * 60 * 1000,
        });
      }
    } catch (error) {
      // Periodic background sync cannot be used.
      return error;
    }
  }
  return undefined;
}
