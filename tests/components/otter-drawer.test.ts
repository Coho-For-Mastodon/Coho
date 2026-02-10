import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/otter-drawer';
import type { OtterDrawer } from '../../src/components/otter-drawer';

describe('otter-drawer', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('toggles open state via show/hide and updates overlay', async () => {
    const el = await fixture<OtterDrawer>(
      html`<otter-drawer label="Menu"></otter-drawer>`
    );
    await elementUpdated(el);

    const overlay = el.shadowRoot?.querySelector('.overlay') as HTMLElement;
    expect(overlay.classList.contains('open')).toBe(false);

    const showHandler = vi.fn();
    el.addEventListener('otter-show', showHandler);

    await el.show();
    await elementUpdated(el);

    expect(showHandler).toHaveBeenCalledTimes(1);
    expect(overlay.classList.contains('open')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    const hideHandler = vi.fn();
    el.addEventListener('otter-hide', hideHandler);

    await el.hide();
    await elementUpdated(el);

    expect(hideHandler).toHaveBeenCalledTimes(1);
    expect(overlay.classList.contains('open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape when open', async () => {
    const el = await fixture<OtterDrawer>(html`<otter-drawer></otter-drawer>`);
    await el.show();
    await elementUpdated(el);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await elementUpdated(el);

    const overlay = el.shadowRoot?.querySelector('.overlay') as HTMLElement;
    expect(overlay.classList.contains('open')).toBe(false);
  });
});
