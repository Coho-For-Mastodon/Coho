import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockAccountProfile } from '../mocks/mock-data';

const hoisted = vi.hoisted(() => {
  return {
    navigate: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

vi.mock('../../src/utils/intersection-observer', () => ({
  createIntersectionObserver: vi.fn(() => ({
    observe: hoisted.observe,
    unobserve: hoisted.unobserve,
    disconnect: hoisted.disconnect,
  })),
  disconnectIntersectionObserver: vi.fn(),
}));

import '../../src/components/user-profile';
import type { UserProfile } from '../../src/components/user-profile';

const idleCallback = (_cb: IdleRequestCallback) => 1;

describe('user-profile', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
    vi.stubGlobal('requestIdleCallback', idleCallback);
  });

  it('applies small and boosted classes', async () => {
    const el = await fixture<UserProfile>(
      html`<user-profile
        .account=${mockAccountProfile}
        .small=${true}
        .boosted=${true}
      ></user-profile>`
    );
    await elementUpdated(el);

    const headerBlock = el.shadowRoot?.querySelector('.headerBlock');
    expect(headerBlock?.classList.contains('small')).toBe(true);
    expect(headerBlock?.classList.contains('boosted')).toBe(true);
  });

  it('loads image from data-src when requested', async () => {
    const el = await fixture<UserProfile>(
      html`<user-profile .account=${mockAccountProfile}></user-profile>`
    );
    await elementUpdated(el);

    const img = el.shadowRoot?.querySelector('img') as HTMLImageElement | null;
    expect(img).toBeDefined();

    const dataSrc = img?.getAttribute('data-src');
    expect(dataSrc).toBeTruthy();

    el.loadImage();

    expect(img?.getAttribute('src')).toBe(dataSrc);
    expect(img?.hasAttribute('data-src')).toBe(false);
  });

  it('navigates to account route on openUser', async () => {
    const el = await fixture<UserProfile>(
      html`<user-profile .account=${mockAccountProfile}></user-profile>`
    );
    await elementUpdated(el);

    await el.openUser();

    expect(hoisted.navigate).toHaveBeenCalledWith(
      `/account?id=${mockAccountProfile.id}`,
      {
        state: { account: mockAccountProfile },
      }
    );
  });

  it('sets up intersection observer for avatar', async () => {
    const el = await fixture<UserProfile>(
      html`<user-profile .account=${mockAccountProfile}></user-profile>`
    );
    await elementUpdated(el);

    expect(hoisted.observe).toHaveBeenCalledTimes(1);
  });
});
