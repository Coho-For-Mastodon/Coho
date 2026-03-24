import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { ServerPreferences } from '../types/preferences';

export const getServerPreferences =
  async (): Promise<ServerPreferences | null> => {
    const { url } = getClientConfig();
    try {
      const response = await apiFetch(`https://${url}/api/v1/preferences`, {
        method: 'GET',
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch server preferences', error);
      return null;
    }
  };
