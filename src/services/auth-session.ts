import { del, set } from 'idb-keyval';
import type { AccountChangedDetail } from '../types/events';
import { FIREBASE_FUNCTIONS_BASE_URL } from '../config/firebase';

const AUTH_SESSION_STORAGE_KEY = 'coho:auth-session';
const AUTH_SESSION_VERSION = 2;
const GUEST_SERVER = 'mastodon.social';
const ACTIVE_ACCOUNT_IDB_KEY = 'activeAccountKey';
const LEGACY_ACCOUNT_ID = '__legacy__';

export const ACCOUNT_CHANGED_EVENT = 'coho:account-changed';

export interface AuthAccountRecord {
  accountKey: string;
  server: string;
  accountId: string;
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
  acct: string;
  displayName: string;
  avatar: string;
  lastUsedAt: number;
}

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface AuthSessionStore {
  version: number;
  activeAccountKey: string | null;
  accounts: AuthAccountRecord[];
}

export interface AccountMutationResult {
  removedAccountKey: string | null;
  previousActiveAccountKey: string | null;
  activeAccountKey: string | null;
  removedActiveAccount: boolean;
  remainingAccounts: number;
}

interface OAuthAccountProfile {
  id: string;
  username?: string;
  acct?: string;
  display_name?: string;
  avatar?: string;
}

const defaultStore = (): AuthSessionStore => ({
  version: AUTH_SESSION_VERSION,
  activeAccountKey: null,
  accounts: [],
});

