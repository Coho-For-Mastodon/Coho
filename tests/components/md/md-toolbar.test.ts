import { describe, it, expect } from 'vitest';
import { fixture, html } from '../../test-utils';
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
});
