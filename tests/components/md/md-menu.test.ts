import { describe, it, expect } from 'vitest';
import { fixture, html } from '../../test-utils';
import '../../../src/components/md/md-menu';
import '../../../src/components/md/md-menu-item';
import type { MdMenu } from '../../../src/components/md/md-menu';

describe('md-menu', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdMenu>(html`<md-menu></md-menu>`);

      expect(el).toBeDefined();
    });

    it('renders menu container', async () => {
      const el = await fixture<MdMenu>(html`<md-menu></md-menu>`);
      const menu = el.shadowRoot!.querySelector('.menu');

      expect(menu).toBeDefined();
    });

    it('has role="menu"', async () => {
      const el = await fixture<MdMenu>(html`<md-menu></md-menu>`);
      const menu = el.shadowRoot!.querySelector('.menu');

      expect(menu?.getAttribute('role')).toBe('menu');
    });
  });

  describe('slotted content', () => {
    it('renders slotted menu items', async () => {
      const el = await fixture<MdMenu>(html`
        <md-menu>
          <md-menu-item>Item 1</md-menu-item>
          <md-menu-item>Item 2</md-menu-item>
          <md-menu-item>Item 3</md-menu-item>
        </md-menu>
      `);
      const items = el.querySelectorAll('md-menu-item');

      expect(items.length).toBe(3);
    });

    it('renders slot element', async () => {
      const el = await fixture<MdMenu>(html`<md-menu></md-menu>`);
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
    });
  });
});

describe('md-menu-item', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture(html`<md-menu-item>Menu Item</md-menu-item>`);

      expect(el).toBeDefined();
    });

    it('renders slotted content', async () => {
      const el = await fixture(html`<md-menu-item>Edit</md-menu-item>`);
      const slot = el.shadowRoot!.querySelector('slot:not([name])');

      expect(slot).toBeDefined();
    });

    it('renders prefix slot', async () => {
      const el = await fixture(html`
        <md-menu-item>
          <span slot="prefix">🔧</span>
          Settings
        </md-menu-item>
      `);
      const prefixSlot = el.shadowRoot!.querySelector(
        'slot[name="prefix"]'
      ) as HTMLSlotElement;

      expect(prefixSlot).toBeDefined();
      const assignedElements = prefixSlot.assignedElements();
      expect(assignedElements.length).toBe(1);
    });

    it('renders content slot for main text', async () => {
      const el = await fixture(html` <md-menu-item> Settings </md-menu-item> `);
      const contentSlot = el.shadowRoot!.querySelector(
        '.content slot'
      ) as HTMLSlotElement;

      expect(contentSlot).toBeDefined();
      expect(contentSlot.assignedNodes().length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has role="menuitem"', async () => {
      const el = await fixture(html`<md-menu-item>Item</md-menu-item>`);
      const item = el.shadowRoot!.querySelector('.menu-item');

      expect(item?.getAttribute('role')).toBe('menuitem');
    });

    it('is focusable', async () => {
      const el = await fixture(html`<md-menu-item>Item</md-menu-item>`);
      const item = el.shadowRoot!.querySelector('.menu-item');

      expect(item?.getAttribute('tabindex')).toBe('0');
    });
  });
});
