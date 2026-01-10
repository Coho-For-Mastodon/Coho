import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-dropdown';
import '../../../src/components/md/md-menu';
import type { MdDropdown } from '../../../src/components/md/md-dropdown';

describe('md-dropdown', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdDropdown>(html`<md-dropdown></md-dropdown>`);

      expect(el).toBeDefined();
      expect(el.open).toBe(false);
      expect(el.placement).toBe('bottom-start');
      expect(el.distance).toBe(8);
    });

    it('renders trigger slot', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
        </md-dropdown>
      `);
      const triggerSlot = el.shadowRoot!.querySelector(
        'slot[name="trigger"]'
      ) as HTMLSlotElement;

      expect(triggerSlot).toBeDefined();
    });

    it('renders content slot', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <md-menu>Menu content</md-menu>
        </md-dropdown>
      `);

      // Content slot exists but content is hidden when closed
      const contentHolder = el.shadowRoot!.querySelector('.content-holder');
      expect(contentHolder).toBeDefined();
    });
  });

  describe('open state', () => {
    it('reflects open attribute', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown open></md-dropdown>`
      );

      expect(el.open).toBe(true);
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('show method opens dropdown', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      el.show();
      await elementUpdated(el);

      expect(el.open).toBe(true);
    });

    it('hide method closes dropdown', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown open>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      el.hide();
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });
  });

  describe('placement', () => {
    it('supports bottom-start placement', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown placement="bottom-start"></md-dropdown>`
      );

      expect(el.placement).toBe('bottom-start');
    });

    it('supports bottom-end placement', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown placement="bottom-end"></md-dropdown>`
      );

      expect(el.placement).toBe('bottom-end');
    });

    it('supports top-start placement', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown placement="top-start"></md-dropdown>`
      );

      expect(el.placement).toBe('top-start');
    });

    it('supports top-end placement', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown placement="top-end"></md-dropdown>`
      );

      expect(el.placement).toBe('top-end');
    });
  });

  describe('distance property', () => {
    it('accepts custom distance', async () => {
      const el = await fixture<MdDropdown>(
        html`<md-dropdown distance="16"></md-dropdown>`
      );

      expect(el.distance).toBe(16);
    });
  });

  describe('trigger interaction', () => {
    it('opens on trigger click', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      // Click the trigger wrapper div in shadow DOM
      const triggerDiv = el.shadowRoot!.querySelector(
        '.trigger'
      ) as HTMLElement;
      triggerDiv.click();
      await elementUpdated(el);

      expect(el.open).toBe(true);
    });

    it('closes on second trigger click', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      const triggerDiv = el.shadowRoot!.querySelector(
        '.trigger'
      ) as HTMLElement;

      // Open
      triggerDiv.click();
      await elementUpdated(el);
      expect(el.open).toBe(true);

      // Close
      triggerDiv.click();
      await elementUpdated(el);
      expect(el.open).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    it('closes on Escape key', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      el.show();
      await elementUpdated(el);
      expect(el.open).toBe(true);

      // Simulate Escape key
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on disconnect', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      el.show();
      await elementUpdated(el);

      // Remove from DOM
      el.remove();

      // Should not throw when escape is pressed after removal
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
  });
});
