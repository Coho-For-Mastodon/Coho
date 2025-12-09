import { set, get } from 'idb-keyval';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import { Account } from '../types/interfaces/Account';

// Helper functions to always get fresh values from localStorage
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const getServer = () => localStorage.getItem('server') || '';

// Note: IndexedDB is updated in authToClient() after successful login
// We don't update it here at module load to avoid overwriting with empty values

export const editAccount = async (
  display_name: string,
  note: string,
  locked: string,
  bot: string,
  avatar: File | string,
  header: File | string
) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const accessToken = getAccessToken();
  const server = getServer();
  const formData = new FormData();

  formData.append('display_name', display_name || currentUser.display_name);
  formData.append('note', note || currentUser.note);
  formData.append('avatar', avatar || currentUser.avatar);
  formData.append('header', header || currentUser.header);
  formData.append('locked', String(locked || currentUser.locked));
  formData.append('bot', String(bot || currentUser.bot));

  const response = await fetch(
    `https://${server}/api/v1/accounts/update_credentials`,
    {
      method: 'PATCH',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      }),
      body: formData,
    }
  );

  const data = await response.json();
  return data;
};

export const getPeers = async () => {
  const response = await fetch(`https://mastodon.social/api/v1/instance/peers`);
  const data = await response.json();

  // return first 300
  return data.slice(0, 50);
};

export const checkFollowing = async (id: string) => {
  try {
    const accessToken = getAccessToken();
    const server = getServer();
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/isFollowing?id=${id}&code=${accessToken}&server=${server}`
    );
    const data = await response.json();

    return data;
  } catch {
    const server = getServer();
    if (server) {
      await initAuth(server);
    }
  }
};

let currentUser: Account | null = null;

export const getCurrentUser = async (): Promise<Account | undefined> => {
  // Return in-memory cached user if available
  if (currentUser) {
    return currentUser;
  }

  const accessToken = getAccessToken();
  const server = getServer();

  try {
    const response = await fetch(
      'https://' + server + '/api/v1/accounts/verify_credentials',
      {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    currentUser = data as Account;

    // Persist to localStorage and IndexedDB for offline access
    localStorage.setItem('currentUserID', currentUser.id);
    await set('currentUser', currentUser);

    return currentUser;
  } catch (err) {
    console.log('[getCurrentUser] Network error, trying cache:', err);

    // Try to get cached user from IndexedDB when offline
    try {
      const cachedUser = (await get('currentUser')) as Account | undefined;
      if (cachedUser) {
        console.log('[getCurrentUser] Using cached user data');
        currentUser = cachedUser;
        return cachedUser;
      }
    } catch (cacheErr) {
      console.log('[getCurrentUser] Cache retrieval failed:', cacheErr);
    }

    // No cached data available
    return undefined;
  }
};

export const unfollowUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/accounts/${id}/unfollow`,
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

// Cache key prefix for profile data
const PROFILE_CACHE_PREFIX = 'profile_';

export const getAccount = async (id: string): Promise<Account | undefined> => {
  const accessToken = getAccessToken();
  const server = getServer();

  try {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/getAccount?id=${id}&code=${accessToken}&server=${server}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('account data', data);

    // Cache the profile to IndexedDB for offline access
    if (data && data.id) {
      await set(`${PROFILE_CACHE_PREFIX}${id}`, data);
      console.log('[getAccount] Profile cached for offline access');
    }

    return data as Account;
  } catch (err) {
    console.log('[getAccount] Network error, trying cache:', err);

    // Try to get cached profile from IndexedDB when offline
    try {
      const cachedProfile = (await get(`${PROFILE_CACHE_PREFIX}${id}`)) as
        | Account
        | undefined;
      if (cachedProfile) {
        console.log('[getAccount] Using cached profile data');
        return cachedProfile;
      }
    } catch (cacheErr) {
      console.log('[getAccount] Cache retrieval failed:', cacheErr);
    }

    // No cached data available
    return undefined;
  }
};

export type ProfilePostsFilter = 'posts' | 'posts_replies' | 'media';

// Cache key prefix for user posts
const USER_POSTS_CACHE_PREFIX = 'user_posts_';

export const getUsersPosts = async (
  id: string,
  filter: ProfilePostsFilter = 'posts'
) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const cacheKey = `${USER_POSTS_CACHE_PREFIX}${id}_${filter}`;

  let url = `${FIREBASE_FUNCTIONS_BASE_URL}/getUserPosts?id=${id}&code=${accessToken}&server=${server}`;

  // Apply filter parameters based on selected view
  if (filter === 'posts') {
    url += '&exclude_replies=true';
  } else if (filter === 'media') {
    url += '&only_media=true';
  }
  // 'posts_replies' doesn't need any extra params - returns all statuses

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache posts to IndexedDB for offline access
    if (Array.isArray(data)) {
      await set(cacheKey, data);
      console.log('[getUsersPosts] Posts cached for offline access');
    }

    return data;
  } catch (err) {
    console.log('[getUsersPosts] Network error, trying cache:', err);

    // Try to get cached posts from IndexedDB when offline
    try {
      const cachedPosts = await get(cacheKey);
      if (cachedPosts) {
        console.log('[getUsersPosts] Using cached posts data');
        return cachedPosts;
      }
    } catch (cacheErr) {
      console.log('[getUsersPosts] Cache retrieval failed:', cacheErr);
    }

    // Return empty array if no cached data
    return [];
  }
};

