import { describe, it, expect } from 'vitest';
import { ApiError, NetworkError } from '../../src/utils/api-client';

describe('api-client', () => {
  describe('ApiError', () => {
    it('creates error with message and status', () => {
      const error = new ApiError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('creates error with Mastodon error object', () => {
      const mastodonError = {
        error: 'Record not found',
        error_description: 'The requested resource could not be found',
      };
      const error = new ApiError('Not found', 404, mastodonError);

      expect(error.mastodonError).toBeDefined();
      expect(error.mastodonError?.error).toBe('Record not found');
      expect(error.mastodonError?.error_description).toBe(
        'The requested resource could not be found'
      );
    });

    describe('status helpers', () => {
      it('isUnauthorized returns true for 401', () => {
        const error = new ApiError('Unauthorized', 401);
        expect(error.isUnauthorized).toBe(true);
        expect(error.isForbidden).toBe(false);
      });

      it('isForbidden returns true for 403', () => {
        const error = new ApiError('Forbidden', 403);
        expect(error.isForbidden).toBe(true);
        expect(error.isUnauthorized).toBe(false);
      });

      it('isNotFound returns true for 404', () => {
        const error = new ApiError('Not found', 404);
        expect(error.isNotFound).toBe(true);
      });

      it('isRateLimited returns true for 429', () => {
        const error = new ApiError('Rate limited', 429);
        expect(error.isRateLimited).toBe(true);
      });

      it('isServerError returns true for 5xx', () => {
        expect(new ApiError('Error', 500).isServerError).toBe(true);
        expect(new ApiError('Error', 502).isServerError).toBe(true);
        expect(new ApiError('Error', 503).isServerError).toBe(true);
        expect(new ApiError('Error', 504).isServerError).toBe(true);
      });

      it('isServerError returns false for non-5xx', () => {
        expect(new ApiError('Error', 400).isServerError).toBe(false);
        expect(new ApiError('Error', 404).isServerError).toBe(false);
        expect(new ApiError('Error', 499).isServerError).toBe(false);
      });
    });

    it('is instanceof Error', () => {
      const error = new ApiError('Test', 500);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('creates error with message', () => {
      const error = new NetworkError('Network failed');

      expect(error.message).toBe('Network failed');
      expect(error.name).toBe('NetworkError');
    });

    it('creates error with original error', () => {
      const originalError = new TypeError('fetch failed');
      const error = new NetworkError('Network failed', originalError);

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe('fetch failed');
    });

    it('is instanceof Error', () => {
      const error = new NetworkError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof NetworkError).toBe(true);
    });
  });
});
