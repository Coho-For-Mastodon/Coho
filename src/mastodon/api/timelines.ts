import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import { Post, TrendingTag, TrendingLink } from '../types';

// Cache for reply parent posts to avoid duplicate fetches
const replyParentCache = new Map<string, Post>();

/**
 * Direct API call to get a status
 */
const getAStatusDirect = async (id: string): Promise<Post | null> => {
  try {
    const { url } = getClientConfig();

    const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
      method: 'GET',
      // Don't trigger logout on 404/403 for status fetches
      handleUnauthorized: false,
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching status:', err);
    return null;
  }
};

/**
 * Enriches posts that are replies with their parent post data.
 * This allows the timeline to show thread context for reply posts.
 * Also filters out standalone posts that will be shown as reply_to context
 * to avoid duplicate display.
 */
export const enrichPostsWithReplyContext = async (
  posts: Post[]
): Promise<Post[]> => {
  // Find posts that are replies and need their parent fetched
  const postsNeedingParent = posts.filter(
    (post) => post.in_reply_to_id && !post.reply_to
  );

  if (postsNeedingParent.length === 0) {
    return posts;
  }

  // Get unique parent IDs that aren't already cached
  const parentIds = [
    ...new Set(
      postsNeedingParent
        .map((p) => p.in_reply_to_id)
        .filter((id): id is string => id !== null && !replyParentCache.has(id))
    ),
  ];

  // Fetch parent posts in parallel (limit concurrent requests)
  const batchSize = 5;
  for (let i = 0; i < parentIds.length; i += batchSize) {
    const batch = parentIds.slice(i, i + batchSize);
    const fetchPromises = batch.map(async (id) => {
      try {
        const parentPost = await getAStatusDirect(id);
        if (parentPost && parentPost.id) {
          replyParentCache.set(id, parentPost);
        }
      } catch (error) {
        console.warn(`Failed to fetch parent post ${id}:`, error);
      }
    });
    await Promise.all(fetchPromises);
  }

  // Collect all parent IDs that will be shown as reply_to context
  const parentIdsBeingShown = new Set<string>();
  for (const post of posts) {
    if (post.in_reply_to_id) {
      const parent = post.reply_to || replyParentCache.get(post.in_reply_to_id);
      if (parent) {
        parentIdsBeingShown.add(post.in_reply_to_id);
      }
    }
  }

  // Enrich posts with their parent data and filter out duplicates
  return posts
    .map((post) => {
      if (post.in_reply_to_id && !post.reply_to) {
        const parent = replyParentCache.get(post.in_reply_to_id);
        if (parent) {
          return { ...post, reply_to: parent };
        }
      }
      return post;
    })
    .filter((post) => {
      // Filter out posts that will be shown as reply_to context of another post
      // This prevents showing the same post twice (once standalone, once as context)
      return !parentIdsBeingShown.has(post.id);
    });
};

/**
 * Groups self-reply chains (same author replying to themselves) into a single
 * timeline item using the `thread_continuation` field. This matches the
 * official Mastodon app behavior where self-threads appear as connected posts
 * with a vertical line between avatars.
 *
 * Uses a parent→child map so ordering (reverse-chronological or otherwise)
 * does not matter. Chains are capped at 3 visible posts (root + 2
 * continuations). When truncated, `thread_truncated` is set on the root.
 */
export const groupSelfThreads = (posts: Post[]): Post[] => {
  if (posts.length === 0) return posts;

  // Build a map of post ID → post for quick lookup
  const postMap = new Map<string, Post>();
  for (const post of posts) {
    postMap.set(post.id, post);
  }

  // Build a parent → child map for self-replies within this batch.
  // A self-reply: child.in_reply_to_id === parent.id, both same author,
  // and parent exists in this batch.
  const childOf = new Map<string, string>(); // child id → parent id
  for (const post of posts) {
    if (post.in_reply_to_id) {
      const parent = postMap.get(post.in_reply_to_id);
      if (parent && parent.account.id === post.account.id) {
        childOf.set(post.id, parent.id);
      }
    }
  }

  // Identify roots: posts that are NOT a child of another post in the batch
  // (i.e. they don't appear as a key in childOf, or their parent isn't in batch)
  const nonRoots = new Set(childOf.keys());

  // Build parent → child reverse map for walking chains forward
  const parentToChild = new Map<string, string>();
  for (const [child, parent] of childOf) {
    parentToChild.set(parent, child);
  }

  // Track consumed post IDs (posts that became continuations of a root)
  const consumed = new Set<string>();
  const result: Post[] = [];

  // Walk posts in original order to preserve timeline ordering
  for (const post of posts) {
    if (consumed.has(post.id)) continue;

    // Only start a chain from a root (a post that is not a child of another
    // post within this batch)
    if (nonRoots.has(post.id)) {
      // Not a root — it will be consumed by its parent's chain.
      // But only if the parent is actually in the batch and will be processed.
      // If somehow the parent was already consumed or missing, emit standalone.
      const parentId = childOf.get(post.id);
      if (parentId && postMap.has(parentId) && !consumed.has(parentId)) {
        continue; // will be consumed when parent is processed
      }
      // Otherwise treat as standalone / orphan root
    }

    // Walk the chain forward: root → child → grandchild → ...
    const chain: Post[] = [];
    let currentId: string | undefined = post.id;
    while (currentId) {
      const nextChildId = parentToChild.get(currentId);
      if (nextChildId && !consumed.has(nextChildId)) {
        chain.push(postMap.get(nextChildId)!);
        consumed.add(nextChildId);
        currentId = nextChildId;
      } else {
        currentId = undefined;
      }
    }

    if (chain.length > 0) {
      const MAX_CONTINUATIONS = 2; // root + 2 = 3 total visible posts
      const truncated = chain.length > MAX_CONTINUATIONS;
      const visibleContinuation = truncated
        ? chain.slice(0, MAX_CONTINUATIONS)
        : chain;

      result.push({
        ...post,
        thread_continuation: visibleContinuation,
        thread_truncated: truncated,
      });
    } else {
      result.push(post);
    }
  }

  return result;
};

