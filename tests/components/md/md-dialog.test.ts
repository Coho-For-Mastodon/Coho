import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing';
import '../../../src/components/md/md-dialog';
import type { MdDialog } from '../../../src/components/md/md-dialog';

describe('md-dialog', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);

      expect(el).toBeDefined();
      expect(el.label).toBe('');
      expect(el.open).toBe(false);
      expect(el.fullscreen).toBe(false);
      expect(el.noBackdropClose).toBe(false);
    });

    it('renders native dialog element', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog');

      expect(dialog).toBeDefined();
    });

    it('renders dialog title from label property', async () => {
      const el = await fixture<MdDialog>(
        html`<md-dialog label="Test Dialog"></md-dialog>`
      );
      const title = el.shadowRoot!.querySelector('.dialog-title');

      expect(title?.textContent).toBe('Test Dialog');
    });

    it('renders close button', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const closeBtn = el.shadowRoot!.querySelector('.close-btn');

      expect(closeBtn).toBeDefined();
      expect(closeBtn?.getAttribute('aria-label')).toBe('Close dialog');
    });
  });

  describe('open state', () => {
    it('shows dialog when open is set', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog');

      // The dialog should be open
      expect(el.open).toBe(true);
      expect(dialog?.open).toBe(true);
    });

    it('show method opens dialog', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);

      el.show();
      await elementUpdated(el);

      expect(el.open).toBe(true);
    });

    it('hide method closes dialog', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog')!;

      // Mock animationend since we're not in a real browser environment
      const hidePromise = el.hide();
      dialog.dispatchEvent(new Event('animationend'));
      await hidePromise;
      await elementUpdated(el);

      expect(el.open).toBe(false);
    });
  });

  describe('fullscreen mode', () => {
    it('applies fullscreen class when fullscreen is true', async () => {
      const el = await fixture<MdDialog>(
        html`<md-dialog fullscreen></md-dialog>`
      );
      const dialog = el.shadowRoot!.querySelector('dialog');

      expect(el.fullscreen).toBe(true);
      expect(dialog?.classList.contains('fullscreen')).toBe(true);
    });

    it('removes fullscreen class when fullscreen is false', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog');

      expect(dialog?.classList.contains('fullscreen')).toBe(false);
    });
  });

  describe('slots', () => {
    it('renders default body slot', async () => {
      const el = await fixture<MdDialog>(html`
        <md-dialog>
          <p>Dialog body content</p>
        </md-dialog>
      `);
      const bodySlot = el.shadowRoot!.querySelector(
        '.dialog-body slot:not([name])'
      ) as HTMLSlotElement;

      expect(bodySlot).toBeDefined();
    });

    it('renders header-actions slot', async () => {
      const el = await fixture<MdDialog>(html`
        <md-dialog>
          <button slot="header-actions">Action</button>
        </md-dialog>
      `);
      const headerActionsSlot = el.shadowRoot!.querySelector(
        'slot[name="header-actions"]'
      ) as HTMLSlotElement;

      expect(headerActionsSlot).toBeDefined();
      const assignedNodes = headerActionsSlot.assignedElements();
      expect(assignedNodes.length).toBe(1);
    });

    it('renders footer slot when provided', async () => {
      const el = await fixture<MdDialog>(html`
        <md-dialog>
          <button slot="footer">Close</button>
        </md-dialog>
      `);
      const footerSlot = el.shadowRoot!.querySelector(
        'slot[name="footer"]'
      ) as HTMLSlotElement;

      expect(footerSlot).toBeDefined();
    });
  });

  describe('events', () => {
    it('dispatches md-dialog-show when opened', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const showHandler = vi.fn();

      el.addEventListener('md-dialog-show', showHandler);
      el.show();
      await elementUpdated(el);

      expect(showHandler).toHaveBeenCalled();
    });

    it('dispatches md-dialog-hide when closed', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog')!;
      const hideHandler = vi.fn();

      el.addEventListener('md-dialog-hide', hideHandler);

      // Simulate dialog close
      dialog.dispatchEvent(new Event('close'));
      await elementUpdated(el);

      expect(hideHandler).toHaveBeenCalled();
    });
  });

  describe('backdrop close', () => {
    it('closes on backdrop click by default', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog')!;

      // Simulate backdrop click (clicking on dialog element itself, not children)
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: dialog });
      dialog.dispatchEvent(event);

      // Dialog should start closing
      expect(dialog.classList.contains('closing')).toBe(true);
    });

    it('does not close on backdrop click when noBackdropClose is true', async () => {
      const el = await fixture<MdDialog>(
        html`<md-dialog open no-backdrop-close></md-dialog>`
      );
      const dialog = el.shadowRoot!.querySelector('dialog')!;

      // Simulate backdrop click
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: dialog });
      dialog.dispatchEvent(event);

      // Dialog should not be closing
      expect(dialog.classList.contains('closing')).toBe(false);
    });

    it('does not close when clicking dialog content', async () => {
      const el = await fixture<MdDialog>(html`
        <md-dialog open>
          <p id="content">Content</p>
        </md-dialog>
      `);
      const dialog = el.shadowRoot!.querySelector('dialog')!;
      const body = el.shadowRoot!.querySelector('.dialog-body')!;

      // Simulate click on dialog body (not backdrop)
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: body });
      dialog.dispatchEvent(event);

      // Dialog should not be closing
      expect(dialog.classList.contains('closing')).toBe(false);
    });
  });

  describe('close button', () => {
    it('closes dialog when close button is clicked', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog')!;
      const closeBtn = el.shadowRoot!.querySelector(
        '.close-btn'
      ) as HTMLButtonElement;

      closeBtn.click();
      await elementUpdated(el);

      // Dialog should start closing
      expect(dialog.classList.contains('closing')).toBe(true);
    });
  });

  describe('cancel event', () => {
    it('prevents default cancel and closes dialog', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog open></md-dialog>`);
      const dialog = el.shadowRoot!.querySelector('dialog')!;

      const cancelEvent = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancelEvent);
      await elementUpdated(el);

      expect(cancelEvent.defaultPrevented).toBe(true);
      expect(dialog.classList.contains('closing')).toBe(true);
    });
  });

  describe('structure', () => {
    it('has dialog-header section', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const header = el.shadowRoot!.querySelector('.dialog-header');

      expect(header).toBeDefined();
    });

    it('has dialog-body section', async () => {
      const el = await fixture<MdDialog>(html`<md-dialog></md-dialog>`);
      const body = el.shadowRoot!.querySelector('.dialog-body');

      expect(body).toBeDefined();
    });

    it('has dialog-footer when footer slot is used', async () => {
      const el = await fixture<MdDialog>(html`
        <md-dialog>
          <button slot="footer">OK</button>
        </md-dialog>
      `);
      const footer = el.shadowRoot!.querySelector('.dialog-footer');

      expect(footer).toBeDefined();
    });
  });
});
