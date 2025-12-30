import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-switch';
import type { MdSwitch } from '../../../src/components/md/md-switch';

describe('md-switch', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);

      expect(el).toBeDefined();
      expect(el.checked).toBe(false);
      expect(el.disabled).toBe(false);
    });

    it('renders with a label via slot', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch>Enable notifications</md-switch>`
      );
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
    });
  });

  describe('checked state', () => {
    it('can be initially checked', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch checked></md-switch>`);

      expect(el.checked).toBe(true);
      expect(el.hasAttribute('checked')).toBe(true);
    });

    it('toggles checked state on click', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;

      expect(el.checked).toBe(false);

      control.click();
      await elementUpdated(el);

      expect(el.checked).toBe(true);

      control.click();
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });

    it('toggles checked state on keyboard Enter', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;

      expect(el.checked).toBe(false);

      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(true);
    });

    it('toggles checked state on keyboard Space', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;

      expect(el.checked).toBe(false);

      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(true);
    });

    it('reflects checked attribute', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);

      el.checked = true;
      await elementUpdated(el);

      expect(el.hasAttribute('checked')).toBe(true);

      el.checked = false;
      await elementUpdated(el);

      expect(el.hasAttribute('checked')).toBe(false);
    });
  });

  describe('disabled state', () => {
    it('can be disabled', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );

      expect(el.disabled).toBe(true);
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('does not toggle when disabled', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );
      const control = el.shadowRoot!.querySelector('.control')!;

      expect(el.checked).toBe(false);

      control.click();
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });

    it('does not respond to keyboard when disabled', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );
      const control = el.shadowRoot!.querySelector('.control')!;

      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });
  });

  describe('events', () => {
    it('dispatches change event when toggled', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      control.click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
      expect(changeHandler.mock.calls[0][0].detail.checked).toBe(true);
    });

    it('dispatches sl-change event for Shoelace compatibility', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;
      const slChangeHandler = vi.fn();

      el.addEventListener('sl-change', slChangeHandler);
      control.click();
      await elementUpdated(el);

      expect(slChangeHandler).toHaveBeenCalled();
    });

    it('includes original event in change detail', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control')!;
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      control.click();
      await elementUpdated(el);

      expect(changeHandler.mock.calls[0][0].detail.originalEvent).toBeDefined();
    });

    it('does not dispatch change when disabled', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );
      const control = el.shadowRoot!.querySelector('.control')!;
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      control.click();
      await elementUpdated(el);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="switch"', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control');

      expect(control?.getAttribute('role')).toBe('switch');
    });

    it('sets aria-checked based on checked state', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control');

      expect(control?.getAttribute('aria-checked')).toBe('false');

      el.checked = true;
      await elementUpdated(el);

      expect(control?.getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-disabled based on disabled state', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );
      const control = el.shadowRoot!.querySelector('.control');

      expect(control?.getAttribute('aria-disabled')).toBe('true');
    });

    it('is focusable when not disabled', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control');

      expect(control?.getAttribute('tabindex')).toBe('0');
    });

    it('is not focusable when disabled', async () => {
      const el = await fixture<MdSwitch>(
        html`<md-switch disabled></md-switch>`
      );
      const control = el.shadowRoot!.querySelector('.control');

      expect(control?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('visual elements', () => {
    it('renders control track', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const control = el.shadowRoot!.querySelector('.control');

      expect(control).toBeDefined();
    });

    it('renders thumb', async () => {
      const el = await fixture<MdSwitch>(html`<md-switch></md-switch>`);
      const thumb = el.shadowRoot!.querySelector('.thumb');

      expect(thumb).toBeDefined();
    });
  });
});
