import { beforeEach, describe, expect, it } from 'vitest';
import { Account } from '../../src/mastodon/types/account';
import {
  getSidebarUser,
  saveSidebarUser,
} from '../../src/services/sidebar-cache';
import {
  clearTimelineCache,
  getTimelineCache,
  saveTimelineCache,
} from '../../src/services/timeline-cache';
import {
  checkNewNotifications,
  markNotificationsRead,
} from '../../src/mastodon/api/notifications';
import {
  getAccountScopedLocalStorageKey,
  getAccountScopedSessionStorageKey,
} from '../../src/utils/account-scoped-storage';
import { getPreloadedNotifications } from '../../src/services/preload';

function setActiveAccount(
  accountKey: string,
  server: string,
  accountId: string
) {
  localStorage.setItem(
    'coho:auth-session',
    JSON.stringify({
      version: 1,
      activeAccountKey: accountKey,
      accounts: [
        {
          accountKey,
          server,
          accountId,
          accessToken: `token-${accountId}`,
          acct: `user${accountId}`,
          displayName: `User ${accountId}`,
          avatar: '',
          lastUsedAt: Date.now(),
        },
      ],
    })
  );
  localStorage.setItem('server', server);
  localStorage.setItem('accessToken', `token-${accountId}`);
  localStorage.setItem('token', `token-${accountId}`);
}

describe('account-scoped caches', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('isolates sidebar cache entries per active account', () => {
    const user = {
      id: '1',
      acct: 'alice',
      display_name: 'Alice',
      avatar: '',
    } as Account;

    setActiveAccount('tech.lgbt::1', 'tech.lgbt', '1');
    saveSidebarUser(user);

    expect(getSidebarUser()?.id).toBe('1');

    setActiveAccount('hachyderm.io::2', 'hachyderm.io', '2');
    expect(getSidebarUser()).toBeNull();
  });

  it('isolates timeline session caches per active account', () => {
    setActiveAccount('tech.lgbt::1', 'tech.lgbt', '1');
    saveTimelineCache('home', [{ id: 'post-1' }] as any, 42);

    expect(getTimelineCache('home')?.scrollPosition).toBe(42);

    setActiveAccount('hachyderm.io::2', 'hachyderm.io', '2');
    expect(getTimelineCache('home')).toBeNull();
  });

  it('clears only timeline caches for the active account namespace', () => {
    sessionStorage.setItem(
      getAccountScopedSessionStorageKey('timeline_cache:home', 'tech.lgbt::1'),
      JSON.stringify({
        data: [{ id: 'post-1' }],
        timestamp: Date.now(),
        timelineType: 'home',
        scrollPosition: 0,
      })
    );
    sessionStorage.setItem(
      getAccountScopedSessionStorageKey(
        'timeline_cache:home',
        'hachyderm.io::2'
      ),
      JSON.stringify({
        data: [{ id: 'post-2' }],
        timestamp: Date.now(),
        timelineType: 'home',
        scrollPosition: 0,
      })
    );
    sessionStorage.setItem(
      'coho:account:tech.lgbt::1:session:not_timeline',
      '1'
    );

    setActiveAccount('tech.lgbt::1', 'tech.lgbt', '1');
    clearTimelineCache();

    expect(
      sessionStorage.getItem(
        getAccountScopedSessionStorageKey('timeline_cache:home', 'tech.lgbt::1')
      )
    ).toBeNull();
    expect(
      sessionStorage.getItem(
        getAccountScopedSessionStorageKey(
          'timeline_cache:home',
          'hachyderm.io::2'
        )
      )
    ).toBeTruthy();
    expect(
      sessionStorage.getItem('coho:account:tech.lgbt::1:session:not_timeline')
    ).toBe('1');
  });

  it('reads preloaded notifications from the active account namespace only', () => {
    setActiveAccount('tech.lgbt::1', 'tech.lgbt', '1');
    sessionStorage.setItem(
      getAccountScopedSessionStorageKey('preload:notifications'),
      JSON.stringify({
        data: [{ id: 'notify-1' }],
        timestamp: Date.now(),
      })
    );

    expect(getPreloadedNotifications()?.[0]?.id).toBe('notify-1');

    setActiveAccount('hachyderm.io::2', 'hachyderm.io', '2');
    expect(getPreloadedNotifications()).toBeNull();
  });

  it('scopes notification read markers by active account', async () => {
    setActiveAccount('tech.lgbt::1', 'tech.lgbt', '1');
    await markNotificationsRead();

    expect(
      localStorage.getItem(
        getAccountScopedLocalStorageKey('lastReadNotificationId')
      )
    ).toBeTruthy();

    setActiveAccount('hachyderm.io::2', 'hachyderm.io', '2');
    const hasNew = await checkNewNotifications();

    expect(hasNew).toBe(false);
    expect(
      localStorage.getItem(
        getAccountScopedLocalStorageKey('lastReadNotificationId')
      )
    ).toBeTruthy();
  });
});
