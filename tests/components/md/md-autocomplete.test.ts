import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-autocomplete';
import type { MdAutocomplete } from '../../../src/components/md/md-autocomplete';
import type { AutocompleteOption } from '../../../src/components/md/md-autocomplete';

const mockOptions: AutocompleteOption[] = [
  {
    value: 'mastodon.social',
    label: 'mastodon.social',
    description: 'The original Mastodon server',
  },
  {
    value: 'tech.lgbt',
    label: 'tech.lgbt',
    description: 'For LGBTQ+ people in tech',
  },
  {
    value: 'fosstodon.org',
    label: 'fosstodon.org',
    description: 'For Free & Open Source Software enthusiasts',
  },
];

describe('md-autocomplete', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );

      expect(el).toBeDefined();
      expect(el.value).toBe('');
      expect(el.placeholder).toBe('');
      expect(el.options).toEqual([]);
      expect(el.loading).toBe(false);
    });

    it('renders an input element', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input).toBeDefined();
      expect(input).not.toBeNull();
    });

    it('renders with placeholder', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete
          placeholder="Search for your server"
        ></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.placeholder).toBe('Search for your server');
    });

    it('renders with initial value', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete value="mastodon.social"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.value).toBe('mastodon.social');
      expect(input?.value).toBe('mastodon.social');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.getAttribute('role')).toBe('combobox');
      expect(input?.getAttribute('aria-autocomplete')).toBe('list');
      expect(input?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input?.getAttribute('aria-expanded')).toBe('false');
    });

    it('has listbox role on dropdown', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const dropdown = el.shadowRoot!.querySelector('.dropdown');

      expect(dropdown?.getAttribute('role')).toBe('listbox');
    });

    it('updates aria-expanded when dropdown is shown', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Focus to show dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('input handling', () => {
    it('dispatches input event when typing', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const inputHandler = vi.fn();
      el.addEventListener('input', inputHandler);

      input.value = 'mas';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(inputHandler).toHaveBeenCalled();
      expect((inputHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe(
        'mas'
      );
    });

    it('updates value when typing', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(el.value).toBe('test');
    });

    it('shows dropdown when typing with options', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.value = 'mas';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);
    });
  });

  describe('focus handling', () => {
    it('dispatches focus event', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const focusHandler = vi.fn();
      el.addEventListener('focus', focusHandler);

      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      expect(focusHandler).toHaveBeenCalled();
    });

    it('shows dropdown on focus when options are available', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);
    });
  });

  describe('dropdown options', () => {
    it('displays options in dropdown', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      const items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      expect(items.length).toBe(mockOptions.length);
    });

    it('displays option labels', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      const labels = el.shadowRoot!.querySelectorAll('.item-label');
      expect(labels[0]?.textContent).toBe('mastodon.social');
      expect(labels[1]?.textContent).toBe('tech.lgbt');
    });

    it('displays option descriptions', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      const descriptions = el.shadowRoot!.querySelectorAll('.item-description');
      expect(descriptions[0]?.textContent).toContain('original Mastodon');
    });

    it('shows loading indicator when loading', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .loading="${true}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      const loadingIndicator =
        el.shadowRoot!.querySelector('.loading-indicator');
      expect(loadingIndicator).not.toBeNull();
      expect(loadingIndicator?.textContent).toContain('Loading');
    });
  });

  describe('option selection', () => {
    it('selects option on click', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const selectHandler = vi.fn();
      el.addEventListener('select', selectHandler);

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Click first option
      const firstItem = el.shadowRoot!.querySelector('.dropdown-item')!;
      (firstItem as HTMLElement).click();
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
      expect((selectHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe(
        'mastodon.social'
      );
    });

    it('updates value when option is selected', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Click second option
      const items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      (items[1] as HTMLElement).click();
      await elementUpdated(el);

      expect(el.value).toBe('tech.lgbt');
    });

    it('closes dropdown after selection', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Click first option
      const firstItem = el.shadowRoot!.querySelector('.dropdown-item')!;
      (firstItem as HTMLElement).click();
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });

    it('dispatches change event on selection', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const changeHandler = vi.fn();
      el.addEventListener('change', changeHandler);

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Click first option
      const firstItem = el.shadowRoot!.querySelector('.dropdown-item')!;
      (firstItem as HTMLElement).click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('highlights next option on ArrowDown', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Press ArrowDown
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      await elementUpdated(el);

      const highlighted = el.shadowRoot!.querySelector(
        '.dropdown-item.highlighted'
      );
      expect(highlighted).not.toBeNull();
    });

    it('highlights previous option on ArrowUp', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Navigate down then up
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      );
      await elementUpdated(el);

      const items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      expect(items[0]?.classList.contains('highlighted')).toBe(true);
    });

    it('selects highlighted option on Enter', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const selectHandler = vi.fn();
      el.addEventListener('select', selectHandler);

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Navigate to first option and press Enter
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
      expect((selectHandler.mock.calls[0][0] as CustomEvent).detail.value).toBe(
        'mastodon.social'
      );
    });

    it('closes dropdown on Escape', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Verify dropdown is open
      let dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);

      // Press Escape
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      await elementUpdated(el);

      dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });

    it('opens dropdown on ArrowDown when closed', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Focus but don't open dropdown
      input.focus();
      await elementUpdated(el);

      // Press ArrowDown should open dropdown
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);
    });
  });

  describe('mouse hover', () => {
    it('highlights option on mouse enter', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Hover over second option
      const items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      (items[1] as HTMLElement).dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true })
      );
      await elementUpdated(el);

      expect(items[1]?.classList.contains('highlighted')).toBe(true);
    });
  });

  describe('options updates', () => {
    it('shows dropdown when options are added while focused', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Focus input (no options yet)
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Add options (simulating async search results)
      el.options = mockOptions;
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);
    });

    it('updates displayed options when options prop changes', async () => {
      const el = await fixture<MdAutocomplete>(
        html`<md-autocomplete .options="${mockOptions}"></md-autocomplete>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      // Open dropdown
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      await elementUpdated(el);

      // Verify initial options
      let items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      expect(items.length).toBe(3);

      // Update options
      el.options = [
        { value: 'new.server', label: 'new.server', description: 'New server' },
      ];
      await elementUpdated(el);

      items = el.shadowRoot!.querySelectorAll('.dropdown-item');
      expect(items.length).toBe(1);
      expect(el.shadowRoot!.querySelector('.item-label')?.textContent).toBe(
        'new.server'
      );
    });
  });
});
