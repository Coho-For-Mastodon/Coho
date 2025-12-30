import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-text-area';
import type { MdTextArea } from '../../../src/components/md/md-text-area';

describe('md-text-area', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);

      expect(el).toBeDefined();
      expect(el.value).toBe('');
      expect(el.placeholder).toBe('');
      expect(el.disabled).toBe(false);
      expect(el.variant).toBe('filled');
      expect(el.rows).toBe(4);
    });

    it('renders a textarea element', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(textarea).toBeDefined();
    });
  });

  describe('value', () => {
    it('accepts initial value', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area value="Hello World"></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.value).toBe('Hello World');
      expect(textarea?.value).toBe('Hello World');
    });

    it('updates value on input', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea')!;

      textarea.value = 'New text';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(el.value).toBe('New text');
    });

    it('updates value programmatically', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea');

      el.value = 'Programmatic text';
      await elementUpdated(el);

      expect(textarea?.value).toBe('Programmatic text');
    });
  });

  describe('placeholder', () => {
    it('displays placeholder text', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area placeholder="Enter your message"></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(textarea?.placeholder).toBe('Enter your message');
    });
  });

  describe('disabled state', () => {
    it('can be disabled', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area disabled></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.disabled).toBe(true);
      expect(textarea?.disabled).toBe(true);
    });

    it('enables when disabled is removed', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area disabled></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(textarea?.disabled).toBe(true);

      el.disabled = false;
      await elementUpdated(el);

      expect(textarea?.disabled).toBe(false);
    });
  });

  describe('variants', () => {
    it('applies filled variant by default', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.variant).toBe('filled');
      expect(textarea?.classList.contains('outlined')).toBe(false);
    });

    it('applies outlined variant', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area variant="outlined"></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.variant).toBe('outlined');
      expect(textarea?.classList.contains('outlined')).toBe(true);
    });

    it('changes variant dynamically', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea');

      el.variant = 'outlined';
      await elementUpdated(el);

      expect(textarea?.classList.contains('outlined')).toBe(true);
    });
  });

  describe('rows property', () => {
    it('accepts custom rows value', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area rows="8"></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.rows).toBe(8);
      // getAttribute returns string, but property should return number
      expect(textarea?.getAttribute('rows')).toBe('8');
    });
  });

  describe('maxlength property', () => {
    it('accepts maxlength value', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area maxlength="500"></md-text-area>`
      );
      const textarea = el.shadowRoot!.querySelector('textarea');

      expect(el.maxlength).toBe(500);
      expect(textarea?.maxLength).toBe(500);
    });
  });

  describe('events', () => {
    it('dispatches input event on typing', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea')!;
      const inputHandler = vi.fn();

      el.addEventListener('input', inputHandler);
      textarea.value = 'Test';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await elementUpdated(el);

      expect(inputHandler).toHaveBeenCalled();
      expect(inputHandler.mock.calls[0][0].detail.value).toBe('Test');
    });

    it('dispatches change event on blur', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);
      const textarea = el.shadowRoot!.querySelector('textarea')!;
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      textarea.value = 'Test';
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('autofocus', () => {
    it('accepts autofocus property', async () => {
      const el = await fixture<MdTextArea>(
        html`<md-text-area autofocus></md-text-area>`
      );

      expect(el.autofocus).toBe(true);
    });
  });

  describe('focus method', () => {
    it('exposes focus method', async () => {
      const el = await fixture<MdTextArea>(html`<md-text-area></md-text-area>`);

      expect(typeof el.focus).toBe('function');
    });
  });
});
