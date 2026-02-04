import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/header';
import type { AppHeader } from '../../src/components/header';

const idleCallback = (cb: IdleRequestCallback) => {
  cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
  return 1;
};

describe('app-header', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.stubGlobal('requestIdleCallback', idleCallback);
  });

  it('renders app icon when back is disabled', async () => {
    const el = await fixture<AppHeader>(html`<app-header></app-header>`);
    await elementUpdated(el);

    const backBlock = el.shadowRoot?.querySelector('#back-button-block');
    expect(backBlock?.querySelector('img')).toBeDefined();
    expect(backBlock?.querySelector('md-icon-button')).toBeNull();
  });

  it('renders back button when enableBack is true', async () => {
    const el = await fixture<AppHeader>(
      html`<app-header .enableBack=${true}></app-header>`
    );
    await elementUpdated(el);

    const backBlock = el.shadowRoot?.querySelector('#back-button-block');
    expect(backBlock?.querySelector('img')).toBeNull();
    expect(backBlock?.querySelector('md-icon-button')).toBeDefined();
  });

  it('shows install button when enabled', async () => {
    const el = await fixture<AppHeader>(
      html`<app-header .showInstall=${true}></app-header>`
    );
    await elementUpdated(el);

    const installButton = el.shadowRoot?.querySelector('#install-button');
    expect(installButton).toBeDefined();
  });

  it('dispatches settings and theming events', async () => {
    const el = await fixture<AppHeader>(html`<app-header></app-header>`);
    await elementUpdated(el);

    const settingsHandler = vi.fn();
    const themingHandler = vi.fn();

    el.addEventListener('open-settings', settingsHandler);
    el.addEventListener('open-theming', themingHandler);

    const settingsButton = el.shadowRoot?.querySelector('#settings-button');
    const themingButton = el.shadowRoot?.querySelector('#open-button');

    settingsButton?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
    themingButton?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );

    expect(settingsHandler).toHaveBeenCalledTimes(1);
    expect(themingHandler).toHaveBeenCalledTimes(1);
  });
});
