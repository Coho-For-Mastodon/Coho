import { set } from 'idb-keyval';
import { getUsersPosts } from './account';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import { Post } from '../interfaces/Post';

// Helper functions to always get fresh values from localStorage
const getToken = () => localStorage.getItem('token') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const getServer = () => localStorage.getItem('server') || 'mastodon.social';

// Cache for reply parent posts to avoid duplicate fetches
const replyParentCache = new Map<string, Post>();

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
 * Direct API call to get a status without going through Firebase functions
 */
const getAStatusDirect = async (id: string): Promise<Post | null> => {
  try {
    const currentAccessToken = localStorage.getItem('accessToken') || '';
    const currentServer = localStorage.getItem('server') || 'mastodon.social';

    const response = await fetch(
      `https://${currentServer}/api/v1/statuses/${id}`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${currentAccessToken}`,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Error fetching status ${id}:`, error);
    return null;
  }
};

// when the app unloads, call savePlace
window.addEventListener('beforeunload', async () => {
  await savePlace(lastPageID);
});

let savePlaceRunningFlag = true;

setInterval(() => {
  savePlaceRunningFlag = false;
}, 3000);

export const savePlace = async (id: string) => {
  console.log('intersected 3');
  if (savePlaceRunningFlag === true) {
    return;
  }

  savePlaceRunningFlag = true;

  const formData = new FormData();
  formData.append('home[last_read_id]', id);

  const accessToken = getAccessToken();
  const server = getServer();

  const response = await fetch(`https://${server}/api/v1/markers`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();

  lastPageID = data[data.length - 1].home.last_read_id;
  console.log('saving place ran', lastPageID);

  console.log('saving place ran');
};

export const getHomeTimeline = async (): Promise<Post[]> => {
  const token = getToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getTimelinePaginated?code=${token}&server=${server}`
  );
  const data = await response.json();
  return data;
};

let lastPageID = '';
let lastPreviewPageID = '';

export const mixTimeline = async (type = 'home'): Promise<Post[]> => {
  // const home = await getPaginatedHomeTimeline(type);
  // const trending = await getTrendingStatuses();

  // run getPaginatedHomeTimeline and getTrendingStatuses in parallel
  const [home, trending, searched] = await Promise.all([
    getPaginatedHomeTimeline(type),
    getTrendingStatuses(),
    addSomeInterestFinds(),
  ]);

  const timeline = home.concat(trending);
  const timeline2 = timeline.concat(searched);

  set('latest-mixed-timeline', timeline2);

  return timeline2;
};

export const addSomeInterestFinds = async () => {
  const { get } = await import('idb-keyval');
  const interests = await get('interests');

  if (interests && interests.length > 0) {
    const interest = interests[Math.floor(Math.random() * interests.length)];

    const accessToken = getAccessToken();
    const server = getServer();
    const headers = new Headers({
      Authorization: `Bearer ${accessToken}`,
    });

    const response = await fetch(
      `https://${server}/api/v2/search?q=${interest}&resolve=true&limit=5&type=accounts`,
      {
        method: 'GET',
        headers: accessToken.length > 0 ? headers : new Headers({}),
      }
    );
    const data = await response.json();

    console.log('interest data', data);

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

export const getPreviewTimeline = async (): Promise<Post[]> => {
  if (lastPreviewPageID && lastPreviewPageID.length > 0) {
    const response = await fetch(
      `https://mastodon.social/api/v1/timelines/public?limit=10&max_id=${lastPreviewPageID}`
    );
    const data = await response.json();

    lastPreviewPageID = data[data.length - 1].id;

    return data;
  }

  const response = await fetch(
    'https://mastodon.social/api/v1/timelines/public'
  );
  const data = await response.json();

  lastPreviewPageID = data[data.length - 1].id;

  return data;
};

export const getTrendingLinks = async () => {
  const accessToken = getAccessToken();
  const server = getServer();
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  const response = await fetch(
    `https://${server}/api/v1/trends/links?limit=10`,
    {
      method: 'GET',
      headers: accessToken.length > 0 ? headers : new Headers({}),
    }
  );

  const data = await response.json();

  return data;
};

export const resetLastPageID = (): Promise<void> => {
  return new Promise((resolve) => {
    lastPageID = '';
    resolve();
  });
};

export const getLastPlaceTimeline = async (): Promise<Post[] | undefined> => {
  const last_read_id = sessionStorage.getItem('latest-read');
  if (last_read_id && last_read_id.length > 0) {
    const accessToken = getAccessToken();
    const server = getServer();
    const headers = new Headers({
      Authorization: `Bearer ${accessToken}`,
    });

    const response = await fetch(
      `https://${server}/api/v1/timelines/home?limit=20&max_id=${last_read_id}`,
      {
        headers: accessToken.length > 0 ? headers : new Headers({}),
      }
    );
    const data = await response.json();

    lastPageID = data[data.length - 1].id;

    return data;
  }
  return undefined;
};

export const getPaginatedHomeTimeline = async (
  type = 'home'
): Promise<Post[]> => {
  console.log('getPaginatedHomeTimeline', type);
  console.log('LOOK HERE', type);

  try {
    handlePeriodic();
  } catch (err) {
    console.log(err);
  }

  const accessToken = getAccessToken();
  const server = getServer();
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  if (lastPageID && lastPageID.length > 0) {
    console.log('LOOK HERE', type);

    if (type === 'for you') {
      type = 'home';
    }

    const response = await fetch(
      `https://${server}/api/v1/timelines/${type}?limit=10&max_id=${lastPageID}`,
      {
        method: 'GET',
        headers: accessToken.length > 0 ? headers : new Headers({}),
      }
    );

    const data = await response.json();

    lastPageID = data[data.length - 1].id;

    return data;
  } else {
    console.log('LOOK HERE', type);

    if (type === 'for you') {
      type = 'home';
    }

    const response = await fetch(
      `https://${server}/api/v1/timelines/${type}?limit=10`,
      {
        method: 'GET',
        headers: accessToken.length > 0 ? headers : new Headers({}),
      }
    );

    const data = await response.json();

    console.log('LOOK HERE', data);

    lastPageID = data[data.length - 1].id;

    return data;
  }
};

export const getPublicTimeline = async (): Promise<Post[]> => {
  // Call Mastodon API directly - public timeline doesn't need proxy
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/timelines/public?limit=40`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();
  return data;
};

export const boostPost = async (id: string) => {
  // const response = await fetch(`http://localhost:8000/boost?id=${id}&code=${accessToken}&server=${server}`, {
  //     method: 'POST',
  //     headers: {
  //         'Content-Type': 'application/json'
  //     }
  // });
  // const data = await response.json();
  // return data;

  const accessToken = getAccessToken();
  const server = getServer();

  // boost post
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/favourite`,
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

export const reblogPost = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/reblog?id=${id}&code=${accessToken}&server=${server}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await response.json();
  return data;
};

export const getReplies = async (
  id: string
): Promise<{ ancestors: Post[]; descendants: Post[] }> => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getReplies?id=${id}&code=${accessToken}&server=${server}`
  );
  const data = await response.json();
  return data;
};