export const getUsersFollowers = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getFollowers?id=${id}&code=${accessToken}&server=${server}`
  );
  const data = await response.json();
  return data;
};

export const getFollowing = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getFollowing?id=${id}&code=${accessToken}&server=${server}`
  );
  const data = await response.json();
  return data;
};

export const followUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/follow?id=${id}&code=${accessToken}&server=${server}`,
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

export const getInstanceInfo = async () => {
  // This function doesn't exist in the old server either, calling Mastodon API directly
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(`https://${server}/api/v1/instance`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
};

export const initAuth = async (serverURL: string) => {
  const redirect_uri = location.origin;
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/authenticate?server=${serverURL}&redirect_uri=${redirect_uri}`,
    {
      method: 'POST',
    }
  );

  const data = await response.json();
  console.log('data', data);

  // Firebase function returns {url: "..."}
  window.location.href = data.url || data;

  localStorage.setItem('server', serverURL);

  return;
};

export const authToClient = async (code: string, state: string) => {
  try {
    localStorage.setItem('token', code);
    const redirect_uri = location.origin;

    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/getClient?code=${code}&state=${state}&redirect_uri=${redirect_uri}`,
      {
        method: 'POST',
      }
    );

    const data = await response.json();

    console.log('tokenData', data);

    // Firebase function returns {access_token: "..."}
    // Make sure we actually have a string token, not an error object
    if (!data.access_token || typeof data.access_token !== 'string') {
      console.error('Invalid token response:', data);
      throw new Error(
        data.error ||
          data.details?.error_description ||
          'Failed to get access token'
      );
    }

    const tokenData = data.access_token;

    // Update both localStorage and IndexedDB
    localStorage.setItem('accessToken', tokenData);
    await set('accessToken', tokenData);
    await set('server', getServer());

    // Clear cached currentUser to force re-fetch with new token
    currentUser = null;

    // try to get user info
    try {
      const userData = await getCurrentUser();
      console.log('user data', userData);
      return tokenData;
    } catch (err) {
      console.error('Error getting user info', err);
      return tokenData;
    }
  } catch (err) {
    console.error('Auth to client error', err);
    throw err;
  }
};

export const registerAccount = async (
  username: string,
  email: string,
  password: string,
  agreement: boolean,
  locale: string,
  chosenServer: string
) => {
  const response = await fetch(`https://${chosenServer}/api/v1/accounts`, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      username,
      email,
      password,
      agreement,
      locale,
    }),
  });

  const data = await response.json();
  return data;
};

export const getServers = async () => {
  const response = await fetch(
    'https://mammoth-api-v3.azurewebsites.net/api/getOpenInstances'
  );
  const data = await response.json();

  return data;
};

export const isFollowingMe = async (id: string) => {
  // check if you are following a user
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    'https://' + server + `/api/v1/accounts/relationships?id=${id}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data;
};

export const muteUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(`https://${server}/api/v1/accounts/${id}/mute`, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

export const unmuteUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/accounts/${id}/unmute`,
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

export const blockUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/accounts/${id}/block`,
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

export const unblockUser = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await fetch(
    `https://${server}/api/v1/accounts/${id}/unblock`,
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

export interface ReportOptions {
  statusIds?: string[];
  comment?: string;
  category?: 'spam' | 'legal' | 'violation' | 'other';
  forward?: boolean;
}

export const reportUser = async (
  accountId: string,
  options: ReportOptions = {}
) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const formData = new FormData();
  formData.append('account_id', accountId);

  if (options.statusIds && options.statusIds.length > 0) {
    options.statusIds.forEach((id) => formData.append('status_ids[]', id));
  }
  if (options.comment) {
    formData.append('comment', options.comment);
  }
  if (options.category) {
    formData.append('category', options.category);
  }
  if (options.forward !== undefined) {
    formData.append('forward', options.forward.toString());
  }

  const response = await fetch(`https://${server}/api/v1/reports`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
};
