import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Announcement } from '../types/announcement';

/** IndexedDB key for cached announcements (last successful sync). */
export const SERVER_ANNOUNCEMENTS_IDB_KEY = 'server-announcements';

export async function getAnnouncements(): Promise<Announcement[]> {
  const { url, accessToken } = getClientConfig();
  if (!url || !accessToken) {
    return [];
  }
  try {
    const response = await apiFetch(`https://${url}/api/v1/announcements`, {
      method: 'GET',
    });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch announcements', error);
    return [];
  }
}

export async function dismissAnnouncement(id: string): Promise<boolean> {
  const { url, accessToken } = getClientConfig();
  if (!url || !accessToken) {
    return false;
  }
  try {
    await apiFetch(
      `https://${url}/api/v1/announcements/${encodeURIComponent(id)}/dismiss`,
      {
        method: 'POST',
      }
    );
    return true;
  } catch (error) {
    console.error('Failed to dismiss announcement', error);
    return false;
  }
}