export const reply = async (id: string, reply: string) => {
  // Call Mastodon API directly - this endpoint doesn't exist in old server
  const accessToken = getAccessToken();
  const server = getServer();
  const formData = new FormData();
  formData.append('status', reply);
  formData.append('in_reply_to_id', id);

  const response = await fetch(`https://${server}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const data = await response.json();
  return data;
};

export const mediaTimeline = async (): Promise<Post[]> => {
  // Call Mastodon API directly
  const accessToken = getAccessToken();
  const server = getServer();
  const currentUser = localStorage.getItem('currentUserID');
  const response = await fetch(
    `https://${server}/api/v1/accounts/${currentUser}/statuses?only_media=true&limit=40`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();
  return data;
};

export const searchTimeline = async (query: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/search?query=${query}&code=${accessToken}&server=${server}`
  );
  const data = await response.json();
  return data;
};

export const getHashtagTimeline = async (hashtag: string): Promise<Post[]> => {
  // Call Mastodon API directly
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/timelines/tag/${hashtag}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();
  return data;
};

export const getAStatus = async (id: string): Promise<Post> => {
  console.log('reply id', id);
  // get a specific status
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch('https://' + server + '/api/v1/statuses/' + id, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  console.log('reply response', response);

  const data = await response.json();

  return data;
};

export const getTrendingStatuses = async (): Promise<Post[]> => {
  const accessToken = getAccessToken();
  const server = getServer();

  const response = await fetch(`https://${server}/api/v1/trends/statuses`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();

  return data;
};

export const getTrendingTags = async (): Promise<any[]> => {
  const accessToken = getAccessToken();
  const server = getServer();

  const response = await fetch(`https://${server}/api/v1/trends/tags`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();

  return data;
};

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
