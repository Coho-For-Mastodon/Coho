import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/offline-notify';
import type { OfflineNotify } from '../../src/components/offline-notify';

describe('offline-notify', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('shows offline and online toasts on network changes', async () => {
    const el = await fixture<OfflineNotify>(
      html`<offline-notify></offline-notify>`
    );
    await elementUpdated(el);

    const offlineToast = el.shadowRoot?.querySelector('#offline-toast') as
      | (HTMLElement & { show: () => void })
      | null;
    const backToast = el.shadowRoot?.querySelector('#back-online-toast') as
      | (HTMLElement & { show: () => void })
      | null;

    if (offlineToast) offlineToast.show = vi.fn();
    if (backToast) backToast.show = vi.fn();

    window.dispatchEvent(new Event('offline'));
    await elementUpdated(el);

    expect(el.network_status).toBe(false);
    expect(offlineToast?.show).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('online'));
    await elementUpdated(el);

    expect(el.network_status).toBe(true);
    expect(backToast?.show).toHaveBeenCalledTimes(1);
  });
});
