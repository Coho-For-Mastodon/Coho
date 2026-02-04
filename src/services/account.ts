import { set, get } from 'idb-keyval';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import { Account } from '../types/interfaces/Account';
import type {
  CredentialAccount,
  UpdateCredentialsParams,
} from '../mastodon/types/account';
import { searchAccounts as mastodonSearchAccounts } from '../mastodon/api/accounts';

// Helper functions to always get fresh values from localStorage
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const getServer = () => localStorage.getItem('server') || '';

// Note: IndexedDB is updated in authToClient() after successful login
// We don't update it here at module load to avoid overwriting with empty values

/**
 * Update account credentials with full Mastodon API support
 * @see https://docs.joinmastodon.org/methods/accounts/#update_credentials
 */
export const editAccount = async (
  params: UpdateCredentialsParams
): Promise<CredentialAccount> => {
  const accessToken = getAccessToken();
  const server = getServer();

  if (!accessToken || !server) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();

  // Basic profile fields
  if (params.display_name !== undefined) {
    formData.append('display_name', params.display_name);
  }
  if (params.note !== undefined) {
    formData.append('note', params.note);
  }
  if (params.avatar instanceof File) {
    formData.append('avatar', params.avatar);
  }
  if (params.header instanceof File) {
    formData.append('header', params.header);
  }

  // Boolean flags
  if (params.locked !== undefined) {
    formData.append('locked', String(params.locked));
  }
  if (params.bot !== undefined) {
    formData.append('bot', String(params.bot));
  }
  if (params.discoverable !== undefined) {
    formData.append('discoverable', String(params.discoverable));
  }
  if (params.hide_collections !== undefined) {
    formData.append('hide_collections', String(params.hide_collections));
  }
  if (params.indexable !== undefined) {
    formData.append('indexable', String(params.indexable));
  }

  // Profile fields (up to 4)
  if (params.fields_attributes) {
    params.fields_attributes.forEach((field, index) => {
      formData.append(`fields_attributes[${index}][name]`, field.name);
      formData.append(`fields_attributes[${index}][value]`, field.value);
    });
  }

  // Source preferences
  if (params.source?.privacy !== undefined) {
    formData.append('source[privacy]', params.source.privacy);
  }
  if (params.source?.sensitive !== undefined) {
    formData.append('source[sensitive]', String(params.source.sensitive));
  }
  if (params.source?.language !== undefined) {
    formData.append('source[language]', params.source.language);
  }

  const response = await fetch(
    `https://${server}/api/v1/accounts/update_credentials`,
    {
      method: 'PATCH',
      headers: new Headers({
        // Note: Don't set Content-Type for FormData - browser sets it with boundary
        Authorization: `Bearer ${accessToken}`,
      }),
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Clear cached user so next getCurrentUser() fetches fresh data
  currentUser = null;

  return data as CredentialAccount;
};

/**
 * Legacy editAccount function for backwards compatibility
 * @deprecated Use editAccount(params: UpdateCredentialsParams) instead
 */
export const editAccountLegacy = async (
  display_name: string,
  note: string,
  locked: string,
  bot: string,
  avatar: File | string,
  header: File | string
) => {
  return editAccount({
    display_name,
    note,
    locked: locked === 'true',
    bot: bot === 'true',
    avatar: avatar instanceof File ? avatar : undefined,
    header: header instanceof File ? header : undefined,
  });
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

/**
 * Get current user's full credentials for editing (always fetches fresh)
 * Returns source object with plain-text values for form editing
 */
export const getCredentials = async (): Promise<CredentialAccount> => {
  const accessToken = getAccessToken();
  const server = getServer();

  if (!accessToken || !server) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `https://${server}/api/v1/accounts/verify_credentials`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};

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
const USER_PINNED_POSTS_CACHE_PREFIX = 'user_pinned_posts_';

export const getUsersPosts = async (
  id: string,
  filter: ProfilePostsFilter = 'posts',
  maxId?: string
) => {
  const accessToken = getAccessToken();
  const server = getServer();
  // Only use cache for initial load (no maxId)
  const cacheKey = `${USER_POSTS_CACHE_PREFIX}${id}_${filter}`;

  let url = `${FIREBASE_FUNCTIONS_BASE_URL}/getUserPosts?id=${id}&code=${accessToken}&server=${server}`;

  // Apply filter parameters based on selected view
  if (filter === 'posts') {
    url += '&exclude_replies=true';
  } else if (filter === 'media') {
    url += '&only_media=true';
  }
  // 'posts_replies' doesn't need any extra params - returns all statuses

  // Add pagination parameter
  if (maxId) {
    url += `&max_id=${maxId}`;
  }

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

export const getPinnedPosts = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const cacheKey = `${USER_PINNED_POSTS_CACHE_PREFIX}${server}_${id}`;

  const url = `${FIREBASE_FUNCTIONS_BASE_URL}/getPinnedPosts?id=${encodeURIComponent(
    id
  )}&code=${encodeURIComponent(accessToken)}&server=${encodeURIComponent(
    server
  )}`;

  const tryCache = async () => {
    try {
      const cachedPosts = await get(cacheKey);
      if (cachedPosts) {
        console.log('[getPinnedPosts] Using cached posts data');
        return cachedPosts;
      }
    } catch (cacheErr) {
      console.log('[getPinnedPosts] Cache retrieval failed:', cacheErr);
    }
    return [];
  };

  const cacheIfValid = async (data: unknown) => {
    if (Array.isArray(data)) {
      await set(cacheKey, data);
      console.log('[getPinnedPosts] Posts cached for offline access');
      return data;
    }
    return null;
  };

  if (!server) {
    return tryCache();
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const cached = await cacheIfValid(data);
    if (cached) return cached;
  } catch (err) {
    console.log('[getPinnedPosts] Function error, trying direct API:', err);
  }

  try {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const apiResponse = await fetch(
      `https://${server}/api/v1/accounts/${id}/statuses?pinned=true&limit=40`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!apiResponse.ok) {
      throw new Error(`HTTP ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const cached = await cacheIfValid(data);
    if (cached) return cached;
  } catch (err) {
    console.log('[getPinnedPosts] Direct API error, trying cache:', err);
  }

  return tryCache();
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

    // Exit guest mode since user is now logged in
    const { exitGuestMode } = await import('./auth-state');
    exitGuestMode();

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

export const searchAccounts = async (query: string, limit = 6) => {
  return mastodonSearchAccounts(query, limit);
};
