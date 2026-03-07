import { getActiveAccount } from '../services/auth-session';

const STORAGE_PREFIX = 'coho:account';

function getNamespace(accountKey?: string | null): string {
  return accountKey || getActiveAccount()?.accountKey || 'guest';
}

function buildScopedKey(
  area: 'local' | 'session' | 'idb',
  key: string,
  accountKey?: string | null
): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getNamespace(accountKey))}:${area}:${key}`;
}

export function getAccountScopedLocalStorageKey(
  key: string,
  accountKey?: string | null
): string {
  return buildScopedKey('local', key, accountKey);
}

export function getAccountScopedSessionStorageKey(
  key: string,
  accountKey?: string | null
): string {
  return buildScopedKey('session', key, accountKey);
}

export function getAccountScopedIdbKey(
  key: string,
  accountKey?: string | null
): string {
  return buildScopedKey('idb', key, accountKey);
}

export function getPeriodicTimelineCacheKey(
  accountKey?: string | null
): string {
  return getAccountScopedIdbKey('timeline-cache', accountKey);
}
