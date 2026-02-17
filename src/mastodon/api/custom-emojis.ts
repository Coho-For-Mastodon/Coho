import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Emoji } from '../types';

export const getCustomEmojis = async (): Promise<Emoji[]> => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/custom_emojis`, {
    method: 'GET',
  });
  const data = await response.json();
  return data as Emoji[];
};
