import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupFixtures, elementUpdated, fixture, html } from '../test-utils';

vi.mock('../../src/services/custom-emojis', () => ({
  getPickerEmojis: () => [
    {
      name: 'Smileys',
      emojis: [
        {
          shortcode: 'blobcat',
          url: 'https://example.com/blobcat.png',
          static_url: 'https://example.com/blobcat_static.png',
          visible_in_picker: true,
          category: 'Smileys',
        },
        {
          shortcode: 'blobfox',
          url: 'https://example.com/blobfox.png',
          static_url: 'https://example.com/blobfox_static.png',
          visible_in_picker: true,
          category: 'Smileys',
        },
      ],
    },
  ],
}));

import '../../src/components/emoji-picker';
import type { EmojiPicker } from '../../src/components/emoji-picker';

async function waitForPopover(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('emoji-picker', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('renders with default closed state', async () => {
    const el = await fixture<EmojiPicker>(html`<emoji-picker></emoji-picker>`);

    expect(el.open).toBe(false);
    const picker = el.shadowRoot!.querySelector('.picker') as HTMLElement;
    expect(picker).toBeTruthy();
    expect(picker.matches(':popover-open')).toBe(false);
  });

  it('opens popover when open is set to true', async () => {
    const el = await fixture<EmojiPicker>(html`<emoji-picker></emoji-picker>`);
    const picker = el.shadowRoot!.querySelector('.picker') as HTMLElement;

    el.open = true;
    await elementUpdated(el);
    await waitForPopover();

    expect(picker.matches(':popover-open')).toBe(true);
  });

  it('closes popover when open is set to false', async () => {
    const el = await fixture<EmojiPicker>(
      html`<emoji-picker .open=${true}></emoji-picker>`
    );
    const picker = el.shadowRoot!.querySelector('.picker') as HTMLElement;
    await waitForPopover();

    expect(picker.matches(':popover-open')).toBe(true);

    el.open = false;
    await elementUpdated(el);
    await waitForPopover();

    expect(picker.matches(':popover-open')).toBe(false);
  });

  it('syncs close state when native popover is dismissed', async () => {
    const el = await fixture<EmojiPicker>(
      html`<emoji-picker .open=${true}></emoji-picker>`
    );
    const picker = el.shadowRoot!.querySelector('.picker') as HTMLElement;
    await waitForPopover();

    expect(picker.matches(':popover-open')).toBe(true);

    const closeSpy = vi.fn();
    el.addEventListener('emoji-picker-close', closeSpy);

    // Simulate native light-dismiss
    picker.hidePopover();
    await waitForPopover();

    expect(el.open).toBe(false);
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it('renders emoji categories when open', async () => {
    const el = await fixture<EmojiPicker>(
      html`<emoji-picker .open=${true}></emoji-picker>`
    );
    await waitForPopover();

    const tiles = el.shadowRoot!.querySelectorAll('.emoji-tile');
    expect(tiles.length).toBe(2);

    const title = el.shadowRoot!.querySelector('.category-title');
    expect(title?.textContent).toBe('Smileys');
  });

  it('dispatches emoji-select on tile click', async () => {
    const el = await fixture<EmojiPicker>(
      html`<emoji-picker .open=${true}></emoji-picker>`
    );
    await waitForPopover();

    const selectSpy = vi.fn();
    el.addEventListener('emoji-select', selectSpy);

    const firstTile = el.shadowRoot!.querySelector(
      '.emoji-tile'
    ) as HTMLButtonElement;
    firstTile.click();

    expect(selectSpy).toHaveBeenCalledOnce();
    expect(selectSpy.mock.calls[0][0].detail).toEqual({
      shortcode: 'blobcat',
      url: 'https://example.com/blobcat.png',
    });
  });

  it('filters emojis by search query', async () => {
    const el = await fixture<EmojiPicker>(
      html`<emoji-picker .open=${true}></emoji-picker>`
    );
    await waitForPopover();

    const searchField = el.shadowRoot!.querySelector(
      'md-text-field'
    ) as HTMLElement;
    const input = searchField.shadowRoot?.querySelector(
      'input'
    ) as HTMLInputElement;

    input.value = 'fox';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await elementUpdated(el);

    const tiles = el.shadowRoot!.querySelectorAll('.emoji-tile');
    expect(tiles.length).toBe(1);
    expect(tiles[0].getAttribute('title')).toBe(':blobfox:');
  });
});
