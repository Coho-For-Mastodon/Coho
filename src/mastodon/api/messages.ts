import { getClientConfig } from '../config/client';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../../config/firebase';
import { Conversation } from '../types';

export const getMessages = async (): Promise<Conversation[]> => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE_URL}/getMessages?code=${accessToken}&server=${url}`
  );
  const data = await response.json();
  return data;
};
