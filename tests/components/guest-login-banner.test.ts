import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  setAuthRedirect: vi.fn(),
}));

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

vi.mock('../../src/utils/auth-redirect', () => ({
  setAuthRedirect: hoisted.setAuthRedirect,
}));

import '../../src/components/guest-login-banner';
import type { GuestLoginBanner } from '../../src/components/guest-login-banner';

describe('guest-login-banner', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
  });

  it('stores redirect and navigates on sign-in click', async () => {
    const el = await fixture<GuestLoginBanner>(
      html`<guest-login-banner></guest-login-banner>`
    );
    await elementUpdated(el);

    const link = el.shadowRoot?.querySelector('.sign-in-link');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(hoisted.setAuthRedirect).toHaveBeenCalledTimes(1);
    expect(hoisted.navigate).toHaveBeenCalledWith('/');
  });
});