function normalizeServer(server: string): string {
  return server.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function buildAccountKey(server: string, accountId: string): string {
  return `${normalizeServer(server)}::${accountId}`;
}

function sortAccounts(accounts: AuthAccountRecord[]): AuthAccountRecord[] {
  return [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

function readStore(): AuthSessionStore {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return defaultStore();
    }

    const parsed = JSON.parse(raw) as Partial<AuthSessionStore>;
    if (
      (parsed.version !== AUTH_SESSION_VERSION && parsed.version !== 1) ||
      !Array.isArray(parsed.accounts)
    ) {
      return defaultStore();
    }

    const accounts = parsed.accounts
      .filter((account): account is AuthAccountRecord =>
        Boolean(
          account &&
          account.accountKey &&
          account.server &&
          account.accountId &&
          account.accessToken
        )
      )
      .map((account) => ({
        ...account,
        server: normalizeServer(account.server),
        lastUsedAt:
          typeof account.lastUsedAt === 'number'
            ? account.lastUsedAt
            : Date.now(),
        acct: account.acct || account.accountId,
        displayName: account.displayName || account.acct || account.accountId,
        avatar: account.avatar || '',
      }));

    return {
      version: AUTH_SESSION_VERSION,
      activeAccountKey: parsed.activeAccountKey || null,
      accounts: sortAccounts(accounts),
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: AuthSessionStore): AuthSessionStore {
  const normalized: AuthSessionStore = {
    version: AUTH_SESSION_VERSION,
    activeAccountKey: store.activeAccountKey,
    accounts: sortAccounts(store.accounts),
  };
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function getLegacyMigrationRecord(): AuthAccountRecord | null {
  const accessToken = localStorage.getItem('accessToken');
  const server = localStorage.getItem('server');

  if (!accessToken || !server) {
    return null;
  }

  const normalizedServer = normalizeServer(server);
  const accountId = localStorage.getItem('currentUserID') || LEGACY_ACCOUNT_ID;
  const accountKey = buildAccountKey(normalizedServer, accountId);
  const label = localStorage.getItem('currentUserID') || normalizedServer;

  return {
    accountKey,
    server: normalizedServer,
    accountId,
    accessToken,
    acct: label,
    displayName: label,
    avatar: '',
    lastUsedAt: Date.now(),
  };
}

function migrateLegacyStore(store: AuthSessionStore): AuthSessionStore {
  if (store.accounts.length > 0) {
    return store;
  }

  const legacyRecord = getLegacyMigrationRecord();
  if (!legacyRecord) {
    return store;
  }

  return {
    version: AUTH_SESSION_VERSION,
    activeAccountKey: legacyRecord.accountKey,
    accounts: [legacyRecord],
  };
}

function resolveActiveAccount(
  store: AuthSessionStore
): AuthAccountRecord | null {
  if (!store.activeAccountKey) {
    return null;
  }

  return (
    store.accounts.find(
      (account) => account.accountKey === store.activeAccountKey
    ) || null
  );
}

function projectActiveAccountToLegacyKeys(store: AuthSessionStore): void {
  const activeAccount = resolveActiveAccount(store);

  if (activeAccount) {
    localStorage.setItem('accessToken', activeAccount.accessToken);
    localStorage.setItem('server', activeAccount.server);
    localStorage.setItem('currentUserID', activeAccount.accountId);
    localStorage.removeItem('guestMode');
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUserID');

  if (localStorage.getItem('guestMode') === 'true') {
    localStorage.setItem('server', GUEST_SERVER);
  } else {
    localStorage.removeItem('server');
  }
}

function emitAccountChanged(
  previousActiveAccountKey: string | null,
  newActiveAccountKey: string | null,
  reason: string
): void {
  if (previousActiveAccountKey === newActiveAccountKey) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AccountChangedDetail>(ACCOUNT_CHANGED_EVENT, {
      detail: {
        previousActiveAccountKey,
        newActiveAccountKey,
        reason,
      },
    })
  );
}

async function cleanupPreviousAccountPushSubscription(): Promise<void> {
  try {
    const { unsubToPush } = await import('./notifications');
    await unsubToPush();
  } catch (error) {
    console.warn('[auth-session] Failed to clean up push subscription', error);
  }
}

async function exchangeActiveCredentialsWithIndexedDb(
  store: AuthSessionStore
): Promise<void> {
  const activeAccount = resolveActiveAccount(store);

  if (!activeAccount) {
    await Promise.allSettled([
      del('accessToken'),
      del('server'),
      del(ACTIVE_ACCOUNT_IDB_KEY),
    ]);
    return;
  }

  await Promise.all([
    set('accessToken', activeAccount.accessToken),
    set('server', activeAccount.server),
    set(ACTIVE_ACCOUNT_IDB_KEY, activeAccount.accountKey),
  ]);
}

async function fetchOAuthAccountProfile(
  server: string,
  accessToken: string
): Promise<OAuthAccountProfile> {
  const response = await fetch(
    `https://${normalizeServer(server)}/api/v1/accounts/verify_credentials`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to verify account credentials (HTTP ${response.status})`
    );
  }

  return response.json();
}

function upsertAccountRecord(
  store: AuthSessionStore,
  record: AuthAccountRecord,
  previousAccountKey?: string
): AuthSessionStore {
  const existingIndex = store.accounts.findIndex(
    (account) =>
      account.accountKey === record.accountKey ||
      (previousAccountKey && account.accountKey === previousAccountKey) ||
      (account.server === record.server &&
        account.accessToken === record.accessToken)
  );

  const nextAccounts = [...store.accounts];
  if (existingIndex >= 0) {
    nextAccounts.splice(existingIndex, 1, {
      ...nextAccounts[existingIndex],
      ...record,
    });
  } else {
    nextAccounts.push(record);
  }

  return {
    version: AUTH_SESSION_VERSION,
    activeAccountKey: record.accountKey,
    accounts: sortAccounts(nextAccounts),
  };
}

export async function bootstrapSession(): Promise<AuthSessionStore> {
  let store = migrateLegacyStore(readStore());
  const hasAccounts = store.accounts.length > 0;
  const hasActiveAccount = resolveActiveAccount(store);

  if (hasAccounts && !hasActiveAccount) {
    store = {
      ...store,
      activeAccountKey: store.accounts[0].accountKey,
    };
  }

  store = writeStore(store);
  projectActiveAccountToLegacyKeys(store);
  await exchangeActiveCredentialsWithIndexedDb(store);
  return store;
}

export function listAccounts(): AuthAccountRecord[] {
  return sortAccounts(readStore().accounts);
}

export function getActiveAccount(): AuthAccountRecord | null {
  return resolveActiveAccount(readStore());
}

export function hasAuthenticatedAccount(): boolean {
  return listAccounts().length > 0;
}

export async function syncActiveToIndexedDb(): Promise<void> {
  await exchangeActiveCredentialsWithIndexedDb(readStore());
}

export async function upsertAccountFromOAuth(
  server: string,
  accessToken: string,
  clientCredentials?: OAuthClientCredentials
): Promise<AuthAccountRecord> {
  const normalizedServer = normalizeServer(server);
  const profile = await fetchOAuthAccountProfile(normalizedServer, accessToken);
  const previousStore = readStore();
  const previousActiveAccountKey = previousStore.activeAccountKey;
  const previousPlaceholder =
    previousStore.accounts.find(
      (account) =>
        account.server === normalizedServer &&
        account.accessToken === accessToken &&
        account.accountId === LEGACY_ACCOUNT_ID
    ) || null;

  const record: AuthAccountRecord = {
    accountKey: buildAccountKey(normalizedServer, profile.id),
    server: normalizedServer,
    accountId: profile.id,
    accessToken,
    clientId: clientCredentials?.clientId,
    clientSecret: clientCredentials?.clientSecret,
    acct: profile.acct || profile.username || profile.id,
    displayName:
      profile.display_name || profile.username || profile.acct || profile.id,
    avatar: profile.avatar || '',
    lastUsedAt: Date.now(),
  };

  const nextStore = writeStore(
    upsertAccountRecord(previousStore, record, previousPlaceholder?.accountKey)
  );

  projectActiveAccountToLegacyKeys(nextStore);
  await exchangeActiveCredentialsWithIndexedDb(nextStore);
  emitAccountChanged(
    previousActiveAccountKey,
    nextStore.activeAccountKey,
    'oauth'
  );

  return record;
}

export async function switchAccount(
  accountKey: string
): Promise<AuthAccountRecord> {
  const store = readStore();
  const target = store.accounts.find(
    (account) => account.accountKey === accountKey
  );

  if (!target) {
    throw new Error(`Account not found: ${accountKey}`);
  }

  if (store.activeAccountKey === accountKey) {
    return target;
  }

  await cleanupPreviousAccountPushSubscription();

  const previousActiveAccountKey = store.activeAccountKey;
  const nextStore = writeStore({
    version: AUTH_SESSION_VERSION,
    activeAccountKey: accountKey,
    accounts: store.accounts.map((account) =>
      account.accountKey === accountKey
        ? { ...account, lastUsedAt: Date.now() }
        : account
    ),
  });

  projectActiveAccountToLegacyKeys(nextStore);
  await exchangeActiveCredentialsWithIndexedDb(nextStore);
  emitAccountChanged(
    previousActiveAccountKey,
    nextStore.activeAccountKey,
    'switch'
  );

  return resolveActiveAccount(nextStore) as AuthAccountRecord;
}

export async function removeAccount(
  accountKey: string,
  reason: string = 'remove'
): Promise<AccountMutationResult> {
  const store = readStore();
  const existing = store.accounts.find(
    (account) => account.accountKey === accountKey
  );

  if (!existing) {
    return {
      removedAccountKey: null,
      previousActiveAccountKey: store.activeAccountKey,
      activeAccountKey: store.activeAccountKey,
      removedActiveAccount: false,
      remainingAccounts: store.accounts.length,
    };
  }

  const removedActiveAccount = store.activeAccountKey === accountKey;
  if (removedActiveAccount) {
    await cleanupPreviousAccountPushSubscription();
  }

  // Revoke the OAuth token on the Mastodon server
  if (existing.clientId && existing.clientSecret && existing.accessToken) {
    try {
      await fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/revokeToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: existing.server,
          clientId: existing.clientId,
          clientSecret: existing.clientSecret,
          token: existing.accessToken,
        }),
      });
    } catch {
      // Best-effort revocation — don't block account removal on network errors
    }
  }

  const remainingAccounts = sortAccounts(
    store.accounts.filter((account) => account.accountKey !== accountKey)
  );
  const fallbackActiveAccount = removedActiveAccount
    ? remainingAccounts[0] || null
    : resolveActiveAccount(store);

  const nextStore = writeStore({
    version: AUTH_SESSION_VERSION,
    activeAccountKey: fallbackActiveAccount?.accountKey || null,
    accounts: remainingAccounts.map((account) =>
      fallbackActiveAccount &&
      removedActiveAccount &&
      account.accountKey === fallbackActiveAccount.accountKey
        ? { ...account, lastUsedAt: Date.now() }
        : account
    ),
  });

  projectActiveAccountToLegacyKeys(nextStore);
  await exchangeActiveCredentialsWithIndexedDb(nextStore);
  emitAccountChanged(
    store.activeAccountKey,
    nextStore.activeAccountKey,
    reason
  );

  return {
    removedAccountKey: accountKey,
    previousActiveAccountKey: store.activeAccountKey,
    activeAccountKey: nextStore.activeAccountKey,
    removedActiveAccount,
    remainingAccounts: nextStore.accounts.length,
  };
}

export async function invalidateActiveAccount(): Promise<AccountMutationResult> {
  const activeAccount = getActiveAccount();

  if (!activeAccount) {
    const store = readStore();
    return {
      removedAccountKey: null,
      previousActiveAccountKey: null,
      activeAccountKey: null,
      removedActiveAccount: false,
      remainingAccounts: store.accounts.length,
    };
  }

  return removeAccount(activeAccount.accountKey, 'unauthorized');
}

export async function syncActiveAccountProfile(
  profile: OAuthAccountProfile
): Promise<void> {
  const store = readStore();
  const activeAccount = resolveActiveAccount(store);

  if (!activeAccount) {
    return;
  }

  const nextStore = writeStore(
    upsertAccountRecord(
      store,
      {
        ...activeAccount,
        accountKey: buildAccountKey(activeAccount.server, profile.id),
        accountId: profile.id,
        acct: profile.acct || profile.username || profile.id,
        displayName:
          profile.display_name ||
          profile.username ||
          profile.acct ||
          profile.id,
        avatar: profile.avatar || '',
      },
      activeAccount.accountKey
    )
  );

  projectActiveAccountToLegacyKeys(nextStore);
  await exchangeActiveCredentialsWithIndexedDb(nextStore);
}
