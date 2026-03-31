import { describe, it, expect } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-divider';
import type { MdDivider } from '../../../src/components/md/md-divider';

describe('md-divider', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdDivider>(html`<md-divider></md-divider>`);

      expect(el).toBeDefined();
      expect(el.inset).toBe(false);
      expect(el.insetStart).toBe(false);
      expect(el.insetEnd).toBe(false);
      expect(el.vertical).toBe(false);
    });

    it('has aria-hidden attribute', async () => {
      const el = await fixture<MdDivider>(html`<md-divider></md-divider>`);
      const hr = el.shadowRoot!.querySelector('hr');

      expect(hr?.getAttribute('aria-hidden')).toBe('true');
    });

    it('exposes divider part', async () => {
      const el = await fixture<MdDivider>(html`<md-divider></md-divider>`);
      const hr = el.shadowRoot!.querySelector('hr');

      expect(hr?.getAttribute('part')).toBe('divider');
    });
  });

  describe('inset property', () => {
    it('reflects inset attribute', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider inset></md-divider>`
      );

      expect(el.inset).toBe(true);
      expect(el.hasAttribute('inset')).toBe(true);
    });

    it('updates inset dynamically', async () => {
      const el = await fixture<MdDivider>(html`<md-divider></md-divider>`);

      expect(el.hasAttribute('inset')).toBe(false);

      el.inset = true;
      await elementUpdated(el);

      expect(el.hasAttribute('inset')).toBe(true);
    });
  });

  describe('inset-start property', () => {
    it('reflects inset-start attribute', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider inset-start></md-divider>`
      );

      expect(el.insetStart).toBe(true);
      expect(el.hasAttribute('inset-start')).toBe(true);
    });
  });

  describe('inset-end property', () => {
    it('reflects inset-end attribute', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider inset-end></md-divider>`
      );

      expect(el.insetEnd).toBe(true);
      expect(el.hasAttribute('inset-end')).toBe(true);
    });
  });

  describe('vertical property', () => {
    it('reflects vertical attribute', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider vertical></md-divider>`
      );

      expect(el.vertical).toBe(true);
      expect(el.hasAttribute('vertical')).toBe(true);
    });

    it('updates vertical dynamically', async () => {
      const el = await fixture<MdDivider>(html`<md-divider></md-divider>`);

      expect(el.hasAttribute('vertical')).toBe(false);

      el.vertical = true;
      await elementUpdated(el);

      expect(el.hasAttribute('vertical')).toBe(true);
    });
  });

  describe('combinations', () => {
    it('supports inset and vertical together', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider inset vertical></md-divider>`
      );

      expect(el.inset).toBe(true);
      expect(el.vertical).toBe(true);
    });

    it('supports inset-start and inset-end together', async () => {
      const el = await fixture<MdDivider>(
        html`<md-divider inset-start inset-end></md-divider>`
      );

      expect(el.insetStart).toBe(true);
      expect(el.insetEnd).toBe(true);
    });
  });
});
