const STORAGE_PREFIX = 'coho:account';
const AUTH_SESSION_STORAGE_KEY = 'coho:auth-session';

interface AuthSessionStoreShape {
  activeAccountKey?: string | null;
}

function getActiveAccountKeyFromSessionStore(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSessionStoreShape;
    return typeof parsed.activeAccountKey === 'string'
      ? parsed.activeAccountKey
      : null;
  } catch {
    return null;
  }
}

function getNamespace(accountKey?: string | null): string {
  if (accountKey) {
    return accountKey;
  }

  // In non-window contexts (e.g. service workers), avoid touching auth-session/localStorage.
  if (typeof window === 'undefined') {
    return 'guest';
  }

  return getActiveAccountKeyFromSessionStore() || 'guest';
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
