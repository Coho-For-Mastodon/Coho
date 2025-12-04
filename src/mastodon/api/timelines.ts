import { getClientConfig } from '../config/client';
import { Post, TrendingTag, TrendingLink } from '../types';

// Cache for reply parent posts to avoid duplicate fetches
const replyParentCache = new Map<string, Post>();

/**
 * Direct API call to get a status
 */
const getAStatusDirect = async (id: string): Promise<Post | null> => {
  try {
    const { url, accessToken } = getClientConfig();

    const response = await fetch(`https://${url}/api/v1/statuses/${id}`, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    });

    if (!response.ok) {
      return null;
    }

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

export const getHomeTimeline = async (
  maxId?: string,
  sinceId?: string
): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/home?limit=20`;

  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }
  if (sinceId) {
    fetchUrl += `&since_id=${sinceId}`;
  }

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return enrichPostsWithReplyContext(data);
};

export const getPublicTimeline = async (
  local: boolean = false,
  maxId?: string
): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/public?limit=20`;

  if (local) {
    fetchUrl += '&local=true';
  }
  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return enrichPostsWithReplyContext(data);
};

/**
 * Get the preview/federated timeline (unauthenticated)
 */
export const getPreviewTimeline = async (maxId?: string): Promise<Post[]> => {
  let fetchUrl = 'https://mastodon.social/api/v1/timelines/public?limit=10';

  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }

  const response = await fetch(fetchUrl);
  const data = await response.json();
  return data;
};

/**
 * Get trending statuses
 */
export const getTrendingStatuses = async (): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/trends/statuses`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Get trending tags
 */
export const getTrendingTags = async (): Promise<TrendingTag[]> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/trends/tags`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Get trending links
 */
export const getTrendingLinks = async (): Promise<TrendingLink[]> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/trends/links?limit=10`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Get hashtag timeline
 */
export const getHashtagTimeline = async (
  hashtag: string,
  maxId?: string
): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/tag/${hashtag}`;

  if (maxId) {
    fetchUrl += `?max_id=${maxId}`;
  }

  const response = await fetch(fetchUrl, {
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Get a specific status by ID
 */
export const getStatus = async (id: string): Promise<Post> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
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
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/statuses/${id}/context`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Boost/favorite a post
 */
export const favoritePost = async (id: string): Promise<Post> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/favourite`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/unfavourite`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
  const { url, accessToken } = getClientConfig();

  const response = await fetch(`https://${url}/api/v1/statuses/${id}/reblog`, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

/**
 * Unreblog a post
 */
export const unreblogPost = async (id: string): Promise<Post> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/unreblog`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/bookmark`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/unbookmark`,
    {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
  const { url, accessToken } = getClientConfig();
  const currentUser = userId || localStorage.getItem('currentUserID');

  const response = await fetch(
    `https://${url}/api/v1/accounts/${currentUser}/statuses?only_media=true&limit=40`,
    {
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
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
  const { url, accessToken } = getClientConfig();

  const formData = new FormData();
  formData.append('home[last_read_id]', lastReadId);

  const response = await fetch(`https://${url}/api/v1/markers`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
};

/**
 * Get markers for last read position
 */
export const getMarkers = async (): Promise<Record<string, unknown>> => {
  const { url, accessToken } = getClientConfig();

  const response = await fetch(
    `https://${url}/api/v1/markers?timeline[]=home`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  const data = await response.json();
  return data;
};
