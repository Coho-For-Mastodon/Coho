import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * Material Design 3 Toast (Snackbar) Component
 *
 * A brief message that appears at the bottom of the screen to provide feedback.
 * Follows MD3 design guidelines for snackbars.
 *
 * @example
 * ```html
 * <md-toast
 *   message="Item deleted"
 *   action-label="Undo"
 *   @action-click=${handleUndo}>
 * </md-toast>
 * ```
 *
 * @fires show - Dispatched when toast is shown
 * @fires hide - Dispatched when toast is hidden
 * @fires action-click - Dispatched when action button is clicked
 */
@customElement('md-toast')
export class MdToast extends LitElement {
  /** The message to display in the toast */
  @property({ type: String }) message = '';

  /** Optional action button label */
  @property({ type: String, attribute: 'action-label' }) actionLabel = '';

  /** Duration in milliseconds (0 = persistent until dismissed) */
  @property({ type: Number }) duration = 4000;

  /** Visual variant of the toast */
  @property({ type: String }) variant: ToastVariant = 'info';

  /** Whether to show a close button */
  @property({ type: Boolean }) closable = false;

  /** Controls visibility */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Position on screen */
  @property({ type: String }) position: 'bottom' | 'top' = 'bottom';

  private hideTimer?: number;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        pointer-events: none;
        visibility: hidden;
      }

      :host([position='bottom']) {
        bottom: 16px;
      }

      :host([position='top']) {
        top: 16px;
      }

      :host([open]) {
        pointer-events: auto;
        visibility: visible;
      }

      .toast-container {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 280px;
        max-width: min(560px, calc(100vw - 32px));
        padding: 14px 16px;
        border-radius: 4px;
        background: #313033;
        color: #f5eff7;
        box-shadow:
          0px 1px 2px rgba(0, 0, 0, 0.3),
          0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        font-size: var(--md-sys-typescale-body-medium-font-size);
        line-height: 20px;
        font-weight: 400;
        opacity: 0;
        transform: translateY(100px);
        transition:
          opacity 0.2s cubic-bezier(0, 0, 0.2, 1),
          transform 0.2s cubic-bezier(0, 0, 0.2, 1);
      }

      :host([open]) .toast-container {
        opacity: 1;
        transform: translateY(0);
      }

      :host([position='top']) .toast-container {
        transform: translateY(-100px);
      }

      :host([position='top'][open]) .toast-container {
        transform: translateY(0);
      }

      /* Variant backgrounds */
      :host([variant='success']) .toast-container {
        background: #2e7d32;
        color: #ffffff;
      }

      :host([variant='error']) .toast-container {
        background: var(--md-sys-color-error, #b3261e);
        color: var(--md-sys-color-on-error, #ffffff);
      }

      :host([variant='warning']) .toast-container {
        background: #f57c00;
        color: #ffffff;
      }

      /* Dark mode overrides */
      @media (prefers-color-scheme: dark) {
        .toast-container {
          background: #383838;
          color: white;
        }

        :host([variant='success']) .toast-container {
          background: #4caf50;
          color: #ffffff;
        }

        :host([variant='error']) .toast-container {
          background: #f2b8b5;
          color: #601410;
        }

        :host([variant='warning']) .toast-container {
          background: #ff9800;
          color: #ffffff;
        }

        button {
          color: #6750a4;
        }

        :host([variant='success']) button,
        :host([variant='error']) button,
        :host([variant='warning']) button {
          color: #ffffff;
        }
      }

      .message {
        flex: 1;
        margin: 0;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }

      button {
        background: none;
        border: none;
        color: #d0bcff;
        font-family: inherit;
        font-size: var(--md-sys-typescale-label-large-font-size);
        font-weight: 500;
        letter-spacing: 0.1px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        text-transform: uppercase;
        transition: background 0.2s cubic-bezier(0.2, 0, 0, 1);
        position: relative;
        overflow: hidden;
      }

      :host([variant='success']) button,
      :host([variant='error']) button,
      :host([variant='warning']) button {
        color: #ffffff;
      }

      button:hover {
        background: color-mix(in srgb, currentColor 8%, transparent);
      }

      button:active {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }

      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .close-button {
        padding: 4px;
        min-width: 24px;
        min-height: 24px;
      }

      /* Mobile responsive */
      @media (max-width: 820px) {
        :host {
          left: 8px;
          right: 8px;
          transform: none;
        }

        .toast-container {
          max-width: 100%;
        }
      }
    `,
  ];

  /**
   * Show the toast programmatically
   */
  show() {
    this.open = true;

    this.dispatchEvent(
      new CustomEvent('show', {
        bubbles: true,
        composed: true,
      })
    );

    // Clear any existing timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    // Auto-hide after duration
    if (this.duration > 0) {
      this.hideTimer = window.setTimeout(() => {
        this.hide();
      }, this.duration);
    }
  }

  /**
   * Hide the toast programmatically
   */
  hide() {
    this.open = false;

    this.dispatchEvent(
      new CustomEvent('hide', {
        bubbles: true,
        composed: true,
      })
    );

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }

  /**
   * Convenience method to show toast with a message
   */
  toast(message?: string) {
    if (message) {
      this.message = message;
    }
    this.show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }

  private handleActionClick() {
    this.dispatchEvent(
      new CustomEvent('action-click', {
        bubbles: true,
        composed: true,
      })
    );
    this.hide();
  }

  private handleCloseClick() {
    this.hide();
  }

  render() {
    return html`
      <div class="toast-container" role="status" aria-live="polite">
        <div class="message">${this.message}</div>
        ${this.actionLabel || this.closable
          ? html`
              <div class="actions">
                ${this.actionLabel
                  ? html`
                      <button
                        class="action-button"
                        @click=${this.handleActionClick}
                        aria-label=${this.actionLabel}
                      >
                        ${this.actionLabel}
                      </button>
                    `
                  : ''}
                ${this.closable
                  ? html`
                      <button
                        class="close-button"
                        @click=${this.handleCloseClick}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    `
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-toast': MdToast;
  }
}
