import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-card';
import type { MdCard } from '../../../src/components/md/md-card';

describe('md-card', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdCard>(html`<md-card></md-card>`);

      expect(el).toBeDefined();
      expect(el.variant).toBe('filled');
      expect(el.clickable).toBe(false);
      expect(el.disabled).toBe(false);
    });
  });

  describe('slots', () => {
    it('renders header slot', async () => {
      const el = await fixture<MdCard>(html`
        <md-card>
          <span slot="header">Card Header</span>
        </md-card>
      `);
      const headerSlot = el.shadowRoot!.querySelector(
        'slot[name="header"]'
      ) as HTMLSlotElement;

      expect(headerSlot).toBeDefined();
      const assignedNodes = headerSlot.assignedElements();
      expect(assignedNodes.length).toBe(1);
      expect(assignedNodes[0].textContent).toBe('Card Header');
    });

    it('renders footer slot', async () => {
      const el = await fixture<MdCard>(html`
        <md-card>
          <span slot="footer">Card Footer</span>
        </md-card>
      `);
      const footerSlot = el.shadowRoot!.querySelector(
        'slot[name="footer"]'
      ) as HTMLSlotElement;

      expect(footerSlot).toBeDefined();
      const assignedNodes = footerSlot.assignedElements();
      expect(assignedNodes.length).toBe(1);
      expect(assignedNodes[0].textContent).toBe('Card Footer');
    });

    it('renders image slot', async () => {
      const el = await fixture<MdCard>(html`
        <md-card>
          <img slot="image" src="test.jpg" alt="Test" />
        </md-card>
      `);
      const imageSlot = el.shadowRoot!.querySelector(
        'slot[name="image"]'
      ) as HTMLSlotElement;

      expect(imageSlot).toBeDefined();
      const assignedNodes = imageSlot.assignedElements();
      expect(assignedNodes.length).toBe(1);
      expect(assignedNodes[0].tagName).toBe('IMG');
    });

    it('renders default body slot', async () => {
      const el = await fixture<MdCard>(html`
        <md-card>
          <p>Body content</p>
        </md-card>
      `);
      const defaultSlot = el.shadowRoot!.querySelector(
        'slot:not([name])'
      ) as HTMLSlotElement;

      expect(defaultSlot).toBeDefined();
      const assignedNodes = defaultSlot.assignedElements();
      expect(assignedNodes.length).toBe(1);
      expect(assignedNodes[0].textContent).toBe('Body content');
    });

    it('renders all slots together', async () => {
      const el = await fixture<MdCard>(html`
        <md-card>
          <img slot="image" src="test.jpg" alt="Test" />
          <span slot="header">Header</span>
          <p>Body</p>
          <span slot="footer">Footer</span>
        </md-card>
      `);

      const imageSlot = el.shadowRoot!.querySelector(
        'slot[name="image"]'
      ) as HTMLSlotElement;
      const headerSlot = el.shadowRoot!.querySelector(
        'slot[name="header"]'
      ) as HTMLSlotElement;
      const bodySlot = el.shadowRoot!.querySelector(
        'slot:not([name])'
      ) as HTMLSlotElement;
      const footerSlot = el.shadowRoot!.querySelector(
        'slot[name="footer"]'
      ) as HTMLSlotElement;

      expect(imageSlot.assignedElements().length).toBe(1);
      expect(headerSlot.assignedElements().length).toBe(1);
      expect(bodySlot.assignedElements().length).toBe(1);
      expect(footerSlot.assignedElements().length).toBe(1);
    });
  });

  describe('clickable state', () => {
    it('reflects clickable property when set', async () => {
      const el = await fixture<MdCard>(html`<md-card clickable></md-card>`);

      expect(el.clickable).toBe(true);
    });

    it('dispatches card-click event when clicked and clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card clickable></md-card>`);
      const card = el.shadowRoot!.querySelector('.card')! as HTMLElement;
      const clickHandler = vi.fn();

      el.addEventListener('card-click', clickHandler);
      card.click();
      await elementUpdated(el);

      expect(clickHandler).toHaveBeenCalled();
    });

    it('does not dispatch card-click when not clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card></md-card>`);
      const card = el.shadowRoot!.querySelector('.card')! as HTMLElement;
      const clickHandler = vi.fn();

      el.addEventListener('card-click', clickHandler);
      card.click();
      await elementUpdated(el);

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('reflects disabled property when set', async () => {
      const el = await fixture<MdCard>(html`<md-card disabled></md-card>`);

      expect(el.disabled).toBe(true);
    });

    it('does not dispatch card-click when disabled', async () => {
      const el = await fixture<MdCard>(
        html`<md-card clickable disabled></md-card>`
      );
      const card = el.shadowRoot!.querySelector('.card')! as HTMLElement;
      const clickHandler = vi.fn();

      el.addEventListener('card-click', clickHandler);
      card.click();
      await elementUpdated(el);

      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has tabindex when clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card clickable></md-card>`);
      const card = el.shadowRoot!.querySelector('.card');

      expect(card?.getAttribute('tabindex')).toBe('0');
    });

    it('has tabindex -1 when not clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card></md-card>`);
      const card = el.shadowRoot!.querySelector('.card');

      // Component sets tabindex to -1 when not clickable
      expect(card?.getAttribute('tabindex')).toBe('-1');
    });

    it('has role button when clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card clickable></md-card>`);
      const card = el.shadowRoot!.querySelector('.card');

      expect(card?.getAttribute('role')).toBe('button');
    });

    it('has role article when not clickable', async () => {
      const el = await fixture<MdCard>(html`<md-card></md-card>`);
      const card = el.shadowRoot!.querySelector('.card');

      expect(card?.getAttribute('role')).toBe('article');
    });
  });
});
