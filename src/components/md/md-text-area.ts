import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Text Area Component
 * A multi-line text input field with MD3 styling.
 * Replaces fluent-text-area with MD3 styling.
 */
@customElement('md-text-area')
export class MdTextArea extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) autofocus = false;
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Number }) rows = 4;
  @property({ type: Number }) maxlength?: number;

  @query('textarea') private _textarea!: HTMLTextAreaElement;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .text-area-container {
        position: relative;
        width: 100%;
      }

      textarea {
        width: 100%;
        min-height: var(--md-text-area-min-height, 80px);
        padding: var(--md-text-area-padding, 12px 16px);
        border: none;
        border-radius: var(--md-text-area-radius, 4px)
          var(--md-text-area-radius, 4px) 0 0;
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
        font-size: var(--md-sys-typescale-body-large-font-size);
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.5px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        border-bottom: 1px solid var(--md-sys-color-on-surface-variant, #49454f);
        transition:
          background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
          border-bottom-color 0.2s cubic-bezier(0.2, 0, 0, 1),
          border-bottom-width 0.2s cubic-bezier(0.2, 0, 0, 1);
        resize: var(--md-text-area-resize, vertical);
        box-sizing: border-box;
      }

      textarea::placeholder {
        color: var(--md-sys-color-on-surface-variant, #49454f);
        opacity: 1;
      }

      textarea:hover:not(:disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          var(--md-sys-color-surface-container-highest, #e6e0e9)
        );
      }

      textarea:focus {
        outline: none;
        border-bottom-color: var(--md-sys-color-primary, #6750a4);
        border-bottom-width: 2px;
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 12%,
          var(--md-sys-color-surface-container-highest, #e6e0e9)
        );
      }

      textarea:disabled {
        opacity: 0.38;
        cursor: not-allowed;
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
        resize: none;
      }

      /* Outlined variant */
      textarea.outlined {
        background-color: transparent;
        border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: var(--md-text-area-radius, 4px);
      }

      textarea.outlined:hover:not(:disabled) {
        border-color: var(--md-sys-color-on-surface, #1d1b20);
        background-color: transparent;
      }

      textarea.outlined:focus {
        border-color: var(--md-sys-color-primary, #6750a4);
        border-width: 2px;
        background-color: transparent;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        textarea {
          background-color: var(
            --md-sys-color-surface-container-highest,
            #49454f
          );
          color: var(--md-sys-color-on-surface, #e6e0e9);
          border-bottom-color: var(--md-sys-color-outline, #938f99);
        }

        textarea::placeholder {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        textarea:hover:not(:disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e0e9) 8%,
            var(--md-sys-color-surface-container-highest, #49454f)
          );
        }

        textarea:focus {
          border-bottom-color: var(--md-sys-color-primary, #d0bcff);
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e0e9) 12%,
            var(--md-sys-color-surface-container-highest, #49454f)
          );
        }

        textarea:disabled {
          background-color: var(
            --md-sys-color-surface-container-highest,
            #49454f
          );
        }

        textarea.outlined {
          background-color: transparent;
          border-color: var(--md-sys-color-outline, #938f99);
        }

        textarea.outlined:hover:not(:disabled) {
          border-color: var(--md-sys-color-on-surface, #e6e0e9);
        }

        textarea.outlined:focus {
          border-color: var(--md-sys-color-primary, #d0bcff);
        }
      }

      .char-counter {
        display: flex;
        justify-content: flex-end;
        padding: 4px 16px 0;
        font-size: var(--md-sys-typescale-body-small-font-size);
        font-weight: 400;
        color: var(--md-sys-color-on-surface-variant, #49454f);
      }

      @media (prefers-color-scheme: dark) {
        .char-counter {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
  }

  firstUpdated() {
    if (this.autofocus && this._textarea) {
      this._textarea.focus();
    }
  }

  private _handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChange(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  focus() {
    this._textarea.focus();
  }

  render() {
    return html`
      <div class="text-area-container" part="container">
        <textarea
          part="textarea"
          .value="${this.value}"
          placeholder="${this.placeholder}"
          ?disabled="${this.disabled}"
          rows="${this.rows}"
          maxlength="${this.maxlength || ''}"
          class="${this.variant}"
          @input="${this._handleInput}"
          @change="${this._handleChange}"
        ></textarea>
        ${this.maxlength
          ? html`
              <div class="char-counter">
                ${this.value.length} / ${this.maxlength}
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-text-area': MdTextArea;
  }
}
