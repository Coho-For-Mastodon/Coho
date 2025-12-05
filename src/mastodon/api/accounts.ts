import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import { Account, Post } from '../types';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../../config/firebase';

export const editAccount = async (
  display_name: string,
  note: string,
  locked: string,
  bot: string,
  avatar: File | string,
  header: File | string
) => {
  const currentUser = await getCurrentUser();
  const { url } = getClientConfig();

  const formData = new FormData();

  formData.append('display_name', display_name || currentUser.display_name);
  formData.append('note', note || currentUser.note);
  formData.append('avatar', avatar || currentUser.avatar);
  formData.append('header', header || currentUser.header);
  formData.append('locked', String(locked || currentUser.locked));
  formData.append('bot', String(bot || currentUser.bot));

  const response = await apiFetch(
    `https://${url}/api/v1/accounts/update_credentials`,
    {
      method: 'PATCH',
      body: formData,
    }
  );

  const data = await response.json();
  return data;
};

export const getPeers = async () => {
  const response = await fetch(`https://mastodon.social/api/v1/instance/peers`);
  const data = await response.json();
  return data.slice(0, 50);
};

export const checkFollowing = async (id: string) => {
  try {
    const { url, accessToken } = getClientConfig();
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE_URL}/isFollowing?id=${id}&code=${accessToken}&server=${url}`
    );
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error checking following status:', err);
    return false;
  }
};

let currentUser: Account | null = null;

export const getCurrentUser = async (): Promise<Account> => {
  if (currentUser) {
    return currentUser;
  }

  const { url } = getClientConfig();
  const response = await apiFetch(
    'https://' + url + '/api/v1/accounts/verify_credentials',
    {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  currentUser = data as Account;

  if (currentUser && currentUser.id) {
    localStorage.setItem('currentUserID', currentUser.id);
  }

  return currentUser;
};

export const getUsersPosts = async (
  id: string,
  excludeReplies = true
): Promise<Post[]> => {
  const { url } = getClientConfig();

  let fetchUrl = `https://${url}/api/v1/accounts/${id}/statuses?limit=20`;
  if (excludeReplies) {
    fetchUrl += '&exclude_replies=true';
  }

  const response = await apiFetch(fetchUrl, {
    method: 'GET',
  });

  const data = await response.json();
  return data;
};
