import { set, get } from 'idb-keyval';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';
import type { Account, Relationship } from '../mastodon/types/account';
import type {
  CredentialAccount,
  UpdateCredentialsParams,
} from '../mastodon/types/account';
import type { Instance } from '../mastodon/types/instance';
import {
  lookupAccountByAcct,
  searchAccounts as mastodonSearchAccounts,
} from '../mastodon/api/accounts';
import {
  buildAccountAddressCsv,
  downloadUtf8Csv,
  extractAccountAddressesFromCsvText,
  formatDatedExportFilename,
  normalizeAcctForLookup,
} from '../utils/csv-simple';
import {
  syncActiveAccountProfile,
  upsertAccountFromOAuth,
} from './auth-session';
import { getAccountScopedIdbKey } from '../utils/account-scoped-storage';
import {
  apiFetch,
  buildMastodonUrl,
  fetchMastodonJson,
} from '../utils/api-client';

const getServer = () => localStorage.getItem('server') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const normalizeServer = (server: string) =>
  server.replace(/^https?:\/\//, '').replace(/\/$/, '');

const getCurrentUserCacheKey = () => getAccountScopedIdbKey('currentUser');
const getProfileCacheKey = (id: string) =>
  getAccountScopedIdbKey(`profile:${id}`);
const getUserPostsCacheKey = (id: string, filter: ProfilePostsFilter) =>
  getAccountScopedIdbKey(`user_posts:${id}:${filter}`);
const getPinnedPostsCacheKey = (server: string, id: string) =>
  getAccountScopedIdbKey(`user_pinned_posts:${server}:${id}`);

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

  const response = await apiFetch(
    buildMastodonUrl('/api/v1/accounts/update_credentials'),
    { method: 'PATCH', body: formData }
  );

  const data = await response.json();

  // Clear cached user so next getCurrentUser() fetches fresh data
  currentUser = null;

  return data as CredentialAccount;
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

  return fetchMastodonJson<CredentialAccount>(
    '/api/v1/accounts/verify_credentials'
  );
};

export const getCurrentUser = async (): Promise<Account | undefined> => {
  // Return in-memory cached user if available
  if (currentUser) {
    return currentUser;
  }

  try {
    const data = await fetchMastodonJson<Account>(
      '/api/v1/accounts/verify_credentials'
    );
    currentUser = data;

    // Persist to localStorage and IndexedDB for offline access
    localStorage.setItem('currentUserID', currentUser.id);
    await set(getCurrentUserCacheKey(), currentUser);
    await syncActiveAccountProfile({
      id: currentUser.id,
      acct: currentUser.acct,
      display_name: currentUser.display_name,
      avatar: currentUser.avatar,
    });

    return currentUser;
  } catch {
    // Network error — try to get cached user from IndexedDB when offline
    try {
      const cachedUser = (await get(getCurrentUserCacheKey())) as
        | Account
        | undefined;
      if (cachedUser) {
        currentUser = cachedUser;
        return cachedUser;
      }
    } catch {
      // Cache retrieval also failed
    }

    // No cached data available
    return undefined;
  }
};

export const unfollowUser = async (id: string) => {
  return fetchMastodonJson(`/api/v1/accounts/${id}/unfollow`, {
    method: 'POST',
  });
};

