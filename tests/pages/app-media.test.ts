import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';

const hoisted = vi.hoisted(() => {
  return {
    getAllMedia: vi.fn(),
  };
});

vi.mock('../../src/services/media', () => ({
  getAllMedia: hoisted.getAllMedia,
}));

vi.mock('../../src/components/header', () => ({}));

import '../../src/pages/app-media';
import type { AppMedia } from '../../src/pages/app-media';

describe('app-media', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
  });

  it('creates one object URL per file and reuses it on rerender', async () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    hoisted.getAllMedia.mockResolvedValue([fileA, fileB]);

    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:a')
      .mockReturnValueOnce('blob:b');

    const el = await fixture<AppMedia>(html`<app-media></app-media>`);
    await Promise.resolve();
    await elementUpdated(el);

    expect(createSpy).toHaveBeenCalledTimes(2);

    el.requestUpdate();
    await elementUpdated(el);

    expect(createSpy).toHaveBeenCalledTimes(2);

    createSpy.mockRestore();
  });

  it('revokes stale object URLs when media list changes', async () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    const fileC = new File(['c'], 'c.png', { type: 'image/png' });
    hoisted.getAllMedia.mockResolvedValue([fileA, fileB]);

    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:a')
      .mockReturnValueOnce('blob:b')
      .mockReturnValueOnce('blob:c');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const el = await fixture<AppMedia>(html`<app-media></app-media>`);
    await Promise.resolve();
    await elementUpdated(el);

    el.media = [fileB, fileC];
    await elementUpdated(el);

    expect(revokeSpy).toHaveBeenCalledWith('blob:a');
    expect(createSpy).toHaveBeenCalledTimes(3);

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('revoke all object URLs on disconnect', async () => {
    const fileA = new File(['a'], 'a.png', { type: 'image/png' });
    const fileB = new File(['b'], 'b.png', { type: 'image/png' });
    hoisted.getAllMedia.mockResolvedValue([fileA, fileB]);

    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:a')
      .mockReturnValueOnce('blob:b');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const el = await fixture<AppMedia>(html`<app-media></app-media>`);
    await Promise.resolve();
    await elementUpdated(el);

    el.remove();

    expect(revokeSpy).toHaveBeenCalledWith('blob:a');
    expect(revokeSpy).toHaveBeenCalledWith('blob:b');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});
