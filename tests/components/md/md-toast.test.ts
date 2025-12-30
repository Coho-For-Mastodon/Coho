import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-toast';
import type { MdToast } from '../../../src/components/md/md-toast';

describe('md-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);

      expect(el).toBeDefined();
      expect(el.message).toBe('');
      expect(el.actionLabel).toBe('');
      expect(el.duration).toBe(4000);
      expect(el.variant).toBe('info');
      expect(el.closable).toBe(false);
      expect(el.open).toBe(false);
      expect(el.position).toBe('bottom');
    });

    it('renders message text', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast message="Test message"></md-toast>`
      );
      const message = el.shadowRoot!.querySelector('.message');

      expect(message?.textContent).toBe('Test message');
    });

    it('renders toast container', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);
      const container = el.shadowRoot!.querySelector('.toast-container');

      expect(container).toBeDefined();
    });
  });

  describe('open state', () => {
    it('shows toast when open is set', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast open message="Test"></md-toast>`
      );

      expect(el.open).toBe(true);
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('hides toast when open is false', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast message="Test"></md-toast>`
      );

      expect(el.open).toBe(false);
      expect(el.hasAttribute('open')).toBe(false);
    });

    it('show method opens toast', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast message="Test"></md-toast>`
      );

      el.show();
      await elementUpdated(el);

      expect(el.open).toBe(true);
    });

    it('hide method closes toast', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast open message="Test"></md-toast>`
      );

      el.hide();
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });
  });

  describe('variants', () => {
    it('applies info variant by default', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);

      expect(el.variant).toBe('info');
    });

    it('applies success variant', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast variant="success"></md-toast>`
      );

      expect(el.variant).toBe('success');
      expect(el.getAttribute('variant')).toBe('success');
    });

    it('applies warning variant', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast variant="warning"></md-toast>`
      );

      expect(el.variant).toBe('warning');
      expect(el.getAttribute('variant')).toBe('warning');
    });

    it('applies error variant', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast variant="error"></md-toast>`
      );

      expect(el.variant).toBe('error');
      expect(el.getAttribute('variant')).toBe('error');
    });
  });

  describe('position', () => {
    it('defaults to bottom position', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);

      expect(el.position).toBe('bottom');
      // Note: position is not reflected as an attribute by default
    });

    it('supports top position', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast position="top"></md-toast>`
      );

      expect(el.position).toBe('top');
      expect(el.getAttribute('position')).toBe('top');
    });
  });

  describe('action button', () => {
    it('renders action button when actionLabel is set', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast action-label="Undo"></md-toast>`
      );
      const actionBtn = el.shadowRoot!.querySelector('button');

      expect(actionBtn).toBeDefined();
      expect(actionBtn?.textContent?.trim()).toBe('Undo');
    });

    it('does not render action button when actionLabel is empty', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);
      const actions = el.shadowRoot!.querySelector('.actions');
      const buttons = actions?.querySelectorAll('button') || [];

      // Should only have close button if closable, no action button
      const actionBtn = Array.from(buttons).find(
        (btn) => !btn.classList.contains('close-btn')
      );
      expect(actionBtn).toBeUndefined();
    });

    it('dispatches action-click event when action is clicked', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast action-label="Undo"></md-toast>`
      );
      const actionBtn = el.shadowRoot!.querySelector(
        'button:not(.close-btn)'
      ) as HTMLButtonElement;
      const actionHandler = vi.fn();

      el.addEventListener('action-click', actionHandler);
      actionBtn?.click();
      await elementUpdated(el);

      expect(actionHandler).toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('renders close button when closable is true', async () => {
      const el = await fixture<MdToast>(html`<md-toast closable></md-toast>`);
      const closeBtn = el.shadowRoot!.querySelector('.close-button');

      expect(closeBtn).toBeDefined();
    });

    it('does not render close button when closable is false', async () => {
      const el = await fixture<MdToast>(html`<md-toast></md-toast>`);
      const closeBtn = el.shadowRoot!.querySelector('.close-button');

      expect(closeBtn).toBeNull();
    });

    it('closes toast when close button is clicked', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast open closable></md-toast>`
      );
      const closeBtn = el.shadowRoot!.querySelector(
        '.close-button'
      ) as HTMLButtonElement;

      closeBtn.click();
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });
  });

  describe('duration', () => {
    it('accepts custom duration', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast duration="5000"></md-toast>`
      );

      expect(el.duration).toBe(5000);
    });

    it('auto-hides after duration when opened', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast duration="3000" message="Test"></md-toast>`
      );

      el.show();
      await elementUpdated(el);

      expect(el.open).toBe(true);

      vi.advanceTimersByTime(3000);
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });

    it('does not auto-hide when duration is 0', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast duration="0" message="Test"></md-toast>`
      );

      el.show();
      await elementUpdated(el);

      expect(el.open).toBe(true);

      vi.advanceTimersByTime(10000);
      await elementUpdated(el);

      // Should still be open
      expect(el.open).toBe(true);
    });
  });

  describe('events', () => {
    it('dispatches show event when opened', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast message="Test"></md-toast>`
      );
      const showHandler = vi.fn();

      el.addEventListener('show', showHandler);
      el.show();
      await elementUpdated(el);

      expect(showHandler).toHaveBeenCalled();
    });

    it('dispatches hide event when closed', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast open message="Test"></md-toast>`
      );
      const hideHandler = vi.fn();

      el.addEventListener('hide', hideHandler);
      el.hide();
      await elementUpdated(el);

      expect(hideHandler).toHaveBeenCalled();
    });
  });

  describe('message property', () => {
    it('updates message dynamically', async () => {
      const el = await fixture<MdToast>(
        html`<md-toast message="Initial"></md-toast>`
      );
      const message = el.shadowRoot!.querySelector('.message');

      expect(message?.textContent).toBe('Initial');

      el.message = 'Updated';
      await elementUpdated(el);

      expect(message?.textContent).toBe('Updated');
    });
  });
});
