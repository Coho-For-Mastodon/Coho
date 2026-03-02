import { describe, expect, it } from 'vitest';
import {
  isSyncableRequest,
  SYNCABLE_PATTERNS,
} from '../../src/sw/syncable-patterns';

describe('syncable-patterns', () => {
  // ==========================================================================
  // isSyncableRequest
  // ==========================================================================

  describe('isSyncableRequest', () => {
    it('rejects GET requests', () => {
      const url = new URL('https://mastodon.social/api/v1/statuses');
      expect(isSyncableRequest(url, 'GET')).toBe(false);
    });

    it.each([
      ['create post', '/api/v1/statuses', 'POST'],
      ['edit post', '/api/v1/statuses/12345', 'PUT'],
      ['delete post', '/api/v1/statuses/12345', 'DELETE'],
      ['favourite', '/api/v1/statuses/12345/favourite', 'POST'],
      ['unfavourite', '/api/v1/statuses/12345/unfavourite', 'POST'],
      ['reblog', '/api/v1/statuses/12345/reblog', 'POST'],
      ['unreblog', '/api/v1/statuses/12345/unreblog', 'POST'],
      ['bookmark', '/api/v1/statuses/12345/bookmark', 'POST'],
      ['unbookmark', '/api/v1/statuses/12345/unbookmark', 'POST'],
      ['pin', '/api/v1/statuses/12345/pin', 'POST'],
      ['unpin', '/api/v1/statuses/12345/unpin', 'POST'],
      ['mute conversation', '/api/v1/statuses/12345/mute', 'POST'],
      ['unmute conversation', '/api/v1/statuses/12345/unmute', 'POST'],
      ['follow', '/api/v1/accounts/12345/follow', 'POST'],
      ['unfollow', '/api/v1/accounts/12345/unfollow', 'POST'],
      ['block', '/api/v1/accounts/12345/block', 'POST'],
      ['unblock', '/api/v1/accounts/12345/unblock', 'POST'],
      ['mute account', '/api/v1/accounts/12345/mute', 'POST'],
      ['unmute account', '/api/v1/accounts/12345/unmute', 'POST'],
      ['vote in poll', '/api/v1/polls/12345/votes', 'POST'],
      ['clear notifications', '/api/v1/notifications/clear', 'POST'],
      ['dismiss notification', '/api/v1/notifications/12345/dismiss', 'POST'],
    ])('matches %s (%s %s)', (_label, pathname, method) => {
      const url = new URL(`https://mastodon.social${pathname}`);
      expect(isSyncableRequest(url, method)).toBe(true);
    });

    it('does not match non-API paths', () => {
      const url = new URL('https://mastodon.social/home');
      expect(isSyncableRequest(url, 'POST')).toBe(false);
    });

    it('does not match GET timeline requests', () => {
      const url = new URL('https://mastodon.social/api/v1/timelines/home');
      expect(isSyncableRequest(url, 'GET')).toBe(false);
    });

    it('does not match GET notifications', () => {
      const url = new URL('https://mastodon.social/api/v1/notifications');
      expect(isSyncableRequest(url, 'GET')).toBe(false);
    });
  });

  describe('SYNCABLE_PATTERNS', () => {
    it('has 21 patterns', () => {
      expect(SYNCABLE_PATTERNS).toHaveLength(21);
    });

    it('all patterns are RegExp instances', () => {
      for (const pattern of SYNCABLE_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });
});
