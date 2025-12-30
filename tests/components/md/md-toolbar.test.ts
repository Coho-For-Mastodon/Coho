import { describe, it, expect } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-toolbar';
import type { MdToolbar } from '../../../src/components/md/md-toolbar';

describe('md-toolbar', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);

      expect(el).toBeDefined();
      expect(el.position).toBe('static');
      expect(el.align).toBe('start');
    });

    it('renders toolbar container', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar).toBeDefined();
    });

    it('renders slotted content', async () => {
      const el = await fixture<MdToolbar>(html`
        <md-toolbar>
          <button>Action 1</button>
          <button>Action 2</button>
        </md-toolbar>
      `);
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
      const buttons = el.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });
  });

  describe('position property', () => {
    it('applies static position by default', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-static')).toBe(true);
    });

    it('applies top position', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar position="top"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-top')).toBe(true);
    });

    it('applies bottom position', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar position="bottom"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-bottom')).toBe(true);
    });

    it('changes position dynamically', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-static')).toBe(true);

      el.position = 'top';
      await elementUpdated(el);

      expect(toolbar?.classList.contains('position-top')).toBe(true);
    });
  });

  describe('align property', () => {
    it('applies start alignment by default', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('align-start')).toBe(true);
    });

    it('applies center alignment', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar align="center"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('align-center')).toBe(true);
    });

    it('applies end alignment', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar align="end"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('align-end')).toBe(true);
    });

    it('changes alignment dynamically', async () => {
      const el = await fixture<MdToolbar>(html`<md-toolbar></md-toolbar>`);
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('align-start')).toBe(true);

      el.align = 'center';
      await elementUpdated(el);

      expect(toolbar?.classList.contains('align-center')).toBe(true);
    });
  });

  describe('combinations', () => {
    it('supports top position with center alignment', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar position="top" align="center"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-top')).toBe(true);
      expect(toolbar?.classList.contains('align-center')).toBe(true);
    });

    it('supports bottom position with end alignment', async () => {
      const el = await fixture<MdToolbar>(
        html`<md-toolbar position="bottom" align="end"></md-toolbar>`
      );
      const toolbar = el.shadowRoot!.querySelector('.toolbar');

      expect(toolbar?.classList.contains('position-bottom')).toBe(true);
      expect(toolbar?.classList.contains('align-end')).toBe(true);
    });
  });
});
