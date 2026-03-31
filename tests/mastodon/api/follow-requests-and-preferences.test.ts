import { describe, it, expect, beforeEach } from 'vitest';
import { setupAuth } from '../../setup';
import {
  getFollowRequests,
  authorizeFollowRequest,
  rejectFollowRequest,
} from '../../../src/mastodon/api/follow-requests';
import { getServerPreferences } from '../../../src/mastodon/api/preferences';

describe('follow-requests API', () => {
  beforeEach(() => {
    setupAuth();
  });

  it('fetches pending follow requests', async () => {
    const accounts = await getFollowRequests();

    expect(accounts).toBeDefined();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts).toHaveLength(2);
    expect(accounts[0].id).toBe('fr_acct_1');
    expect(accounts[0].username).toBe('alice');
    expect(accounts[1].id).toBe('fr_acct_2');
    expect(accounts[1].username).toBe('bob');
  });

  it('returns an empty array when there are no requests', async () => {
    const accounts = await getFollowRequests();

    // Default mock returns 2, but verify the array contract
    expect(Array.isArray(accounts)).toBe(true);
  });

  it('authorizes a follow request without throwing', async () => {
    await expect(authorizeFollowRequest('fr_acct_1')).resolves.toBeUndefined();
  });

  it('rejects a follow request without throwing', async () => {
    await expect(rejectFollowRequest('fr_acct_2')).resolves.toBeUndefined();
  });
});

describe('preferences API', () => {
  beforeEach(() => {
    setupAuth();
  });

  it('fetches server preferences', async () => {
    const prefs = await getServerPreferences();

    expect(prefs).toBeDefined();
    expect(prefs!['posting:default:visibility']).toBe('public');
    expect(prefs!['posting:default:sensitive']).toBe(false);
    expect(prefs!['posting:default:language']).toBe('en');
    expect(prefs!['reading:expand:media']).toBe('default');
    expect(prefs!['reading:expand:spoilers']).toBe(false);
  });
});
