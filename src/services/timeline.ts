import { set } from 'idb-keyval';
import { getUsersPosts } from './account';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import { Post } from '../interfaces/Post';

// Import from mastodon library
import {
  getHomeTimeline as mastodonGetHomeTimeline,
  getPublicTimeline as mastodonGetPublicTimeline,
  getPreviewTimeline as mastodonGetPreviewTimeline,
  getTrendingStatuses as mastodonGetTrendingStatuses,
  getTrendingTags as mastodonGetTrendingTags,
  getTrendingLinks as mastodonGetTrendingLinks,
  getHashtagTimeline as mastodonGetHashtagTimeline,
  getStatus as mastodonGetStatus,
  favoritePost as mastodonFavoritePost,
  getMediaTimeline as mastodonGetMediaTimeline,
  saveMarker as mastodonSaveMarker,
  enrichPostsWithReplyContext as mastodonEnrichPostsWithReplyContext,
} from '../mastodon';

// Type for marker response
interface MarkerResponse {
  home?: {
    last_read_id: string;
  };
}

// Re-export enrichPostsWithReplyContext with proper typing for backwards compatibility
export const enrichPostsWithReplyContext = async (
  posts: Post[]
): Promise<Post[]> => {
  // Cast to any to avoid type issues between Status and Post
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mastodonEnrichPostsWithReplyContext(posts as any) as unknown as Post[];
};

// Re-export type
export type { Post };

// Helper functions to always get fresh values from localStorage
const getToken = () => localStorage.getItem('token') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const getServer = () => localStorage.getItem('server') || 'mastodon.social';

// Pagination state - app-specific
let lastPageID = '';
let lastPreviewPageID = '';
let savePlaceRunningFlag = true;

// when the app unloads, call savePlace
window.addEventListener('beforeunload', async () => {
  await savePlace(lastPageID);
});

setInterval(() => {
  savePlaceRunningFlag = false;
}, 3000);

export const savePlace = async (id: string) => {
  console.log('intersected 3');
  if (savePlaceRunningFlag === true) {
    return;
  }

  savePlaceRunningFlag = true;

  try {
    const data = (await mastodonSaveMarker(id)) as MarkerResponse;
    if (data && data.home?.last_read_id) {
      lastPageID = data.home.last_read_id;
      console.log('saving place ran', lastPageID);
    }
  } catch (err) {
    console.error('Error saving place:', err);
  }
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

export const mixTimeline = async (type = 'home'): Promise<Post[]> => {
  // run getPaginatedHomeTimeline and getTrendingStatuses in parallel
  const [home, trending, searched] = await Promise.all([
    getPaginatedHomeTimeline(type),
    getTrendingStatuses() as unknown as Promise<Post[]>,
    addSomeInterestFinds(),
  ]);

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

// Wrapper for preview timeline with pagination state
export const getPreviewTimeline = async (): Promise<Post[]> => {
  const data = (await mastodonGetPreviewTimeline(
    lastPreviewPageID || undefined
  )) as unknown as Post[];

  if (data && data.length > 0) {
    lastPreviewPageID = data[data.length - 1].id;
  }

  return data;
};

// Re-export trending functions from mastodon library
export const getTrendingLinks = mastodonGetTrendingLinks;
export const getTrendingStatuses = mastodonGetTrendingStatuses;
export const getTrendingTags = mastodonGetTrendingTags;

export const resetLastPageID = (): Promise<void> => {
  return new Promise((resolve) => {
    lastPageID = '';
    resolve();
  });
};

export const getLastPlaceTimeline = async (): Promise<Post[] | undefined> => {
  const last_read_id = sessionStorage.getItem('latest-read');
  if (last_read_id && last_read_id.length > 0) {
    const data = (await mastodonGetHomeTimeline(
      last_read_id
    )) as unknown as Post[];

    if (data && data.length > 0) {
      lastPageID = data[data.length - 1].id;
    }

    return data;
  }
  return undefined;
};

export const getPaginatedHomeTimeline = async (
  type = 'home'
): Promise<Post[]> => {
  console.log('getPaginatedHomeTimeline', type);

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

  // Normalize type
  if (type === 'for you') {
    type = 'home';
  }

  const fetchUrl =
    lastPageID && lastPageID.length > 0
      ? `https://${server}/api/v1/timelines/${type}?limit=10&max_id=${lastPageID}`
      : `https://${server}/api/v1/timelines/${type}?limit=10`;

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: accessToken.length > 0 ? headers : new Headers({}),
  });

  const data = await response.json();

  if (data && data.length > 0) {
    lastPageID = data[data.length - 1].id;
  }

  return data;
};

// Use mastodon library's getPublicTimeline
export const getPublicTimeline = async (): Promise<Post[]> => {
  return mastodonGetPublicTimeline(false) as unknown as Promise<Post[]>;
};

// Use mastodon library's favoritePost (named boostPost for backwards compat)
export const boostPost = mastodonFavoritePost;

// Use mastodon library's reblogPost but with Firebase fallback
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

// Use Firebase function for getReplies
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

export const reply = async (id: string, replyContent: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const formData = new FormData();
  formData.append('status', replyContent);
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

// Use mastodon library's getMediaTimeline
export const mediaTimeline = mastodonGetMediaTimeline;

export const searchTimeline = async (query: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/search?query=${query}&code=${accessToken}&server=${server}`
  );
  const data = await response.json();
  return data;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = await (registration as any).periodicSync.getTags();

      if (tags.includes('timeline-sync') === false) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (registration as any).periodicSync.register('timeline-sync', {
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
