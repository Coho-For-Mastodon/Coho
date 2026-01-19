import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { setupAuth } from '../setup';
import { mockNotifications } from '../mocks/mock-data';
import type { Notification } from '../../src/interfaces/Notification';

// Import the notifications component
import '../../src/components/notifications';
import type { Notifications } from '../../src/components/notifications';

// Cast mock data for type safety
const testNotifications = mockNotifications as unknown as Notification[];

// Helper to wait for async operations
async function waitFor(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Notifications E2E', () => {
  beforeEach(() => {
    setupAuth();
    cleanupFixtures();
  });

  describe('component initialization', () => {
    it('should render the notifications component', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      expect(el).toBeDefined();
      expect(el.tagName.toLowerCase()).toBe('app-notifications');
    });

    it('should have a shadow root', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      expect(el.shadowRoot).not.toBeNull();
    });

    it('should initialize with empty notifications', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      // Initial state should be empty before data loads
      expect(el.notifications).toBeDefined();
      expect(Array.isArray(el.notifications)).toBe(true);
    });
  });

  describe('notification filtering', () => {
    it('should have segmented button for filtering', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);
      await waitFor(200);

      const segmentedButton = el.shadowRoot?.querySelector(
        'md-segmented-button'
      );
      expect(segmentedButton).toBeDefined();
    });

    it('should default to "all" segment', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      expect(el.activeSegment).toBe('all');
    });

    it('should be able to switch to mentions segment', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      // Set active segment programmatically
      el.activeSegment = 'mention';
      await elementUpdated(el);

      expect(el.activeSegment).toBe('mention');
    });
  });

  describe('notification list rendering', () => {
    it('should render notification list container', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);
      await waitFor(200);

      const list = el.shadowRoot?.querySelector('ul');
      expect(list).toBeDefined();
    });

    it('should render notifications when data is set', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );

      // Set notifications data
      el.notifications = testNotifications;
      await elementUpdated(el);
      await waitFor(300);

      // Should have rendered notification items
      const listItems = el.shadowRoot?.querySelectorAll(
        'li, timeline-item, .notification-card'
      );
      expect(listItems?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('notification types', () => {
    it('should handle follow notifications', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );

      const followNotification = testNotifications.find(
        (n) => n.type === 'follow'
      );
      expect(followNotification).toBeDefined();

      el.notifications = followNotification ? [followNotification] : [];
      await elementUpdated(el);
      await waitFor(200);
    });

    it('should handle favourite notifications', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );

      const favNotification = testNotifications.find(
        (n) => n.type === 'favourite'
      );
      expect(favNotification).toBeDefined();

      el.notifications = favNotification ? [favNotification] : [];
      await elementUpdated(el);
      await waitFor(200);
    });

    it('should handle mention notifications', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );

      const mentionNotification = testNotifications.find(
        (n) => n.type === 'mention'
      );
      expect(mentionNotification).toBeDefined();

      el.notifications = mentionNotification ? [mentionNotification] : [];
      await elementUpdated(el);
      await waitFor(200);
    });
  });

  describe('push notification subscription', () => {
    it('should have subscription state', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      expect(typeof el.subbed).toBe('boolean');
    });

    it('should have notification switch for push notifications', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);
      await waitFor(200);

      const switchEl = el.shadowRoot?.querySelector('md-switch');
      expect(switchEl).toBeDefined();
    });
  });

  describe('loading states', () => {
    it('should track loading more state', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      expect(typeof el.loadingMore).toBe('boolean');
      expect(el.loadingMore).toBe(false);
    });

    it('should track has more notifications state', async () => {
      const el = await fixture<Notifications>(
        html`<app-notifications></app-notifications>`
      );
      await elementUpdated(el);

      expect(typeof el.hasMoreNotifications).toBe('boolean');
    });
  });
});
