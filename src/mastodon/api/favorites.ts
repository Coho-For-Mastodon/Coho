import { getClientConfig } from '../config/client';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../../config/firebase';
import type { Post } from '../../interfaces/Post';

export const getFavorites = async (): Promise<Post[]> => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/getFavorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, server: url }),
  });
  const data = await response.json();
  return data;
};
