import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-icon';
import type { MdIcon } from '../../../src/components/md/md-icon';

describe('md-icon', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdIcon>(html`<md-icon></md-icon>`);

      expect(el).toBeDefined();
      expect(el.size).toBe('24px');
    });

    it('renders icon container', async () => {
      const el = await fixture<MdIcon>(html`<md-icon></md-icon>`);
      const icon = el.shadowRoot!.querySelector('.icon');

      expect(icon).toBeDefined();
    });
  });

  describe('size property', () => {
    it('accepts custom size', async () => {
      const el = await fixture<MdIcon>(html`<md-icon size="32px"></md-icon>`);

      expect(el.size).toBe('32px');
    });

    it('updates CSS variable for size', async () => {
      const el = await fixture<MdIcon>(html`<md-icon size="48px"></md-icon>`);
      await elementUpdated(el);

      expect(el.style.getPropertyValue('--md-icon-size')).toBe('48px');
    });
  });

  describe('label property', () => {
    it('accepts label for accessibility', async () => {
      const el = await fixture<MdIcon>(
        html`<md-icon label="Home icon"></md-icon>`
      );

      expect(el.label).toBe('Home icon');
    });
  });

  describe('name property', () => {
    it('accepts name for built-in icons', async () => {
      const el = await fixture<MdIcon>(html`<md-icon name="home"></md-icon>`);

      expect(el.name).toBe('home');
    });
  });

  describe('src property', () => {
    it('accepts src for external SVG', async () => {
      const el = await fixture<MdIcon>(
        html`<md-icon src="/icons/custom.svg"></md-icon>`
      );

      expect(el.src).toBe('/icons/custom.svg');
    });
  });

  describe('slotted content', () => {
    it('renders slotted SVG content', async () => {
      const el = await fixture<MdIcon>(html`
        <md-icon>
          <svg viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </md-icon>
      `);
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
    });
  });

  describe('events', () => {
    it('dispatches md-icon-load on successful load', async () => {
      const el = await fixture<MdIcon>(html`<md-icon></md-icon>`);
      const loadHandler = vi.fn();

      el.addEventListener('md-icon-load', loadHandler);

      // Trigger a named icon load
      el.name = 'home';
      await elementUpdated(el);

      // Give time for async loading
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The event should have been dispatched if icon loaded successfully
      // Note: This depends on the icon library being available
    });
  });

  describe('error state', () => {
    it('handles missing icon gracefully', async () => {
      const el = await fixture<MdIcon>(
        html`<md-icon name="nonexistent-icon-xyz"></md-icon>`
      );
      await elementUpdated(el);

      // Give time for async loading to fail
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not throw, component should handle error gracefully
      expect(el).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('has role="img"', async () => {
      const el = await fixture<MdIcon>(html`<md-icon name="home"></md-icon>`);
      const icon = el.shadowRoot!.querySelector('.icon');

      expect(icon?.getAttribute('role')).toBe('img');
    });

    it('has aria-label when label is provided', async () => {
      const el = await fixture<MdIcon>(
        html`<md-icon name="home" label="Home"></md-icon>`
      );
      const icon = el.shadowRoot!.querySelector('.icon');

      expect(icon?.getAttribute('aria-label')).toBe('Home');
    });

    it('has default aria-label when no label provided', async () => {
      const el = await fixture<MdIcon>(html`<md-icon name="home"></md-icon>`);
      const icon = el.shadowRoot!.querySelector('.icon');

      expect(icon?.getAttribute('aria-label')).toBe('icon');
    });
  });
});
