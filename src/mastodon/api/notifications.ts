import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import { Notification } from '../types';

export const getNotifications = async (): Promise<Notification[]> => {
  const { url } = getClientConfig();
  const notifyResponse = await apiFetch(`https://${url}/api/v1/notifications`, {
    method: 'GET',
  });

  const data = await notifyResponse.json();
  return data;
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
      const lastReadId = localStorage.getItem('lastReadNotificationId');

      if (!lastReadId) {
        // First run, mark as read to avoid initial badge
        localStorage.setItem('lastReadNotificationId', latestId);
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
      localStorage.setItem('lastReadNotificationId', data[0].id);
    }
  } catch (e) {
    console.error('Error marking notifications as read', e);
  }
};
