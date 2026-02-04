import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';

vi.mock('../../src/components/md/md-toast.js', () => ({}));

import '../../src/components/pwa-update';
import type { PwaUpdate } from '../../src/components/pwa-update';

describe('pwa-update', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('calls the update callback and clears updateAvailable', async () => {
    const el = await fixture<PwaUpdate>(html`<pwa-update></pwa-update>`);
    await elementUpdated(el);

    const updateFn = vi.fn();
    (el as any).updateCallback = updateFn;
    (el as any).updateAvailable = true;

    (el as any).doUpdate();

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect((el as any).updateAvailable).toBe(false);
  });
});