export const getHomeTimeline = async (
  maxId?: string,
  sinceId?: string
): Promise<Post[]> => {
  const { url } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/home?limit=20`;

  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }
  if (sinceId) {
    fetchUrl += `&since_id=${sinceId}`;
  }

  const response = await apiFetch(fetchUrl, {
    method: 'GET',
  });

  const data = await response.json();
  return enrichPostsWithReplyContext(data);
};

export const getPublicTimeline = async (
  local: boolean = false,
  maxId?: string
): Promise<Post[]> => {
  const { url } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/public?limit=20`;

  if (local) {
    fetchUrl += '&local=true';
  }
  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }

  const response = await apiFetch(fetchUrl, {
    method: 'GET',
  });

  const data = await response.json();
  return enrichPostsWithReplyContext(data);
};

/**
 * Get the preview/federated timeline (unauthenticated)
 * Uses the trending statuses endpoint which does not require authentication,
 * since many servers (including mastodon.social) now require auth for /api/v1/timelines/public.
 */
export const getPreviewTimeline = async (_maxId?: string): Promise<Post[]> => {
  const fetchUrl = 'https://mastodon.social/api/v1/trends/statuses?limit=20';

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.warn('Preview timeline fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Preview timeline network error:', err);
    return [];
  }
};

/**
 * Get trending statuses
 */
export const getTrendingStatuses = async (): Promise<Post[]> => {
  const { url } = getClientConfig();

  const response = await apiFetch(`https://${url}/api/v1/trends/statuses`, {
    method: 'GET',
  });

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Get trending tags
 */
export const getTrendingTags = async (): Promise<TrendingTag[]> => {
  const { url } = getClientConfig();

  const response = await apiFetch(`https://${url}/api/v1/trends/tags`, {
    method: 'GET',
  });

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Get trending links
 */
export const getTrendingLinks = async (): Promise<TrendingLink[]> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/trends/links?limit=10`,
    {
      method: 'GET',
    }
  );

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Get hashtag timeline
 */
export const getHashtagTimeline = async (
  hashtag: string,
  maxId?: string
): Promise<Post[]> => {
  const { url } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/tag/${hashtag}`;

  if (maxId) {
    fetchUrl += `?max_id=${maxId}`;
  }

  const response = await apiFetch(fetchUrl, {
    method: 'GET',
  });

  const data = await response.json();
  return data;
};

/**
 * Get a specific status by ID
 */
export const getStatus = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'GET',
  });

  const data = await response.json();
  return data;
};

/**
 * Get status context (ancestors and descendants)
 */
export const getStatusContext = async (
  id: string
): Promise<{ ancestors: Post[]; descendants: Post[] }> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/context`,
    {
      method: 'GET',
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Boost/favorite a post
 */
export const favoritePost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/favourite`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Unfavorite a post
 */
export const unfavoritePost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/unfavourite`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Reblog a post
 */
export const reblogPost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/reblog`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Unreblog a post
 */
export const unreblogPost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/unreblog`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Bookmark a post
 */
export const bookmarkPost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/bookmark`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Unbookmark a post
 */
export const unbookmarkPost = async (id: string): Promise<Post> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/unbookmark`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};

/**
 * Get user's media timeline
 */
export const getMediaTimeline = async (userId?: string): Promise<Post[]> => {
  const { url } = getClientConfig();
  const currentUser = userId || localStorage.getItem('currentUserID');

  const response = await apiFetch(
    `https://${url}/api/v1/accounts/${currentUser}/statuses?only_media=true&limit=40`,
    { method: 'GET' }
  );

  const data = await response.json();
  return data;
};

/**
 * Save marker for last read position
 */
export const saveMarker = async (
  lastReadId: string
): Promise<Record<string, unknown>> => {
  const { url } = getClientConfig();

  const formData = new FormData();
  formData.append('home[last_read_id]', lastReadId);

  const response = await apiFetch(`https://${url}/api/v1/markers`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
};

/**
 * Get markers for last read position
 */
export const getMarkers = async (): Promise<Record<string, unknown>> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/markers?timeline[]=home`,
    { method: 'GET' }
  );

  const data = await response.json();
  return data;
};
