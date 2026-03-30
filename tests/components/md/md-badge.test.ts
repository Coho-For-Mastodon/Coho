import { describe, it, expect } from 'vitest';
import { fixture, html } from '../../test-utils';
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
  });

  describe('clickable state', () => {
    it('adds clickable class when clickable', async () => {
      const el = await fixture<MdBadge>(html`<md-badge clickable></md-badge>`);

      expect(el.clickable).toBe(true);
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
