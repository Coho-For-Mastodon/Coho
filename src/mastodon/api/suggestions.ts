import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Suggestion } from '../types';

/**
 * Fetch follow suggestions for the current user.
 * @see https://docs.joinmastodon.org/methods/suggestions/#v2
 * @param limit Maximum number of suggestions to return (default 20, max 80)
 */
export const getSuggestions = async (limit = 20): Promise<Suggestion[]> => {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v2/suggestions?limit=${limit}`,
    {
      method: 'GET',
    }
  );
  return response.json();
};

/**
 * Remove a suggestion so it is not shown again.
 * @see https://docs.joinmastodon.org/methods/suggestions/#remove
 */
export const removeSuggestion = async (accountId: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v1/suggestions/${accountId}`, {
    method: 'DELETE',
  });
};
