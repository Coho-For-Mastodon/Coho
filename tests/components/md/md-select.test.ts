import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-select';
import '../../../src/components/md/md-option';
import type { MdSelect } from '../../../src/components/md/md-select';

describe('md-select', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);

      expect(el).toBeDefined();
      expect(el.value).toBe('');
      expect(el.placeholder).toBe('');
      expect(el.disabled).toBe(false);
      expect(el.variant).toBe('filled');
      expect(el.pill).toBe(false);
    });

    it('renders select input container', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(selectInput).toBeDefined();
    });

    it('renders dropdown container', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const dropdown = el.shadowRoot!.querySelector('.dropdown');

      expect(dropdown).toBeDefined();
    });

    it('renders with options', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
          <md-option value="2">Option 2</md-option>
        </md-select>
      `);
      const options = el.querySelectorAll('md-option');

      expect(options.length).toBe(2);
    });
  });

  describe('placeholder', () => {
    it('displays placeholder when no value selected', async () => {
      const el = await fixture<MdSelect>(
        html`<md-select placeholder="Select an option"></md-select>`
      );
      const label = el.shadowRoot!.querySelector('.select-label');

      expect(label?.textContent?.trim()).toBe('Select an option');
      expect(label?.classList.contains('placeholder')).toBe(true);
    });
  });

  describe('value', () => {
    it('displays selected option label', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select value="1">
          <md-option value="1">Option 1</md-option>
          <md-option value="2">Option 2</md-option>
        </md-select>
      `);
      await elementUpdated(el);

      const label = el.shadowRoot!.querySelector('.select-label');
      expect(label?.textContent?.trim()).toBe('Option 1');
    });

    it('updates value programmatically', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
          <md-option value="2">Option 2</md-option>
        </md-select>
      `);

      el.value = '2';
      await elementUpdated(el);

      expect(el.value).toBe('2');
    });
  });

  describe('disabled state', () => {
    it('can be disabled', async () => {
      const el = await fixture<MdSelect>(
        html`<md-select disabled></md-select>`
      );
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(el.disabled).toBe(true);
      expect(selectInput?.classList.contains('disabled')).toBe(true);
    });

    it('does not open when disabled', async () => {
      const el = await fixture<MdSelect>(
        html`<md-select disabled></md-select>`
      );
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });
  });

  describe('variants', () => {
    it('applies filled variant by default', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(el.variant).toBe('filled');
      expect(selectInput?.classList.contains('outlined')).toBe(false);
    });

    it('applies outlined variant', async () => {
      const el = await fixture<MdSelect>(
        html`<md-select variant="outlined"></md-select>`
      );
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(el.variant).toBe('outlined');
      expect(selectInput?.classList.contains('outlined')).toBe(true);
    });
  });

  describe('pill shape', () => {
    it('applies pill class when pill is true', async () => {
      const el = await fixture<MdSelect>(html`<md-select pill></md-select>`);
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(el.pill).toBe(true);
      expect(selectInput?.classList.contains('pill')).toBe(true);
    });
  });

  describe('dropdown behavior', () => {
    it('opens dropdown on click', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(true);
    });

    it('closes dropdown on second click', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      selectInput.click();
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });

    it('closes dropdown on backdrop click', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      const backdrop = el.shadowRoot!.querySelector('.backdrop') as HTMLElement;
      backdrop.click();
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });

    it('adds open class to select-input when dropdown is open', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      expect(selectInput.classList.contains('open')).toBe(true);
    });
  });

  describe('keyboard navigation', () => {
    it('closes dropdown on Escape key', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      // Open first
      selectInput.click();
      await elementUpdated(el);

      // Then close with Escape (dispatched on document)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      await elementUpdated(el);

      const dropdown = el.shadowRoot!.querySelector('.dropdown');
      expect(dropdown?.classList.contains('open')).toBe(false);
    });
  });

  describe('events', () => {
    it('dispatches change event when option is selected', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
          <md-option value="2">Option 2</md-option>
        </md-select>
      `);
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);

      // Open dropdown
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;
      selectInput.click();
      await elementUpdated(el);

      // Select option
      const option = el.querySelector('md-option[value="2"]') as HTMLElement;
      option.click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('dropdown icon', () => {
    it('renders dropdown icon', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const icon = el.shadowRoot!.querySelector('.dropdown-icon');

      expect(icon).toBeDefined();
    });

    it('rotates icon when open', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      selectInput.click();
      await elementUpdated(el);

      // The icon rotation is handled by CSS when .select-input.open is set
      expect(selectInput.classList.contains('open')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('is focusable', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(selectInput?.getAttribute('tabindex')).toBe('0');
    });

    it('has role="combobox"', async () => {
      const el = await fixture<MdSelect>(html`<md-select></md-select>`);
      const selectInput = el.shadowRoot!.querySelector('.select-input');

      expect(selectInput?.getAttribute('role')).toBe('combobox');
    });

    it('sets aria-expanded based on open state', async () => {
      const el = await fixture<MdSelect>(html`
        <md-select>
          <md-option value="1">Option 1</md-option>
        </md-select>
      `);
      const selectInput = el.shadowRoot!.querySelector(
        '.select-input'
      ) as HTMLElement;

      expect(selectInput.getAttribute('aria-expanded')).toBe('false');

      selectInput.click();
      await elementUpdated(el);

      expect(selectInput.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
