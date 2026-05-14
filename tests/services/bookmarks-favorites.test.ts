import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../auth-helpers';
import { mockBookmarks, mockFavorites } from '../mocks/mock-data';

// Import the service functions we want to test
import { getBookmarks } from '../../src/services/bookmarks';
import { getFavorites } from '../../src/services/favorites';

describe('bookmarks service', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('getBookmarks', () => {
    it('fetches all bookmarks', async () => {
      const bookmarks = await getBookmarks();

      expect(bookmarks).toBeDefined();
      expect(Array.isArray(bookmarks)).toBe(true);
      expect(bookmarks.length).toBe(mockBookmarks.length);
    });

    it('returns bookmarks with correct structure', async () => {
      const bookmarks = await getBookmarks();

      for (const bookmark of bookmarks) {
        expect(bookmark).toHaveProperty('id');
        expect(bookmark).toHaveProperty('content');
        expect(bookmark).toHaveProperty('account');
        expect(bookmark).toHaveProperty('created_at');
      }
    });

    it('bookmarks are marked as bookmarked', async () => {
      const bookmarks = await getBookmarks();

      for (const bookmark of bookmarks) {
        expect(bookmark.bookmarked).toBe(true);
      }
    });

    it('returns expected bookmark content', async () => {
      const bookmarks = await getBookmarks();

      expect(bookmarks[0].id).toBe('bookmark_mock_1');
      expect(bookmarks[0].content).toContain('Saved post');
    });
  });
});

describe('favorites service', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('getFavorites', () => {
    it('fetches all favorites', async () => {
      const favorites = await getFavorites();

      expect(favorites).toBeDefined();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites.length).toBe(mockFavorites.length);
    });

    it('returns favorites with correct structure', async () => {
      const favorites = await getFavorites();

      for (const favorite of favorites) {
        expect(favorite).toHaveProperty('id');
        expect(favorite).toHaveProperty('content');
        expect(favorite).toHaveProperty('account');
        expect(favorite).toHaveProperty('created_at');
      }
    });

    it('favorites are marked as favourited', async () => {
      const favorites = await getFavorites();

      for (const favorite of favorites) {
        expect(favorite.favourited).toBe(true);
      }
    });

    it('returns expected favorite content', async () => {
      const favorites = await getFavorites();

      expect(favorites[0].id).toBe('favorite_mock_1');
      expect(favorites[0].content).toContain('favorited post');
    });
  });
});
