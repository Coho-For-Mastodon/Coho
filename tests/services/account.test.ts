import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../setup';
import { mockAccountProfile } from '../mocks/mock-data';

// Import the service functions we want to test
import { getCredentials } from '../../src/services/account';

describe('account service', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('getCredentials', () => {
    it('fetches current user credentials', async () => {
      const credentials = await getCredentials();

      expect(credentials).toBeDefined();
      expect(credentials.id).toBe(mockAccountProfile.id);
      expect(credentials.username).toBe(mockAccountProfile.username);
    });

    it('returns account with correct structure', async () => {
      const credentials = await getCredentials();

      expect(credentials).toHaveProperty('id');
      expect(credentials).toHaveProperty('username');
      expect(credentials).toHaveProperty('acct');
      expect(credentials).toHaveProperty('display_name');
      expect(credentials).toHaveProperty('note');
      expect(credentials).toHaveProperty('avatar');
      expect(credentials).toHaveProperty('header');
    });

    it('returns correct follower/following counts', async () => {
      const credentials = await getCredentials();

      expect(credentials.followers_count).toBe(
        mockAccountProfile.followers_count
      );
      expect(credentials.following_count).toBe(
        mockAccountProfile.following_count
      );
      expect(credentials.statuses_count).toBe(
        mockAccountProfile.statuses_count
      );
    });

    it('throws error when not authenticated', async () => {
      // Clear auth
      localStorage.clear();

      await expect(getCredentials()).rejects.toThrow('Not authenticated');
    });

    it('throws error when missing access token', async () => {
      localStorage.setItem('server', 'tech.lgbt');
      localStorage.removeItem('accessToken');

      await expect(getCredentials()).rejects.toThrow('Not authenticated');
    });

    it('throws error when missing server', async () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.removeItem('server');

      await expect(getCredentials()).rejects.toThrow('Not authenticated');
    });
  });

  describe('account data integrity', () => {
    it('account has valid url', async () => {
      const credentials = await getCredentials();

      expect(credentials.url).toMatch(/^https:\/\//);
    });

    it('account has valid avatar url', async () => {
      const credentials = await getCredentials();

      expect(credentials.avatar).toBeDefined();
      expect(credentials.avatar_static).toBeDefined();
    });

    it('account has boolean flags', async () => {
      const credentials = await getCredentials();

      expect(typeof credentials.locked).toBe('boolean');
      expect(typeof credentials.bot).toBe('boolean');
    });
  });
});
