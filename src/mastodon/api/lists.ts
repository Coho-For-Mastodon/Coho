import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { List, Account } from '../types';
import type { Post } from '../../interfaces/Post';

export const getLists = async (): Promise<List[]> => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/lists`, {
    method: 'GET',
  });
  const data = await response.json();
  return data as List[];
};

export const createList = async (
  title: string,
  repliesPolicy?: List['replies_policy']
): Promise<List> => {
  const { url } = getClientConfig();
  const body = new URLSearchParams();
  body.set('title', title);
  if (repliesPolicy) {
    body.set('replies_policy', repliesPolicy);
  }

  const response = await apiFetch(`https://${url}/api/v1/lists`, {
    method: 'POST',
    body,
  });
  const data = await response.json();
  return data as List;
};

export const updateList = async (
  id: string,
  title: string,
  repliesPolicy?: List['replies_policy']
): Promise<List> => {
  const { url } = getClientConfig();
  const body = new URLSearchParams();
  body.set('title', title);
  if (repliesPolicy) {
    body.set('replies_policy', repliesPolicy);
  }

  const response = await apiFetch(`https://${url}/api/v1/lists/${id}`, {
    method: 'PUT',
    body,
  });
  const data = await response.json();
  return data as List;
};

export const deleteList = async (id: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v1/lists/${id}`, {
    method: 'DELETE',
  });
};

export const getListAccounts = async (id: string): Promise<Account[]> => {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/lists/${id}/accounts`,
    {
      method: 'GET',
    }
  );
  const data = await response.json();
  return data as Account[];
};

export const addAccountsToList = async (
  id: string,
  accountIds: string[]
): Promise<void> => {
  if (accountIds.length === 0) {
    return;
  }

  const { url } = getClientConfig();
  const body = new URLSearchParams();
  for (const accountId of accountIds) {
    body.append('account_ids[]', accountId);
  }

  await apiFetch(`https://${url}/api/v1/lists/${id}/accounts`, {
    method: 'POST',
    body,
  });
};

export const removeAccountsFromList = async (
  id: string,
  accountIds: string[]
): Promise<void> => {
  if (accountIds.length === 0) {
    return;
  }

  const { url } = getClientConfig();
  const body = new URLSearchParams();
  for (const accountId of accountIds) {
    body.append('account_ids[]', accountId);
  }

  await apiFetch(`https://${url}/api/v1/lists/${id}/accounts`, {
    method: 'DELETE',
    body,
  });
};

export const getListTimeline = async (
  id: string,
  maxId?: string
): Promise<Post[]> => {
  const { url } = getClientConfig();
  let fetchUrl = `https://${url}/api/v1/timelines/list/${id}?limit=10`;
  if (maxId) {
    fetchUrl += `&max_id=${maxId}`;
  }

  const response = await apiFetch(fetchUrl, {
    method: 'GET',
  });
  const data = await response.json();
  return data as Post[];
};
