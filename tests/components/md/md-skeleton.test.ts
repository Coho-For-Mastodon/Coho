import { describe, it, expect } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-skeleton';
import type { MdSkeleton } from '../../../src/components/md/md-skeleton';

describe('md-skeleton', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdSkeleton>(html`<md-skeleton></md-skeleton>`);

      expect(el).toBeDefined();
      expect(el.shape).toBe('rectangle');
      expect(el.width).toBe('100%');
      expect(el.height).toBe('1em');
    });
  });

  describe('shape property', () => {
    it('renders rectangle shape by default', async () => {
      const el = await fixture<MdSkeleton>(html`<md-skeleton></md-skeleton>`);
      const skeleton = el.shadowRoot!.querySelector('.skeleton');

      expect(el.shape).toBe('rectangle');
      expect(skeleton?.classList.contains('circle')).toBe(false);
    });

    it('renders circle shape', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton shape="circle"></md-skeleton>`
      );
      const skeleton = el.shadowRoot!.querySelector('.skeleton');

      expect(el.shape).toBe('circle');
      expect(skeleton?.classList.contains('circle')).toBe(true);
    });

    it('changes shape dynamically', async () => {
      const el = await fixture<MdSkeleton>(html`<md-skeleton></md-skeleton>`);
      const skeleton = el.shadowRoot!.querySelector('.skeleton');

      expect(skeleton?.classList.contains('circle')).toBe(false);

      el.shape = 'circle';
      await elementUpdated(el);

      expect(skeleton?.classList.contains('circle')).toBe(true);
    });
  });

  describe('width property', () => {
    it('accepts custom width', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton width="200px"></md-skeleton>`
      );

      expect(el.width).toBe('200px');
    });

    it('applies width via inline style when attribute set', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton width="150px"></md-skeleton>`
      );
      await elementUpdated(el);

      expect(el.style.width).toBe('150px');
    });
  });

  describe('height property', () => {
    it('accepts custom height', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton height="50px"></md-skeleton>`
      );

      expect(el.height).toBe('50px');
    });

    it('applies height via inline style when attribute set', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton height="100px"></md-skeleton>`
      );
      await elementUpdated(el);

      expect(el.style.height).toBe('100px');
    });
  });

  describe('common use cases', () => {
    it('renders text placeholder', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton width="80%" height="1em"></md-skeleton>`
      );

      expect(el.width).toBe('80%');
      expect(el.height).toBe('1em');
    });

    it('renders avatar placeholder', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton
          shape="circle"
          width="48px"
          height="48px"
        ></md-skeleton>`
      );

      expect(el.shape).toBe('circle');
      expect(el.width).toBe('48px');
      expect(el.height).toBe('48px');
    });

    it('renders card placeholder', async () => {
      const el = await fixture<MdSkeleton>(
        html`<md-skeleton width="100%" height="200px"></md-skeleton>`
      );

      expect(el.width).toBe('100%');
      expect(el.height).toBe('200px');
    });
  });
});
