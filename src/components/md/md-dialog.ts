import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Dialog Component
 * A dialog using native HTML <dialog> element with Material Design 3 styling
 */
@customElement('md-dialog')
export class MdDialog extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) fullscreen = false;
  @property({ type: Boolean, attribute: 'no-backdrop-close' }) noBackdropClose =
    false;

  @query('dialog') dialog!: HTMLDialogElement;

  private openOrigin: { x: number; y: number } | null = null;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: contents;
      }

      dialog {
        border: none;
        border-radius: var(--md-sys-shape-corner-extra-large);
        padding: 0;
        max-width: min(560px, calc(100vw - 48px));
        max-height: calc(100vh - 48px);
        background-color: var(--md-sys-color-surface-container-high, #ece6f0);
        color: var(--md-sys-color-on-surface, #1d1b20);
        box-shadow:
          0 8px 10px 1px rgba(0, 0, 0, 0.14),
          0 3px 14px 2px rgba(0, 0, 0, 0.12),
          0 5px 5px -3px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        transform-origin: var(--md-dialog-origin-x, 50%)
          var(--md-dialog-origin-y, 50%);
      }

      dialog[open] {
        display: flex;
        flex-direction: column;
      }

      dialog.fullscreen {
        max-width: 100vw;
        max-height: 100vh;
        width: 100vw;
        height: 100vh;
        border-radius: var(--md-sys-shape-corner-none);
      }

      dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.32);
        backdrop-filter: blur(4px);
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 24px 16px 24px;
        gap: 16px;
        flex-shrink: 0;
      }

      .dialog-title {
        font-size: var(--md-sys-typescale-headline-small-font-size);
        font-weight: 400;
        line-height: 32px;
        margin: 0;
        flex: 1;
      }

      .dialog-body {
        padding: 0 24px 24px 24px;
        overflow-y: auto;
        flex: 1 1 auto;
        min-height: 0;
      }

      .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 24px 24px 24px;
        flex-shrink: 0;
      }

      ::slotted([slot='header-actions']) {
        display: flex;
        gap: 8px;
      }

      .close-btn {
        appearance: none;
        border: 0;
        background: transparent;
        color: inherit;
        width: 40px;
        height: 40px;
        border-radius: var(--md-sys-shape-corner-extra-large);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .close-btn:hover {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          transparent
        );
      }

      .close-btn:focus-visible {
        outline: 2px solid
          var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
        outline-offset: 2px;
      }

      .close-icon {
        width: 24px;
        height: 24px;
        display: block;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        dialog {
          background-color: var(--md-sys-color-surface-container-high, #2b2930);
          color: var(--md-sys-color-on-surface, #e6e1e5);
        }

        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }

        .dialog-body::-webkit-scrollbar-thumb {
          background-color: var(--md-sys-color-outline, #938f99);
        }
      }

      /* Mobile adjustments */
      @media (max-width: 820px) {
        dialog:not(.fullscreen) {
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 32px);
          border-radius: var(--md-sys-shape-corner-extra-large);
        }

        .dialog-header {
          padding: 16px 16px 12px 16px;
        }

        .dialog-title {
          font-size: var(--md-sys-typescale-title-large-font-size);
          line-height: 28px;
        }
        .dialog-body {
          padding: 0 16px 16px 16px;
        }

        .dialog-footer {
          padding: 12px 16px 16px 16px;
        }
      }

      /* Animation */
      dialog[open] {
        animation: dialog-show 0.3s cubic-bezier(0.2, 0, 0, 1);
      }

      dialog.closing {
        animation: dialog-hide 0.2s cubic-bezier(0.2, 0, 0, 1) forwards;
      }

      dialog[open]::backdrop {
        animation: backdrop-show 0.3s cubic-bezier(0.2, 0, 0, 1);
      }

      dialog.closing::backdrop {
        animation: backdrop-hide 0.2s cubic-bezier(0.2, 0, 0, 1) forwards;
      }

      @keyframes dialog-show {
        from {
          opacity: 0;
          transform: scale(var(--md-dialog-enter-scale, 0.95));
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes dialog-hide {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(var(--md-dialog-exit-scale, 0.95));
        }
      }

      @keyframes backdrop-show {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes backdrop-hide {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `,
  ];

  private _titleId = `md-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

  render() {
    return html`
      <dialog
        part="dialog"
        class="${this.fullscreen ? 'fullscreen' : ''}"
        aria-labelledby="${this._titleId}"
        @close="${this._handleClose}"
        @cancel="${this._handleCancel}"
        @click="${this._handleBackdropClick}"
      >
        <div class="dialog-header">
          <h2 class="dialog-title" id="${this._titleId}">${this.label}</h2>
          <slot name="header-actions"></slot>
          <button
            class="close-btn"
            aria-label="Close dialog"
            @click="${this.hide}"
          >
            <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"
              />
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <slot></slot>
        </div>

        ${
          this._hasFooterSlot()
            ? html`
                <div class="dialog-footer">
                  <slot name="footer"></slot>
                </div>
              `
            : ''
        }
      </dialog>
    `;
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  show() {
    if (this.dialog) {
      if (this.dialog.classList.contains('closing')) {
        this.dialog.classList.remove('closing');
        return;
      }

      if (!this.dialog.open) {
        this.dialog.showModal();
        this.open = true;

        if (this.openOrigin) {
          const rect = this.dialog.getBoundingClientRect();
          const originX = this.openOrigin.x - rect.left;
          const originY = this.openOrigin.y - rect.top;
          this.dialog.style.setProperty('--md-dialog-origin-x', `${originX}px`);
          this.dialog.style.setProperty('--md-dialog-origin-y', `${originY}px`);
          this.dialog.style.setProperty('--md-dialog-enter-scale', '0.86');
          this.dialog.style.setProperty('--md-dialog-exit-scale', '0.92');
        } else {
          this.dialog.style.removeProperty('--md-dialog-origin-x');
          this.dialog.style.removeProperty('--md-dialog-origin-y');
          this.dialog.style.removeProperty('--md-dialog-enter-scale');
          this.dialog.style.removeProperty('--md-dialog-exit-scale');
        }

        this.openOrigin = null;
        this.dispatchEvent(
          new CustomEvent('md-dialog-show', {
            bubbles: true,
            composed: true,
          })
        );
      }
    }
  }

  async hide() {
    if (this.dialog && this.dialog.open) {
      if (this.dialog.classList.contains('closing')) {
        return;
      }

      this.dialog.classList.add('closing');

      await new Promise<void>((resolve) => {
        const handler = () => {
          this.dialog.removeEventListener('animationend', handler);
          resolve();
        };
        this.dialog.addEventListener('animationend', handler);
      });

      if (this.dialog.classList.contains('closing')) {
        this.dialog.classList.remove('closing');
        this.dialog.close();
      }
    }
  }

  public setOpenOrigin(origin?: { x: number; y: number } | null) {
    this.openOrigin = origin ?? null;
  }

  private _handleCancel(e: Event) {
    e.preventDefault();
    this.hide();
  }

  private _handleBackdropClick(e: MouseEvent) {
    // Close when clicking on the backdrop area of the native dialog
    // unless noBackdropClose is enabled
    if (e.target === this.dialog && !this.noBackdropClose) {
      this.hide();
    }
  }

  private _handleClose() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('md-dialog-hide', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _hasFooterSlot(): boolean {
    return this.querySelector('[slot="footer"]') !== null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-dialog': MdDialog;
  }
}
