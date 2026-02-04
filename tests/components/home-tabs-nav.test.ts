import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/home-tabs-nav';
import type { HomeTabsNav } from '../../src/components/home-tabs-nav';

describe('home-tabs-nav', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('renders active icon variants based on activeTab', async () => {
    const el = await fixture<HomeTabsNav>(
      html`<home-tabs-nav activeTab="general"></home-tabs-nav>`
    );
    await elementUpdated(el);

    const homeIcon = el.querySelector('md-tab[panel="general"] md-icon');
    expect(homeIcon?.getAttribute('src')).toContain('home-filled');

    el.activeTab = 'search';
    await elementUpdated(el);

    const updatedHomeIcon = el.querySelector('md-tab[panel="general"] md-icon');
    expect(updatedHomeIcon?.getAttribute('src')).toContain('home-outline');
  });

  it('dispatches reload event when home tab clicked', async () => {
    const el = await fixture<HomeTabsNav>(
      html`<home-tabs-nav></home-tabs-nav>`
    );
    await elementUpdated(el);

    const handler = vi.fn();
    el.addEventListener('reload-home', handler);

    const homeTab = el.querySelector('md-tab[panel="general"]');
    homeTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('hides new post button in guest mode', async () => {
    const el = await fixture<HomeTabsNav>(
      html`<home-tabs-nav .isGuestMode=${true}></home-tabs-nav>`
    );
    await elementUpdated(el);

    expect(el.querySelector('.new-post-btn')).toBeNull();
  });
});
