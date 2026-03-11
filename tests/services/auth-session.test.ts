import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clear, get } from 'idb-keyval';

vi.mock('../../src/services/notifications', () => ({
  unsubToPush: vi.fn().mockResolvedValue(undefined),
}));

import {
  bootstrapSession,
  getActiveAccount,
  hasAuthenticatedAccount,
  invalidateActiveAccount,
  listAccounts,
  removeAccount,
  switchAccount,
  syncActiveToIndexedDb,
  upsertAccountFromOAuth,
} from '../../src/services/auth-session';

function seedStore() {
  localStorage.setItem(
    'coho:auth-session',
    JSON.stringify({
      version: 1,
      activeAccountKey: 'tech.lgbt::1',
      accounts: [
        {
          accountKey: 'tech.lgbt::1',
          server: 'tech.lgbt',
          accountId: '1',
          accessToken: 'token-a',
          acct: 'alice',
          displayName: 'Alice',
          avatar: '',
          lastUsedAt: 20,
        },
        {
          accountKey: 'hachyderm.io::2',
          server: 'hachyderm.io',
          accountId: '2',
          accessToken: 'token-b',
          acct: 'bob',
          displayName: 'Bob',
          avatar: '',
          lastUsedAt: 10,
        },
      ],
    })
  );
}

describe('auth-session service', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await clear();
    vi.restoreAllMocks();
  });

  it('migrates legacy singleton auth keys into the multi-account store', async () => {
    localStorage.setItem('accessToken', 'legacy-token');
    localStorage.setItem('token', 'legacy-token');
    localStorage.setItem('server', 'tech.lgbt');
    localStorage.setItem('currentUserID', 'self');

    const store = await bootstrapSession();

    expect(store.accounts).toHaveLength(1);
    expect(store.activeAccountKey).toBe('tech.lgbt::self');
    expect(hasAuthenticatedAccount()).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('legacy-token');
    expect(await get('accessToken')).toBe('legacy-token');
    expect(await get('server')).toBe('tech.lgbt');
    expect(await get('activeAccountKey')).toBe('tech.lgbt::self');
  });

  it('upserts an OAuth account and makes it active', async () => {
    seedStore();
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '3',
          username: 'carol',
          acct: 'carol',
          display_name: 'Carol',
          avatar: 'https://cdn.example/avatar.png',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const record = await upsertAccountFromOAuth('mastodon.social', 'token-c');

    expect(record.accountKey).toBe('mastodon.social::3');
    expect(getActiveAccount()?.accountKey).toBe('mastodon.social::3');
    expect(listAccounts().map((account) => account.accountKey)).toEqual([
      'mastodon.social::3',
      'tech.lgbt::1',
      'hachyderm.io::2',
    ]);
    expect(localStorage.getItem('server')).toBe('mastodon.social');
    expect(localStorage.getItem('currentUserID')).toBe('3');
  });

  it('stores client credentials when provided to upsertAccountFromOAuth', async () => {
    seedStore();
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '3',
          username: 'carol',
          acct: 'carol',
          display_name: 'Carol',
          avatar: 'https://cdn.example/avatar.png',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );

    const record = await upsertAccountFromOAuth('mastodon.social', 'token-c', {
      clientId: 'cid-123',
      clientSecret: 'csec-456',
    });

    expect(record.clientId).toBe('cid-123');
    expect(record.clientSecret).toBe('csec-456');
  });

  it('switches the active account, syncs the legacy projection, and emits an event', async () => {
    seedStore();
    const changed = vi.fn();
    window.addEventListener('coho:account-changed', changed);

    await switchAccount('hachyderm.io::2');

    expect(getActiveAccount()?.accountKey).toBe('hachyderm.io::2');
    expect(localStorage.getItem('accessToken')).toBe('token-b');
    expect(localStorage.getItem('server')).toBe('hachyderm.io');
    expect(localStorage.getItem('currentUserID')).toBe('2');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(await get('activeAccountKey')).toBe('hachyderm.io::2');
    window.removeEventListener('coho:account-changed', changed);
  });

  it('removes the active account and auto-switches to the most recent remaining account', async () => {
    seedStore();

    const result = await removeAccount('tech.lgbt::1');

    expect(result.removedActiveAccount).toBe(true);
    expect(result.activeAccountKey).toBe('hachyderm.io::2');
    expect(getActiveAccount()?.accountKey).toBe('hachyderm.io::2');
    expect(localStorage.getItem('accessToken')).toBe('token-b');
    expect(listAccounts()).toHaveLength(1);
  });

  it('calls revokeToken when removing an account with client credentials', async () => {
    localStorage.setItem(
      'coho:auth-session',
      JSON.stringify({
        version: 2,
        activeAccountKey: 'tech.lgbt::1',
        accounts: [
          {
            accountKey: 'tech.lgbt::1',
            server: 'tech.lgbt',
            accountId: '1',
            accessToken: 'token-a',
            clientId: 'cid-1',
            clientSecret: 'csec-1',
            acct: 'alice',
            displayName: 'Alice',
            avatar: '',
            lastUsedAt: 20,
          },
          {
            accountKey: 'hachyderm.io::2',
            server: 'hachyderm.io',
            accountId: '2',
            accessToken: 'token-b',
            acct: 'bob',
            displayName: 'Bob',
            avatar: '',
            lastUsedAt: 10,
          },
        ],
      })
    );

    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

    await removeAccount('tech.lgbt::1');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/revokeToken'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"token":"token-a"'),
      })
    );
  });

  it('reads a version 2 store with clientId and clientSecret fields', async () => {
    localStorage.setItem(
      'coho:auth-session',
      JSON.stringify({
        version: 2,
        activeAccountKey: 'tech.lgbt::1',
        accounts: [
          {
            accountKey: 'tech.lgbt::1',
            server: 'tech.lgbt',
            accountId: '1',
            accessToken: 'token-a',
            clientId: 'cid-1',
            clientSecret: 'csec-1',
            acct: 'alice',
            displayName: 'Alice',
            avatar: '',
            lastUsedAt: 20,
          },
        ],
      })
    );

    const store = await bootstrapSession();
    expect(store.accounts).toHaveLength(1);
    expect(store.accounts[0].clientId).toBe('cid-1');
    expect(store.accounts[0].clientSecret).toBe('csec-1');
  });

  it('invalidates the active account on 401 and clears credentials when no accounts remain', async () => {
    localStorage.setItem(
      'coho:auth-session',
      JSON.stringify({
        version: 1,
        activeAccountKey: 'tech.lgbt::1',
        accounts: [
          {
            accountKey: 'tech.lgbt::1',
            server: 'tech.lgbt',
            accountId: '1',
            accessToken: 'token-a',
            acct: 'alice',
            displayName: 'Alice',
            avatar: '',
            lastUsedAt: 20,
          },
        ],
      })
    );

    const result = await invalidateActiveAccount();

    expect(result.activeAccountKey).toBeNull();
    expect(getActiveAccount()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('server')).toBeNull();
    expect(await get('accessToken')).toBeUndefined();
  });

  it('syncs the active projection into IndexedDB on demand', async () => {
    seedStore();

    await syncActiveToIndexedDb();

    expect(await get('accessToken')).toBe('token-a');
    expect(await get('server')).toBe('tech.lgbt');
    expect(await get('activeAccountKey')).toBe('tech.lgbt::1');
  });
});