export const getAccount = async (id: string): Promise<Account | undefined> => {
  const accessToken = getAccessToken();
  const server = getServer();
  const cacheKey = getProfileCacheKey(id);

  try {
    const response = await apiFetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/getAccount`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, server, id }),
        skipAuth: true,
      }
    );

    const data = await response.json();

    // Cache the profile to IndexedDB for offline access
    if (data && data.id) {
      await set(cacheKey, data);
    }

    return data as Account;
  } catch {
    // Network error — try cached profile from IndexedDB
    try {
      const cachedProfile = (await get(cacheKey)) as Account | undefined;
      if (cachedProfile) {
        return cachedProfile;
      }
    } catch {
      // Cache retrieval also failed
    }

    // No cached data available
    return undefined;
  }
};

export type ProfilePostsFilter = 'posts' | 'posts_replies' | 'media';

export const getUsersPosts = async (
  id: string,
  filter: ProfilePostsFilter = 'posts',
  maxId?: string
) => {
  const accessToken = getAccessToken();
  const server = getServer();
  // Only use cache for initial load (no maxId)
  const cacheKey = getUserPostsCacheKey(id, filter);

  const url = `${FIREBASE_FUNCTIONS_BASE_URL}/getUserPosts`;

  const bodyParams: Record<string, string> = {
    accessToken,
    server,
    id,
  };

  // Apply filter parameters based on selected view
  if (filter === 'posts') {
    bodyParams.exclude_replies = 'true';
  } else if (filter === 'media') {
    bodyParams.only_media = 'true';
  }
  // 'posts_replies' doesn't need any extra params - returns all statuses

  // Add pagination parameter
  if (maxId) {
    bodyParams.max_id = maxId;
  }

  try {
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyParams),
      skipAuth: true,
    });

    const data = await response.json();

    // Cache posts to IndexedDB for offline access
    if (Array.isArray(data)) {
      await set(cacheKey, data);
    }

    return data;
  } catch {
    // Network error — try cached posts from IndexedDB
    try {
      const cachedPosts = await get(cacheKey);
      if (cachedPosts) {
        return cachedPosts;
      }
    } catch {
      // Cache retrieval also failed
    }

    // Return empty array if no cached data
    return [];
  }
};

export const getPinnedPosts = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const cacheKey = getPinnedPostsCacheKey(server, id);

  const url = `${FIREBASE_FUNCTIONS_BASE_URL}/getPinnedPosts`;

  const tryCache = async () => {
    try {
      const cachedPosts = await get(cacheKey);
      if (cachedPosts) {
        return cachedPosts;
      }
    } catch {
      // Cache retrieval failed
    }
    return [];
  };

  const cacheIfValid = async (data: unknown) => {
    if (Array.isArray(data)) {
      await set(cacheKey, data);
      return data;
    }
    return null;
  };

  if (!server) {
    return tryCache();
  }

  try {
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, server, id }),
      skipAuth: true,
    });

    const data = await response.json();
    const cached = await cacheIfValid(data);
    if (cached) return cached;
  } catch {
    // Function error — trying direct API
  }

  try {
    const apiResponse = await apiFetch(
      buildMastodonUrl(`/api/v1/accounts/${id}/statuses`, {
        pinned: true,
        limit: 40,
      }),
      { skipAuth: !accessToken }
    );

    const data = await apiResponse.json();
    const cached = await cacheIfValid(data);
    if (cached) return cached;
  } catch {
    // Direct API error — falling back to cache
  }

  return tryCache();
};

export const getUsersFollowers = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getFollowers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, server, id }),
      skipAuth: true,
    }
  );
  return response.json();
};

export const getFollowing = async (id: string) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getFollowing`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, server, id }),
      skipAuth: true,
    }
  );
  return response.json();
};

export interface FollowOptions {
  notify?: boolean;
  reblogs?: boolean;
  languages?: string[];
}

export const followUser = async (id: string, options: FollowOptions = {}) => {
  const accessToken = getAccessToken();
  const server = getServer();
  const response = await apiFetch(`${FIREBASE_FUNCTIONS_BASE_URL}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server, id, ...options }),
    skipAuth: true,
  });
  return response.json();
};

export const getInstanceInfo = async (): Promise<Instance> => {
  return fetchMastodonJson<Instance>('/api/v1/instance');
};

// ============================================================================
// Auth Flow
// ============================================================================

export const initAuth = async (serverURL: string) => {
  const normalizedServer = normalizeServer(serverURL);

  const { getPlatform } = await import('../utils/platform.js');
  const platform = getPlatform();
  const redirect_uri =
    platform === 'android'
      ? 'https://coho.place/auth/callback/native'
      : platform === 'ios'
        ? 'coho://auth/callback'
        : `${location.origin}/auth/callback`;

  const response = await apiFetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/authenticate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: normalizedServer, redirect_uri }),
      skipAuth: true,
    }
  );

  const data = await response.json();

  const { openOAuthUrl } = await import('./auth-platform.js');
  await openOAuthUrl(data.url);
};

export const authToClient = async (code: string, state: string) => {
  try {
    const response = await apiFetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/getClient`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
        skipAuth: true,
      }
    );

    const data = await response.json();

    if (!data.access_token || typeof data.access_token !== 'string') {
      console.error('Invalid token response');
      throw new Error(
        data.error ||
          data.details?.error_description ||
          'Failed to get access token'
      );
    }

    const tokenData = data.access_token;
    const server = normalizeServer(data.server);
    await upsertAccountFromOAuth(server, tokenData, {
      clientId: data.clientId,
      clientSecret: data.clientSecret,
    });

    // Exit guest mode since user is now logged in
    const { exitGuestMode } = await import('./auth-state');
    exitGuestMode();

    // Clear cached currentUser to force re-fetch with new token
    currentUser = null;
    return tokenData;
  } catch (err) {
    console.error('Auth to client error', err);
    throw err;
  }
};

