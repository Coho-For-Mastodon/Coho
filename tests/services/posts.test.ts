import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../setup';
import { mockTimelinePosts, mockEditHistory } from '../mocks/mock-data';

// Import the service functions we want to test
import { getPostDetail, getEditHistory } from '../../src/services/posts';

describe('posts service', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('getPostDetail', () => {
    it('fetches a post by ID', async () => {
      const post = await getPostDetail('post_mock_1');

      expect(post).toBeDefined();
      expect(post.id).toBe('post_mock_1');
      expect(post.content).toContain('Welcome to the mocked timeline!');
      expect(post.account.username).toBe('coho');
    });

    it('returns the correct post when fetching second post', async () => {
      const post = await getPostDetail('post_mock_2');

      expect(post).toBeDefined();
      expect(post.id).toBe('post_mock_2');
      expect(post.content).toContain('Timeline post number two');
    });

    it('throws an error when post is not found', async () => {
      await expect(getPostDetail('nonexistent_post')).rejects.toThrow(
        'Record not found'
      );
    });

    it('includes all expected post properties', async () => {
      const post = await getPostDetail('post_mock_1');

      // Verify structure matches expected Post interface
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('created_at');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('account');
      expect(post).toHaveProperty('favourited');
      expect(post).toHaveProperty('reblogged');
      expect(post).toHaveProperty('bookmarked');
      expect(post).toHaveProperty('visibility');
    });
  });

  describe('post data integrity', () => {
    it('has correct mock data structure', () => {
      expect(mockTimelinePosts).toHaveLength(2);
      expect(mockTimelinePosts[0].id).toBe('post_mock_1');
      expect(mockTimelinePosts[1].id).toBe('post_mock_2');
    });

    it('posts have valid timestamps', () => {
      for (const post of mockTimelinePosts) {
        expect(post.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe('getEditHistory', () => {
    it('fetches edit history for a post', async () => {
      const history = await getEditHistory('post_mock_1');

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(2);
    });

    it('returns versions with expected structure', async () => {
      const history = await getEditHistory('post_mock_1');

      expect(history[0]).toHaveProperty('content');
      expect(history[0]).toHaveProperty('spoiler_text');
      expect(history[0]).toHaveProperty('sensitive');
      expect(history[0]).toHaveProperty('created_at');
      expect(history[0]).toHaveProperty('account');
      expect(history[0]).toHaveProperty('media_attachments');
      expect(history[0]).toHaveProperty('emojis');
    });

    it('returns most recent version first', async () => {
      const history = await getEditHistory('post_mock_1');

      expect(history[0].content).toContain('(edited)');
      expect(history[1].content).not.toContain('(edited)');
    });

    it('throws an error when post is not found', async () => {
      await expect(getEditHistory('nonexistent_post')).rejects.toThrow(
        'Record not found'
      );
    });
  });
});
