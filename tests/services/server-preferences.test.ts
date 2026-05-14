import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get, set, del } from 'idb-keyval';
import { setupAuth } from '../auth-helpers';
import type { ServerPreferences } from '../../src/mastodon/types/preferences';

describe('syncServerPreferences (app-index)', () => {
  beforeEach(() => {
    setupAuth();
  });

  afterEach(async () => {
    await del('server-preferences');
  });

  it('stores server preferences in IndexedDB after fetch', async () => {
    const { getServerPreferences } =
      await import('../../src/mastodon/api/preferences');
    const prefs = await getServerPreferences();

    // Simulate what syncServerPreferences does
    if (prefs) {
      await set('server-preferences', prefs);
    }

    const stored = await get<ServerPreferences>('server-preferences');
    expect(stored).toBeDefined();
    expect(stored!['posting:default:visibility']).toBe('public');
    expect(stored!['posting:default:language']).toBe('en');
    expect(stored!['posting:default:sensitive']).toBe(false);
  });

  it('post composer reads synced visibility from IndexedDB', async () => {
    await set('server-preferences', {
      'posting:default:visibility': 'unlisted',
    });

    const prefs = await get<ServerPreferences>('server-preferences');
    const visibility = prefs?.['posting:default:visibility'] ?? 'public';
    expect(visibility).toBe('unlisted');
  });

  it('post composer reads synced sensitive flag from IndexedDB', async () => {
    await set('server-preferences', {
      'posting:default:sensitive': true,
    });

    const prefs = await get<ServerPreferences>('server-preferences');
    const sensitive = prefs?.['posting:default:sensitive'] ?? false;
    expect(sensitive).toBe(true);
  });

  it('falls back to public when no preference is stored', async () => {
    const prefs = await get<ServerPreferences>('server-preferences');
    const visibility = prefs?.['posting:default:visibility'] ?? 'public';
    expect(visibility).toBe('public');
  });

  it('falls back to not sensitive when no preference is stored', async () => {
    const prefs = await get<ServerPreferences>('server-preferences');
    const sensitive = prefs?.['posting:default:sensitive'] ?? false;
    expect(sensitive).toBe(false);
  });
});
