import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Notification } from '../../interfaces/Notification';
import { getAccountScopedLocalStorageKey } from '../../utils/account-scoped-storage';

const getLastReadNotificationKey = () =>
  getAccountScopedLocalStorageKey('lastReadNotificationId');

export const getNotifications = async (
  maxId?: string,
  limit: number = 20
): Promise<Notification[]> => {
  const { url } = getClientConfig();
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (maxId) {
    params.set('max_id', maxId);
  }
  const notifyResponse = await apiFetch(
    `https://${url}/api/v1/notifications?${params.toString()}`,
    {
      method: 'GET',
    }
  );

  const data = await notifyResponse.json();
  return Array.isArray(data) ? data : [];
};

export const getNotificationById = async (
  id: string
): Promise<Notification> => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/notifications/${id}`, {
    method: 'GET',
  });

  const data = await response.json();
  return data;
};

export const clearNotifications = async () => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/notifications/clear`, {
    method: 'POST',
  });

  const data = await response.json();
  return data;
};

export const checkNewNotifications = async (): Promise<boolean> => {
  const { url } = getClientConfig();

  try {
    const response = await apiFetch(
      `https://${url}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        // Don't redirect to login on failure for background checks
        handleUnauthorized: false,
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      const latestId = data[0].id;
      const lastReadId = localStorage.getItem(getLastReadNotificationKey());

      if (!lastReadId) {
        // First run, mark as read to avoid initial badge
        localStorage.setItem(getLastReadNotificationKey(), latestId);
        return false;
      }

      return latestId !== lastReadId;
    }
  } catch (e) {
    console.error('Error checking notifications', e);
  }

  return false;
};

export const markNotificationsRead = async () => {
  const { url } = getClientConfig();

  try {
    const response = await apiFetch(
      `https://${url}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        handleUnauthorized: false,
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      localStorage.setItem(getLastReadNotificationKey(), data[0].id);
    }
  } catch (e) {
    console.error('Error marking notifications as read', e);
  }
};
