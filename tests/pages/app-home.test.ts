import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  lazyLoad,
  resetAllLoaded,
} from '../../src/utils/lazy-component-loader';

const hoisted = vi.hoisted(() => ({
  checkNewNotifications: vi.fn().mockResolvedValue(false),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/notifications', () => ({
  checkNewNotifications: hoisted.checkNewNotifications,
  markNotificationsRead: hoisted.markNotificationsRead,
}));

import { AppHome } from '../../src/pages/app-home';

describe('app-home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllLoaded();
  });

  it('keeps tab render state when a tab component is already globally lazy-loaded', async () => {
    await lazyLoad('notifications', async () => undefined);

    const home = new AppHome() as AppHome & {
      loadTabComponent: (tabName: string) => Promise<void>;
      loadedTabs: Set<string>;
    };

    await home.loadTabComponent('notifications');

    expect(home.loadedTabs.has('notifications')).toBe(true);
  });
});
