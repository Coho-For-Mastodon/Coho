import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupFixtures, elementUpdated, fixture, html } from '../test-utils';

const hoisted = vi.hoisted(() => {
  const accounts = [
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
  ];

  return {
    accounts,
    listAccounts: vi.fn(() => accounts),
    getActiveAccount: vi.fn(() => accounts[0]),
    switchAccount: vi.fn().mockResolvedValue(accounts[1]),
    removeAccount: vi.fn().mockResolvedValue({
      removedAccountKey: accounts[0].accountKey,
      previousActiveAccountKey: accounts[0].accountKey,
      activeAccountKey: null,
      removedActiveAccount: true,
      remainingAccounts: 0,
    }),
    initAuth: vi.fn().mockResolvedValue(undefined),
    searchInstances: vi.fn().mockResolvedValue([]),
    setAuthRedirect: vi.fn(),
    reloadWindow: vi.fn(),
    navigate: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../src/services/auth-session', () => ({
  listAccounts: hoisted.listAccounts,
  getActiveAccount: hoisted.getActiveAccount,
  switchAccount: hoisted.switchAccount,
  removeAccount: hoisted.removeAccount,
}));

vi.mock('../../src/services/account', () => ({
  initAuth: hoisted.initAuth,
}));

vi.mock('../../src/services/instance-search', () => ({
  POPULAR_INSTANCES: [],
  searchInstances: hoisted.searchInstances,
}));

vi.mock('../../src/utils/auth-redirect', () => ({
  setAuthRedirect: hoisted.setAuthRedirect,
}));

vi.mock('../../src/utils/reload-window', () => ({
  reloadWindow: hoisted.reloadWindow,
}));

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

import '../../src/components/account-manager';
import type { AccountManager } from '../../src/components/account-manager';

async function flushComponent(el: AccountManager): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await elementUpdated(el);
}

describe('account-manager', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
    hoisted.listAccounts.mockImplementation(() => hoisted.accounts);
    hoisted.getActiveAccount.mockImplementation(() => hoisted.accounts[0]);
  });

  it('renders saved accounts and marks the active account', async () => {
    const el = await fixture<AccountManager>(
      html`<account-manager></account-manager>`
    );
    await flushComponent(el);

    const rows = el.shadowRoot?.querySelectorAll('.account-row');
    expect(rows?.length).toBe(2);
    expect(el.shadowRoot?.textContent).toContain('Alice');
    expect(el.shadowRoot?.textContent).toContain('Active');
    expect(el.shadowRoot?.textContent).toContain('Bob');
  });

  it('switches accounts and triggers a reload', async () => {
    const el = await fixture<AccountManager>(
      html`<account-manager></account-manager>`
    );
    await flushComponent(el);

    const switchButton = Array.from(
      el.shadowRoot?.querySelectorAll('md-button') || []
    ).find((button) => button.textContent?.includes('Switch'));

    (
      switchButton?.shadowRoot?.querySelector('button') as HTMLButtonElement
    ).click();
    await flushComponent(el);

    expect(hoisted.switchAccount).toHaveBeenCalledWith('hachyderm.io::2');
    expect(hoisted.reloadWindow).toHaveBeenCalledTimes(1);
  });

  it('removes the active account and routes to login when none remain', async () => {
    const el = await fixture<AccountManager>(
      html`<account-manager></account-manager>`
    );
    await flushComponent(el);

    hoisted.listAccounts.mockImplementation(() => []);
    hoisted.getActiveAccount.mockImplementation(() => null);

    const removeButton = Array.from(
      el.shadowRoot?.querySelectorAll('md-button') || []
    ).find((button) => button.textContent?.includes('Remove'));

    (
      removeButton?.shadowRoot?.querySelector('button') as HTMLButtonElement
    ).click();
    await flushComponent(el);

    expect(hoisted.removeAccount).toHaveBeenCalledWith('tech.lgbt::1');
    expect(hoisted.navigate).toHaveBeenCalledWith('/');
    expect(hoisted.reloadWindow).not.toHaveBeenCalled();
  });
});
