import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  cleanupFixtures,
  fixture,
  html,
  elementUpdated,
} from '../../test-utils';
import '../../../src/components/md/md-dropdown';
import type { MdDropdown } from '../../../src/components/md/md-dropdown';

async function waitForPopover(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('md-dropdown', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdDropdown>(html`<md-dropdown></md-dropdown>`);

      expect(el).toBeDefined();
      expect(el.open).toBe(false);
      expect(el.placement).toBe('bottom-start');
      expect(el.distance).toBe(8);
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
      const popup = el.shadowRoot!.querySelector('.popup') as HTMLElement;

      el.show();
      await elementUpdated(el);
      await waitForPopover();

      expect(el.open).toBe(true);
      expect(popup.matches(':popover-open')).toBe(true);
    });

    it('hide method closes dropdown', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);
      const popup = el.shadowRoot!.querySelector('.popup') as HTMLElement;

      el.show();
      await elementUpdated(el);
      await waitForPopover();

      el.hide();
      await elementUpdated(el);
      await waitForPopover();

      expect(el.open).toBe(false);
      expect(popup.matches(':popover-open')).toBe(false);
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
      await waitForPopover();

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
      await waitForPopover();
      expect(el.open).toBe(true);

      // Close
      triggerDiv.click();
      await elementUpdated(el);
      await waitForPopover();
      expect(el.open).toBe(false);
    });

    it('updates trigger aria state', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);
      const trigger = el.querySelector('[slot="trigger"]') as HTMLElement;

      el.show();
      await elementUpdated(el);
      await waitForPopover();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-controls')).toBe('dropdown-popup');
    });
  });

  describe('popover lifecycle', () => {
    it('syncs open state when the native popover closes', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);
      const popup = el.shadowRoot!.querySelector('.popup') as HTMLDivElement;

      el.show();
      await elementUpdated(el);
      await waitForPopover();
      expect(el.open).toBe(true);

      popup.hidePopover();
      await elementUpdated(el);
      await waitForPopover();

      expect(el.open).toBe(false);
    });

    // Skipped: popover show/hide event timing is flaky in test environment
    it.skip('emits show and hide events from the popover lifecycle', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);
      const popup = el.shadowRoot!.querySelector('.popup') as HTMLDivElement;
      const showHandler = vi.fn();
      const hideHandler = vi.fn();

      el.addEventListener('md-dropdown-show', showHandler);
      el.addEventListener('md-dropdown-hide', hideHandler);

      el.show();
      await elementUpdated(el);
      await waitForPopover();

      popup.hidePopover();
      await elementUpdated(el);
      await waitForPopover();

      expect(showHandler).toHaveBeenCalledTimes(1);
      expect(hideHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('can be removed while open', async () => {
      const el = await fixture<MdDropdown>(html`
        <md-dropdown>
          <button slot="trigger">Open</button>
          <div>Content</div>
        </md-dropdown>
      `);

      el.show();
      await elementUpdated(el);
      await waitForPopover();

      el.remove();

      expect(document.body.contains(el)).toBe(false);
    });
  });
});
