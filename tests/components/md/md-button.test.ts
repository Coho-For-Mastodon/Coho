import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-button';
import type { MdButton } from '../../../src/components/md/md-button';

describe('md-button', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdButton>(html`<md-button>Click me</md-button>`);

      expect(el).toBeDefined();
      expect(el.variant).toBe('filled');
      expect(el.size).toBe('medium');
      expect(el.disabled).toBe(false);
      expect(el.pill).toBe(false);
      expect(el.type).toBe('button');
    });

    it('renders slotted content', async () => {
      const el = await fixture<MdButton>(
        html`<md-button>Test Label</md-button>`
      );

      const slot = el.shadowRoot!.querySelector('slot');
      expect(slot).toBeDefined();
    });
  });

  describe('variants', () => {
    it('applies filled variant class by default', async () => {
      const el = await fixture<MdButton>(html`<md-button>Button</md-button>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('filled')).toBe(true);
    });

    it('applies outlined variant class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button variant="outlined">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('outlined')).toBe(true);
    });

    it('applies text variant class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button variant="text">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('text')).toBe(true);
    });

    it('applies elevated variant class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button variant="elevated">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('elevated')).toBe(true);
    });

    it('applies tonal variant class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button variant="tonal">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('tonal')).toBe(true);
    });

    it('applies fab variant class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button variant="fab">+</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('fab')).toBe(true);
    });

    it('changes variant dynamically', async () => {
      const el = await fixture<MdButton>(html`<md-button>Button</md-button>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('filled')).toBe(true);

      el.variant = 'outlined';
      await elementUpdated(el);

      expect(button?.classList.contains('outlined')).toBe(true);
      expect(button?.classList.contains('filled')).toBe(false);
    });
  });

  describe('sizes', () => {
    it('applies small size class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button size="small">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('small')).toBe(true);
    });

    it('applies medium size class by default', async () => {
      const el = await fixture<MdButton>(html`<md-button>Button</md-button>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('medium')).toBe(true);
    });

    it('applies large size class', async () => {
      const el = await fixture<MdButton>(
        html`<md-button size="large">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.classList.contains('large')).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('sets disabled attribute on button when disabled', async () => {
      const el = await fixture<MdButton>(
        html`<md-button disabled>Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(el.disabled).toBe(true);
      expect(button?.disabled).toBe(true);
    });

    it('removes disabled attribute when enabled', async () => {
      const el = await fixture<MdButton>(
        html`<md-button disabled>Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.disabled).toBe(true);

      el.disabled = false;
      await elementUpdated(el);

      expect(button?.disabled).toBe(false);
    });
  });

  describe('pill shape', () => {
    it('applies pill class when pill is true', async () => {
      const el = await fixture<MdButton>(
        html`<md-button pill>Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(el.pill).toBe(true);
      expect(button?.classList.contains('pill')).toBe(true);
    });
  });

  describe('button type', () => {
    it('sets button type attribute', async () => {
      const el = await fixture<MdButton>(
        html`<md-button type="submit">Submit</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.type).toBe('submit');
    });

    it('defaults to button type', async () => {
      const el = await fixture<MdButton>(html`<md-button>Button</md-button>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.type).toBe('button');
    });

    it('supports reset type', async () => {
      const el = await fixture<MdButton>(
        html`<md-button type="reset">Reset</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.type).toBe('reset');
    });
  });

  describe('title attribute', () => {
    it('reflects title attribute', async () => {
      const el = await fixture<MdButton>(
        html`<md-button title="Click to submit">Button</md-button>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(el.title).toBe('Click to submit');
      expect(button?.title).toBe('Click to submit');
    });
  });

  describe('events', () => {
    it('emits click event when clicked', async () => {
      const el = await fixture<MdButton>(html`<md-button>Button</md-button>`);
      const clickHandler = vi.fn();

      el.addEventListener('click', clickHandler);
      el.shadowRoot!.querySelector('button')?.click();

      expect(clickHandler).toHaveBeenCalled();
    });

    it('does not emit click when disabled', async () => {
      const el = await fixture<MdButton>(
        html`<md-button disabled>Button</md-button>`
      );
      const clickHandler = vi.fn();

      el.addEventListener('click', clickHandler);
      el.shadowRoot!.querySelector('button')?.click();

      // Disabled buttons don't fire click events
      expect(clickHandler).not.toHaveBeenCalled();
    });
  });
});
