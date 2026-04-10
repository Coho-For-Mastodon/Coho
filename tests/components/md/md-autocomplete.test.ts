import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupFixtures,
  elementUpdated,
  fixture,
  html,
} from '../../test-utils';
import '../../../src/components/md/md-autocomplete';
import type {
  AutocompleteOption,
  MdAutocomplete,
} from '../../../src/components/md/md-autocomplete';

const options: AutocompleteOption[] = [
  {
    value: 'mastodon.social',
    label: 'mastodon.social',
    description: 'General-purpose Mastodon server',
  },
  {
    value: 'hachyderm.io',
    label: 'hachyderm.io',
    description: 'Tech community server',
  },
];

async function waitForPopover(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('md-autocomplete', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('renders with default properties', async () => {
    const el = await fixture<MdAutocomplete>(
      html`<md-autocomplete></md-autocomplete>`
    );

    expect(el.value).toBe('');
    expect(el.placeholder).toBe('');
    expect(el.options).toEqual([]);
    expect(el.loading).toBe(false);
  });

  it('opens the popover on focus when options are available', async () => {
    const el = await fixture<MdAutocomplete>(html`
      <md-autocomplete .options=${options}></md-autocomplete>
    `);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const dropdown = el.shadowRoot!.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    input.dispatchEvent(new FocusEvent('focus'));
    await elementUpdated(el);
    await waitForPopover();

    expect(dropdown.matches(':popover-open')).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('updates value and emits input events', async () => {
    const el = await fixture<MdAutocomplete>(html`
      <md-autocomplete .options=${options}></md-autocomplete>
    `);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const inputHandler = vi.fn();

    el.addEventListener('input', inputHandler);

    input.value = 'hachy';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await elementUpdated(el);

    expect(el.value).toBe('hachy');
    expect(inputHandler).toHaveBeenCalledTimes(1);
  });

  it('syncs state when the native popover closes', async () => {
    const el = await fixture<MdAutocomplete>(html`
      <md-autocomplete .options=${options}></md-autocomplete>
    `);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const dropdown = el.shadowRoot!.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    input.dispatchEvent(new FocusEvent('focus'));
    await elementUpdated(el);
    await waitForPopover();

    dropdown.hidePopover();
    await elementUpdated(el);
    await waitForPopover();

    expect(dropdown.matches(':popover-open')).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('selects the highlighted option with the keyboard', async () => {
    const el = await fixture<MdAutocomplete>(html`
      <md-autocomplete .options=${options}></md-autocomplete>
    `);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const selectHandler = vi.fn();
    const changeHandler = vi.fn();

    el.addEventListener('select', selectHandler);
    el.addEventListener('change', changeHandler);

    input.dispatchEvent(new FocusEvent('focus'));
    await elementUpdated(el);
    await waitForPopover();

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    await elementUpdated(el);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await elementUpdated(el);
    await waitForPopover();

    expect(el.value).toBe('mastodon.social');
    expect(selectHandler).toHaveBeenCalledTimes(1);
    expect(changeHandler).toHaveBeenCalledTimes(1);
  });

  it('shows loading content in the popover', async () => {
    const el = await fixture<MdAutocomplete>(html`
      <md-autocomplete .loading=${true}></md-autocomplete>
    `);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    const dropdown = el.shadowRoot!.querySelector(
      '.dropdown'
    ) as HTMLDivElement;

    input.dispatchEvent(new FocusEvent('focus'));
    await elementUpdated(el);
    await waitForPopover();

    expect(dropdown.matches(':popover-open')).toBe(true);
    expect(dropdown.textContent).toContain('Loading...');
  });
});
