import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-icon-button';
import type { MdIconButton } from '../../../src/components/md/md-icon-button';

describe('md-icon-button', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button></md-icon-button>`
      );

      expect(el).toBeDefined();
      expect(el.variant).toBe('standard');
      expect(el.disabled).toBe(false);
    });

    it('renders a button element', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button).toBeDefined();
    });
  });

  describe('variants', () => {
    it('applies standard variant by default', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.classList.contains('icon-button--standard')).toBe(true);
    });

    it('applies filled variant', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button variant="filled"></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.classList.contains('icon-button--filled')).toBe(true);
    });

    it('applies filled-tonal variant', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button variant="filled-tonal"></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.classList.contains('icon-button--filled-tonal')).toBe(
        true
      );
    });

    it('applies outlined variant', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button variant="outlined"></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.classList.contains('icon-button--outlined')).toBe(true);
    });

    it('changes variant dynamically', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.classList.contains('icon-button--standard')).toBe(true);

      el.variant = 'filled';
      await elementUpdated(el);

      expect(button?.classList.contains('icon-button--filled')).toBe(true);
    });
  });

  describe('icon properties', () => {
    it('accepts name property for built-in icons', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button name="home"></md-icon-button>`
      );

      expect(el.name).toBe('home');
    });

    it('accepts src property for external icons', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button src="/icon.svg"></md-icon-button>`
      );

      expect(el.src).toBe('/icon.svg');
    });

    it('accepts label property for accessibility', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button label="Go home"></md-icon-button>`
      );

      expect(el.label).toBe('Go home');
    });
  });

  describe('disabled state', () => {
    it('can be disabled', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button disabled></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector(
        '.icon-button'
      ) as HTMLButtonElement;

      expect(el.disabled).toBe(true);
      expect(button.disabled).toBe(true);
    });

    it('removes disabled when enabled', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button disabled></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector(
        '.icon-button'
      ) as HTMLButtonElement;

      expect(button.disabled).toBe(true);

      el.disabled = false;
      await elementUpdated(el);

      expect(button.disabled).toBe(false);
    });

    it('does not fire click when disabled', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button disabled></md-icon-button>`
      );
      const clickHandler = vi.fn();

      el.addEventListener('click', clickHandler);
      el.shadowRoot!.querySelector('.icon-button')?.click();

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('title attribute', () => {
    it('reflects title attribute', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button title="Home"></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(el.title).toBe('Home');
      expect(button?.getAttribute('title')).toBe('Home');
    });
  });

  describe('events', () => {
    it('emits click event when clicked', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button></md-icon-button>`
      );
      const clickHandler = vi.fn();

      el.addEventListener('click', clickHandler);
      el.shadowRoot!.querySelector('.icon-button')?.click();

      expect(clickHandler).toHaveBeenCalled();
    });
  });

  describe('slotted content', () => {
    it('renders slotted icon content', async () => {
      const el = await fixture<MdIconButton>(html`
        <md-icon-button>
          <svg viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </md-icon-button>
      `);
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('has aria-label when label is provided', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button label="Home"></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector('.icon-button');

      expect(button?.getAttribute('aria-label')).toBe('Home');
    });

    it('has disabled attribute on button when disabled', async () => {
      const el = await fixture<MdIconButton>(
        html`<md-icon-button disabled></md-icon-button>`
      );
      const button = el.shadowRoot!.querySelector(
        '.icon-button'
      ) as HTMLButtonElement;

      expect(button?.disabled).toBe(true);
    });
  });
});
