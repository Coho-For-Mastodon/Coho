import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-text-field';
import type { MdTextField } from '../../../src/components/md/md-text-field';

describe('md-text-field', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );

      expect(el).toBeDefined();
      expect(el.value).toBe('');
      expect(el.placeholder).toBe('');
      expect(el.disabled).toBe(false);
      expect(el.variant).toBe('filled');
      expect(el.type).toBe('text');
    });
  });

  describe('value', () => {
    it('accepts initial value', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field value="Hello"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.value).toBe('Hello');
      expect(input?.value).toBe('Hello');
    });

    it('updates value on input', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input')!;

      input.value = 'Test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(el.value).toBe('Test');
    });

    it('updates value programmatically', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      el.value = 'Programmatic';
      await elementUpdated(el);

      expect(input?.value).toBe('Programmatic');
    });
  });

  describe('placeholder', () => {
    it('displays placeholder text', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field placeholder="Enter text"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.placeholder).toBe('Enter text');
    });
  });

  describe('disabled state', () => {
    it('can be disabled', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field disabled></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.disabled).toBe(true);
      expect(input?.disabled).toBe(true);
    });

    it('enables when disabled is removed', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field disabled></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.disabled).toBe(true);

      el.disabled = false;
      await elementUpdated(el);

      expect(input?.disabled).toBe(false);
    });
  });

  describe('variants', () => {
    it('applies filled variant by default', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.variant).toBe('filled');
      expect(input?.classList.contains('outlined')).toBe(false);
    });

    it('applies outlined variant', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field variant="outlined"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.variant).toBe('outlined');
      expect(input?.classList.contains('outlined')).toBe(true);
    });
  });

  describe('pill shape', () => {
    it('applies pill class when pill is true', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field pill></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(el.pill).toBe(true);
      expect(input?.classList.contains('pill')).toBe(true);
    });
  });

  describe('input types', () => {
    it('supports text type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="text"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('text');
    });

    it('supports email type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="email"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('email');
    });

    it('supports password type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="password"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('password');
    });

    it('supports search type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="search"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('search');
    });

    it('supports tel type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="tel"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('tel');
    });

    it('supports url type', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field type="url"></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input');

      expect(input?.type).toBe('url');
    });
  });

  describe('events', () => {
    it('dispatches input event on typing', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const inputHandler = vi.fn();

      el.addEventListener('input', inputHandler);
      input.value = 'Test';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(inputHandler).toHaveBeenCalled();
      expect(inputHandler.mock.calls[0][0].detail.value).toBe('Test');
    });

    it('dispatches change event on blur', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );
      const input = el.shadowRoot!.querySelector('input')!;
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      input.value = 'Test';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('autofocus', () => {
    it('accepts autofocus property', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field autofocus></md-text-field>`
      );

      expect(el.autofocus).toBe(true);
    });
  });

  describe('focus method', () => {
    it('exposes focus method', async () => {
      const el = await fixture<MdTextField>(
        html`<md-text-field></md-text-field>`
      );

      expect(typeof el.focus).toBe('function');
    });
  });
});
