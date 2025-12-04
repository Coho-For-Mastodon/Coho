import { getClientConfig } from '../config/client';
import { Notification } from '../types';

export const getNotifications = async (): Promise<Notification[]> => {
  const { url, accessToken } = getClientConfig();
  const notifyResponse = await fetch(`https://${url}/api/v1/notifications`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await notifyResponse.json();
  return data;
};

export const clearNotifications = async () => {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`https://${url}/api/v1/notifications/clear`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
};

export const checkNewNotifications = async (): Promise<boolean> => {
  const { url, accessToken } = getClientConfig();

  try {
    const response = await fetch(
      `https://${url}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      }
    );

    if (!response.ok) return false;

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
  const { url, accessToken } = getClientConfig();

  try {
    const response = await fetch(
      `https://${url}/api/v1/notifications?limit=1`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
      }
    );

    if (!response.ok) return;

    const data = await response.json();
    if (data && data.length > 0) {
      localStorage.setItem('lastReadNotificationId', data[0].id);
    }
  } catch (e) {
    console.error('Error marking notifications as read', e);
  }
};
