import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../setup';
import { mockNotifications } from '../mocks/mock-data';

// Import the service functions we want to test
import { getNotifications } from '../../src/services/notifications';

describe('notifications service', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('getNotifications', () => {
    it('fetches all notifications', async () => {
      const notifications = await getNotifications();

      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBe(mockNotifications.length);
    });

    it('returns notifications with correct structure', async () => {
      const notifications = await getNotifications();

      for (const notification of notifications) {
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('created_at');
        expect(notification).toHaveProperty('account');
      }
    });

    it('includes follow notifications', async () => {
      const notifications = await getNotifications();
      const followNotification = notifications.find((n) => n.type === 'follow');

      expect(followNotification).toBeDefined();
      expect(followNotification?.id).toBe('notify_follow_1');
    });

    it('includes favourite notifications with status', async () => {
      const notifications = await getNotifications();
      const favouriteNotification = notifications.find(
        (n) => n.type === 'favourite'
      );

      expect(favouriteNotification).toBeDefined();
      expect(favouriteNotification?.status).toBeDefined();
      expect(favouriteNotification?.status?.id).toBe('post_mock_2');
    });

    it('includes mention notifications with status', async () => {
      const notifications = await getNotifications();
      const mentionNotification = notifications.find(
        (n) => n.type === 'mention'
      );

      expect(mentionNotification).toBeDefined();
      expect(mentionNotification?.status?.content).toContain('mention');
    });
  });

  describe('notification data integrity', () => {
    it('notifications have valid account information', async () => {
      const notifications = await getNotifications();

      for (const notification of notifications) {
        expect(notification.account).toHaveProperty('id');
        expect(notification.account).toHaveProperty('username');
        expect(notification.account).toHaveProperty('acct');
      }
    });

    it('notifications have valid timestamps', async () => {
      const notifications = await getNotifications();

      for (const notification of notifications) {
        expect(notification.created_at).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        );
      }
    });
  });
});
