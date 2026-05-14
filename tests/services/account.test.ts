import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../auth-helpers';
import {
  mockAccountProfile,
  mockBlockedAccounts,
  mockLookupImportAccount,
  mockMutedAccounts,
} from '../mocks/mock-data';

// Import the service functions we want to test
import {
  getCredentials,
  fetchAllBlockedAccounts,
  fetchAllMutedAccounts,
  importBlocksOrMutesFromCsv,
} from '../../src/services/account';

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

  describe('block/mute lists and CSV import', () => {
    it('fetchAllBlockedAccounts aggregates paginated results', async () => {
      const list = await fetchAllBlockedAccounts();
      expect(list).toHaveLength(mockBlockedAccounts.length);
      expect(list.map((a) => a.id).sort()).toEqual(
        mockBlockedAccounts.map((a) => a.id).sort()
      );
    });

    it('fetchAllMutedAccounts aggregates paginated results', async () => {
      const list = await fetchAllMutedAccounts();
      expect(list).toHaveLength(mockMutedAccounts.length);
    });

    it('importBlocksOrMutesFromCsv resolves lookup and blocks', async () => {
      const csv = `Account address
importme@remote.social
`;
      const result = await importBlocksOrMutesFromCsv('block', csv, {
        existingAccountIds: new Set(),
        selfAccountId: mockAccountProfile.id,
      });
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.newAccounts[0]?.id).toBe(mockLookupImportAccount.id);
    });

    it('importBlocksOrMutesFromCsv skips existing ids', async () => {
      const csv = 'importme@remote.social';
      const result = await importBlocksOrMutesFromCsv('mute', csv, {
        existingAccountIds: new Set([mockLookupImportAccount.id]),
        selfAccountId: null,
      });
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });
});
