import { getClientConfig } from '../config/client';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../../config/firebase';
import { Post } from '../types';

export const getBookmarks = async (): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/getBookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server: url }),
  });
  const data = await response.json();
  return data;
};

export const addBookmark = async (id: string) => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/bookmark`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken, server: url, id }),
  });

  const data = await response.json();
  return data;
};

export const removeBookmark = async (id: string) => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/unbookmark`,
    {
      method: 'POST',
      headers: new Headers({
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }),
    }
  );

  const data = await response.json();
  return data;
};
