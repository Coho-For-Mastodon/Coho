import { describe, it, expect } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-badge';
import type { MdBadge } from '../../../src/components/md/md-badge';

describe('md-badge', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdBadge>(html`<md-badge></md-badge>`);

      expect(el).toBeDefined();
      expect(el.variant).toBe('filled');
      expect(el.clickable).toBe(false);
    });

    it('renders badge element', async () => {
      const el = await fixture<MdBadge>(html`<md-badge></md-badge>`);
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(badge).toBeDefined();
    });

    it('renders slotted content', async () => {
      const el = await fixture<MdBadge>(html`<md-badge>New</md-badge>`);
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
    });
  });

  describe('variants', () => {
    it('applies filled variant by default', async () => {
      const el = await fixture<MdBadge>(html`<md-badge></md-badge>`);
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(badge?.classList.contains('filled')).toBe(true);
    });

    it('applies outlined variant', async () => {
      const el = await fixture<MdBadge>(
        html`<md-badge variant="outlined"></md-badge>`
      );
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(badge?.classList.contains('outlined')).toBe(true);
    });

    it('changes variant dynamically', async () => {
      const el = await fixture<MdBadge>(html`<md-badge></md-badge>`);
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(badge?.classList.contains('filled')).toBe(true);

      el.variant = 'outlined';
      await elementUpdated(el);

      expect(badge?.classList.contains('outlined')).toBe(true);
    });
  });

  describe('clickable state', () => {
    it('adds clickable class when clickable', async () => {
      const el = await fixture<MdBadge>(html`<md-badge clickable></md-badge>`);
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(el.clickable).toBe(true);
      expect(badge?.classList.contains('clickable')).toBe(true);
    });

    it('does not have clickable class by default', async () => {
      const el = await fixture<MdBadge>(html`<md-badge></md-badge>`);
      const badge = el.shadowRoot!.querySelector('.badge');

      expect(badge?.classList.contains('clickable')).toBe(false);
    });
  });

  describe('content', () => {
    it('displays text content', async () => {
      const el = await fixture<MdBadge>(html`<md-badge>5</md-badge>`);
      const slot = el.shadowRoot!.querySelector('slot') as HTMLSlotElement;
      const assignedNodes = slot.assignedNodes();

      expect(assignedNodes.length).toBeGreaterThan(0);
    });

    it('displays custom HTML content', async () => {
      const el = await fixture<MdBadge>(
        html`<md-badge><strong>Premium</strong></md-badge>`
      );
      const slot = el.shadowRoot!.querySelector('slot') as HTMLSlotElement;
      const assignedElements = slot.assignedElements();

      expect(assignedElements.length).toBe(1);
      expect(assignedElements[0].tagName).toBe('STRONG');
    });
  });
});
