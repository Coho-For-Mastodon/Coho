import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';

const hoisted = vi.hoisted(() => {
  const routerTarget = new EventTarget();

  return {
    router: {
      navigate: vi.fn(),
      getNavigationState: vi.fn(),
      addEventListener: routerTarget.addEventListener.bind(routerTarget),
      removeEventListener: routerTarget.removeEventListener.bind(routerTarget),
      dispatchEvent: routerTarget.dispatchEvent.bind(routerTarget),
    },
    getAccount: vi.fn(async (id: string) => ({
      id,
      acct: `user-${id}`,
      display_name: `User ${id}`,
      avatar: '',
      header: '',
      note: '',
      fields: [],
      followers_count: 0,
      following_count: 0,
    })),
    getUsersPosts: vi.fn(async () => []),
    getPinnedPosts: vi.fn(async () => []),
    isFollowingMe: vi.fn(async () => [
      { following: false, followed_by: false, muting: false, blocking: false },
    ]),
    getUsersFollowers: vi.fn(async (id: string) => [{ id: `f-${id}` }]),
    getFollowing: vi.fn(async (id: string) => [{ id: `g-${id}` }]),
    isGuestMode: vi.fn(() => false),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    muteUser: vi.fn(),
    unmuteUser: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    reportUser: vi.fn(),
    editPost: vi.fn(),
  };
});

vi.mock('../../src/router/routes', () => ({
  router: hoisted.router,
}));

vi.mock('../../src/services/account', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/account')>();
  return {
    ...actual,
    getAccount: hoisted.getAccount,
    getUsersPosts: hoisted.getUsersPosts,
    getPinnedPosts: hoisted.getPinnedPosts,
    isFollowingMe: hoisted.isFollowingMe,
    getUsersFollowers: hoisted.getUsersFollowers,
    getFollowing: hoisted.getFollowing,
    followUser: hoisted.followUser,
    unfollowUser: hoisted.unfollowUser,
    muteUser: hoisted.muteUser,
    unmuteUser: hoisted.unmuteUser,
    blockUser: hoisted.blockUser,
    unblockUser: hoisted.unblockUser,
    reportUser: hoisted.reportUser,
  };
});

vi.mock('../../src/services/auth-state', () => ({
  isGuestMode: hoisted.isGuestMode,
}));

vi.mock('../../src/services/posts', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/posts')>();
  return {
    ...actual,
    editPost: hoisted.editPost,
  };
});

import '../../src/pages/app-profile';
import '../../src/pages/app-followers';
import '../../src/pages/app-following';
import type { AppProfile } from '../../src/pages/app-profile';
import type { AppFollowers } from '../../src/pages/app-followers';
import type { Appfollowing } from '../../src/pages/app-following';

async function fireRouteChanged(path: string) {
  hoisted.router.dispatchEvent(
    new CustomEvent('route-changed', {
      detail: { route: { path, title: path } },
    })
  );
  await Promise.resolve();
}

describe('query param navigation regressions', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
    localStorage.clear();
    history.replaceState({}, '', '/');
  });

  it('reloads app-profile data when account id query changes on same route', async () => {
    localStorage.setItem('currentUserID', 'self');
    history.replaceState({}, '', '/account?id=111');

    const el = await fixture<AppProfile>(html`<app-profile></app-profile>`);
    await elementUpdated(el);

    await vi.waitFor(() => {
      expect(hoisted.getUsersPosts).toHaveBeenCalledWith('111');
      expect(hoisted.getPinnedPosts).toHaveBeenCalledWith('111');
      expect(el.user?.id).toBe('111');
    });

    history.pushState({}, '', '/account?id=222');
    await fireRouteChanged('/account');
    await elementUpdated(el);

    await vi.waitFor(() => {
      expect(hoisted.getUsersPosts).toHaveBeenCalledWith('222');
      expect(hoisted.getPinnedPosts).toHaveBeenCalledWith('222');
      expect(el.user?.id).toBe('222');
    });
  });

  it('reloads app-followers when id query changes on same route', async () => {
    history.replaceState({}, '', '/followers?id=10');

    const el = await fixture<AppFollowers>(
      html`<app-followers></app-followers>`
    );
    await elementUpdated(el);

    expect(hoisted.getUsersFollowers).toHaveBeenCalledWith('10');
    expect(el.followers[0]?.id).toBe('f-10');

    history.pushState({}, '', '/followers?id=20');
    await fireRouteChanged('/followers');
    await elementUpdated(el);

    expect(hoisted.getUsersFollowers).toHaveBeenCalledWith('20');
    expect(el.followers[0]?.id).toBe('f-20');
  });

  it('reloads app-following when id query changes on same route', async () => {
    history.replaceState({}, '', '/following?id=30');

    const el = await fixture<Appfollowing>(
      html`<app-following></app-following>`
    );
    await elementUpdated(el);

    expect(hoisted.getFollowing).toHaveBeenCalledWith('30');
    expect(el.following[0]?.id).toBe('g-30');

    history.pushState({}, '', '/following?id=40');
    await fireRouteChanged('/following');
    await elementUpdated(el);

    expect(hoisted.getFollowing).toHaveBeenCalledWith('40');
    expect(el.following[0]?.id).toBe('g-40');
  });
});
