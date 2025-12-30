import { describe, it, expect } from 'vitest';
import {
  mockTimelinePosts,
  mockBookmarks,
  mockFavorites,
  mockNotifications,
  mockSearchResult,
  mockAccountProfile,
  mockInstanceInfo,
  mockTrendingStatuses,
  mockTrendingLinks,
  mockTrendingTags,
} from '../mocks/mock-data';

describe('mock-data', () => {
  describe('mockTimelinePosts', () => {
    it('has correct number of posts', () => {
      expect(mockTimelinePosts).toHaveLength(2);
    });

    it('posts have unique IDs', () => {
      const ids = mockTimelinePosts.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('posts have required properties', () => {
      for (const post of mockTimelinePosts) {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('created_at');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('account');
        expect(post).toHaveProperty('visibility');
        expect(post).toHaveProperty('favourited');
        expect(post).toHaveProperty('reblogged');
        expect(post).toHaveProperty('bookmarked');
      }
    });

    it('posts have valid timestamps', () => {
      for (const post of mockTimelinePosts) {
        const date = new Date(post.created_at);
        expect(date.toString()).not.toBe('Invalid Date');
      }
    });
  });

  describe('mockBookmarks', () => {
    it('has bookmarked posts', () => {
      for (const bookmark of mockBookmarks) {
        expect(bookmark.bookmarked).toBe(true);
      }
    });

    it('bookmarks have unique IDs from timeline posts', () => {
      const timelineIds = mockTimelinePosts.map((p) => p.id);
      for (const bookmark of mockBookmarks) {
        expect(timelineIds).not.toContain(bookmark.id);
      }
    });
  });

  describe('mockFavorites', () => {
    it('has favourited posts', () => {
      for (const favorite of mockFavorites) {
        expect(favorite.favourited).toBe(true);
      }
    });
  });

  describe('mockNotifications', () => {
    it('has different notification types', () => {
      const types = mockNotifications.map((n) => n.type);
      expect(types).toContain('follow');
      expect(types).toContain('favourite');
      expect(types).toContain('mention');
    });

    it('notifications have unique IDs', () => {
      const ids = mockNotifications.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('notifications have account', () => {
      for (const notification of mockNotifications) {
        expect(notification.account).toBeDefined();
        expect(notification.account.id).toBeDefined();
      }
    });
  });

  describe('mockSearchResult', () => {
    it('has accounts array', () => {
      expect(mockSearchResult.accounts).toBeDefined();
      expect(Array.isArray(mockSearchResult.accounts)).toBe(true);
    });

    it('has statuses array', () => {
      expect(mockSearchResult.statuses).toBeDefined();
      expect(Array.isArray(mockSearchResult.statuses)).toBe(true);
    });

    it('has hashtags array', () => {
      expect(mockSearchResult.hashtags).toBeDefined();
      expect(Array.isArray(mockSearchResult.hashtags)).toBe(true);
    });

    it('has query property', () => {
      expect(mockSearchResult.query).toBeDefined();
      expect(typeof mockSearchResult.query).toBe('string');
    });
  });

  describe('mockAccountProfile', () => {
    it('has required account properties', () => {
      expect(mockAccountProfile).toHaveProperty('id');
      expect(mockAccountProfile).toHaveProperty('username');
      expect(mockAccountProfile).toHaveProperty('acct');
      expect(mockAccountProfile).toHaveProperty('display_name');
      expect(mockAccountProfile).toHaveProperty('url');
      expect(mockAccountProfile).toHaveProperty('avatar');
      expect(mockAccountProfile).toHaveProperty('header');
    });

    it('has numeric counts', () => {
      expect(typeof mockAccountProfile.followers_count).toBe('number');
      expect(typeof mockAccountProfile.following_count).toBe('number');
      expect(typeof mockAccountProfile.statuses_count).toBe('number');
    });

    it('has boolean flags', () => {
      expect(typeof mockAccountProfile.locked).toBe('boolean');
      expect(typeof mockAccountProfile.bot).toBe('boolean');
    });
  });

  describe('mockInstanceInfo', () => {
    it('has instance properties', () => {
      expect(mockInstanceInfo).toHaveProperty('title');
      expect(mockInstanceInfo).toHaveProperty('description');
      expect(mockInstanceInfo).toHaveProperty('thumbnail');
    });
  });

  describe('mockTrendingStatuses', () => {
    it('is same as mockTimelinePosts', () => {
      expect(mockTrendingStatuses).toBe(mockTimelinePosts);
    });
  });

  describe('mockTrendingLinks', () => {
    it('has link properties', () => {
      for (const link of mockTrendingLinks) {
        expect(link).toHaveProperty('url');
        expect(link).toHaveProperty('title');
        expect(link).toHaveProperty('description');
      }
    });

    it('links have valid URLs', () => {
      for (const link of mockTrendingLinks) {
        expect(link.url).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('mockTrendingTags', () => {
    it('has tag properties', () => {
      for (const tag of mockTrendingTags) {
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('url');
        expect(tag).toHaveProperty('history');
      }
    });

    it('tags have history array', () => {
      for (const tag of mockTrendingTags) {
        expect(Array.isArray(tag.history)).toBe(true);
        expect(tag.history.length).toBeGreaterThan(0);
      }
    });
  });
});
