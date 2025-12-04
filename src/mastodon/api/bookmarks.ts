import { getClientConfig } from '../config/client';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../../config/firebase';
import { Post } from '../types';

export const getBookmarks = async (): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getBookmarks?code=${accessToken}&server=${url}`
  );
  const data = await response.json();
  return data;
};

export const addBookmark = async (id: string) => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/bookmark?id=${id}&code=${accessToken}&server=${url}`,
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
