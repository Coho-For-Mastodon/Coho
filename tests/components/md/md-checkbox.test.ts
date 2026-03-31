import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-checkbox';
import type { MdCheckbox } from '../../../src/components/md/md-checkbox';

describe('md-checkbox', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);

      expect(el).toBeDefined();
      expect(el.checked).toBe(false);
      expect(el.disabled).toBe(false);
      expect(el.value).toBe('');
    });
  });

  describe('checked state', () => {
    it('can be initially checked', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox checked></md-checkbox>`
      );

      expect(el.checked).toBe(true);
      expect(el.hasAttribute('checked')).toBe(true);
    });

    it('toggles checked state on click', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);

      expect(el.checked).toBe(false);

      // Click on the wrapper div inside shadow DOM (component handles click on wrapper)
      const wrapper = el.shadowRoot!.querySelector('.wrapper') as HTMLElement;
      wrapper.click();
      await elementUpdated(el);

      expect(el.checked).toBe(true);

      wrapper.click();
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });

    it('toggles checked state on keyboard Enter', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const wrapper = el.shadowRoot!.querySelector('.wrapper')!;

      expect(el.checked).toBe(false);

      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(true);
    });

    it('toggles checked state on keyboard Space', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const wrapper = el.shadowRoot!.querySelector('.wrapper')!;

      expect(el.checked).toBe(false);

      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(true);
    });

    it('reflects checked attribute', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);

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
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox disabled></md-checkbox>`
      );

      expect(el.disabled).toBe(true);
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('does not toggle when disabled', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox disabled></md-checkbox>`
      );

      expect(el.checked).toBe(false);

      el.click();
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });

    it('does not respond to keyboard when disabled', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox disabled></md-checkbox>`
      );
      const wrapper = el.shadowRoot!.querySelector('.wrapper')!;

      wrapper.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(el.checked).toBe(false);
    });
  });

  describe('value property', () => {
    it('accepts a value property', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox value="option1"></md-checkbox>`
      );

      expect(el.value).toBe('option1');
    });
  });

  describe('events', () => {
    it('dispatches change event when toggled', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      // Click the wrapper to trigger state change
      const wrapper = el.shadowRoot!.querySelector('.wrapper') as HTMLElement;
      wrapper.click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
      expect(changeHandler.mock.calls[0][0].detail.checked).toBe(true);
    });

    it('includes value in change detail', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox value="test-value"></md-checkbox>`
      );
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      const wrapper = el.shadowRoot!.querySelector('.wrapper') as HTMLElement;
      wrapper.click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
      expect(changeHandler.mock.calls[0][0].detail.value).toBe('test-value');
    });

    it('includes original event in change detail', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const changeHandler = vi.fn();

      el.addEventListener('change', changeHandler);
      const wrapper = el.shadowRoot!.querySelector('.wrapper') as HTMLElement;
      wrapper.click();
      await elementUpdated(el);

      expect(changeHandler.mock.calls[0][0].detail.originalEvent).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('has role="checkbox"', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const wrapper = el.shadowRoot!.querySelector('.wrapper');

      expect(wrapper?.getAttribute('role')).toBe('checkbox');
    });

    it('sets aria-checked based on checked state', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const wrapper = el.shadowRoot!.querySelector('.wrapper');

      expect(wrapper?.getAttribute('aria-checked')).toBe('false');

      el.checked = true;
      await elementUpdated(el);

      expect(wrapper?.getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-disabled based on disabled state', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox disabled></md-checkbox>`
      );
      const wrapper = el.shadowRoot!.querySelector('.wrapper');

      expect(wrapper?.getAttribute('aria-disabled')).toBe('true');
    });

    it('is focusable when not disabled', async () => {
      const el = await fixture<MdCheckbox>(html`<md-checkbox></md-checkbox>`);
      const wrapper = el.shadowRoot!.querySelector('.wrapper');

      expect(wrapper?.getAttribute('tabindex')).toBe('0');
    });

    it('is not focusable when disabled', async () => {
      const el = await fixture<MdCheckbox>(
        html`<md-checkbox disabled></md-checkbox>`
      );
      const wrapper = el.shadowRoot!.querySelector('.wrapper');

      expect(wrapper?.getAttribute('tabindex')).toBe('-1');
    });
  });
});