export const isFollowingMe = async (id: string): Promise<Relationship[]> => {
  return fetchMastodonJson<Relationship[]>(
    `/api/v1/accounts/relationships`,
    undefined,
    { id }
  );
};

export const muteUser = async (id: string) => {
  return fetchMastodonJson(`/api/v1/accounts/${id}/mute`, { method: 'POST' });
};

export const unmuteUser = async (id: string) => {
  return fetchMastodonJson(`/api/v1/accounts/${id}/unmute`, {
    method: 'POST',
  });
};

export const blockUser = async (id: string) => {
  return fetchMastodonJson(`/api/v1/accounts/${id}/block`, {
    method: 'POST',
  });
};

export const unblockUser = async (id: string) => {
  return fetchMastodonJson(`/api/v1/accounts/${id}/unblock`, {
    method: 'POST',
  });
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

  const url = buildMastodonUrl('/api/v1/reports');
  const response = await apiFetch(url, { method: 'POST', body: formData });
  return response.json();
};

export const searchAccounts = async (query: string, limit = 6) => {
  return mastodonSearchAccounts(query, limit);
};

const BLOCK_MUTE_PAGE_LIMIT = 80;

async function fetchAccountListPage(
  endpoint: 'blocks' | 'mutes',
  maxId?: string
): Promise<Account[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    limit: BLOCK_MUTE_PAGE_LIMIT,
  };
  if (maxId) {
    params.max_id = maxId;
  }
  const data = await fetchMastodonJson<unknown>(
    `/api/v1/${endpoint}`,
    undefined,
    params
  );
  return Array.isArray(data) ? data : [];
}

/** All blocked accounts (paginated). */
export const fetchAllBlockedAccounts = async (): Promise<Account[]> => {
  const out: Account[] = [];
  let maxId: string | undefined;
  for (;;) {
    const page = await fetchAccountListPage('blocks', maxId);
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < BLOCK_MUTE_PAGE_LIMIT) break;
    const last = page[page.length - 1];
    if (!last?.id) break;
    maxId = last.id;
  }
  return out;
};

/** All muted accounts (paginated). */
export const fetchAllMutedAccounts = async (): Promise<Account[]> => {
  const out: Account[] = [];
  let maxId: string | undefined;
  for (;;) {
    const page = await fetchAccountListPage('mutes', maxId);
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < BLOCK_MUTE_PAGE_LIMIT) break;
    const last = page[page.length - 1];
    if (!last?.id) break;
    maxId = last.id;
  }
  return out;
};

export function downloadBlockedAccountsCsv(accounts: Account[]): void {
  const csv = buildAccountAddressCsv(accounts.map((a) => a.acct));
  downloadUtf8Csv(formatDatedExportFilename('coho-blocked'), csv);
}

export function downloadMutedAccountsCsv(accounts: Account[]): void {
  const csv = buildAccountAddressCsv(accounts.map((a) => a.acct));
  downloadUtf8Csv(formatDatedExportFilename('coho-muted'), csv);
}

export interface CsvImportAccountsResult {
  imported: number;
  skipped: number;
  failed: number;
  newAccounts: Account[];
}

/**
 * Import block or mute actions from Mastodon-style CSV (Account address column).
 * Resolves each handle via GET /api/v1/accounts/lookup, then POST block/mute.
 */
export async function importBlocksOrMutesFromCsv(
  kind: 'block' | 'mute',
  csvText: string,
  options: {
    existingAccountIds: Set<string>;
    selfAccountId: string | null;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<CsvImportAccountsResult> {
  const rawAddresses = extractAccountAddressesFromCsvText(csvText);
  const server = getServer();
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const raw of rawAddresses) {
    const n = normalizeAcctForLookup(raw, server);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(n);
  }

  const total = addresses.length;
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const newAccounts: Account[] = [];
  const existing = options.existingAccountIds;

  for (let i = 0; i < addresses.length; i++) {
    const acct = addresses[i]!;
    options.onProgress?.(i + 1, total);
    try {
      const account = await lookupAccountByAcct(acct);
      if (!account) {
        failed++;
        continue;
      }
      if (options.selfAccountId && account.id === options.selfAccountId) {
        skipped++;
        continue;
      }
      if (existing.has(account.id)) {
        skipped++;
        continue;
      }
      if (kind === 'block') {
        await blockUser(account.id);
      } else {
        await muteUser(account.id);
      }
      existing.add(account.id);
      newAccounts.push(account as Account);
      imported++;
    } catch (e) {
      console.error('[importBlocksOrMutesFromCsv]', acct, e);
      failed++;
    }
  }

  return { imported, skipped, failed, newAccounts };
}
