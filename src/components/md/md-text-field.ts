import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Text Field Component
 * A single-line text input field with MD3 styling.
 * Replaces fluent-text-field with MD3 styling.
 */
@customElement('md-text-field')
export class MdTextField extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) autofocus = false;
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Boolean }) pill = false;
  @property({ type: String }) type:
    | 'text'
    | 'email'
    | 'password'
    | 'search'
    | 'tel'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime-local' = 'text';
  @property({ type: String }) min = '';
  @property({ type: String }) max = '';
  @property({ type: String }) step = '';

  @query('input') private _input!: HTMLInputElement;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .text-field-container {
        position: relative;
        width: 100%;
      }

      input {
        width: 100%;
        min-height: 40px;
        padding: 12px 16px;
        border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: var(--md-sys-shape-corner-medium);
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
        font-size: var(--md-sys-typescale-body-large-font-size);
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0;
        color: var(--md-sys-color-on-surface, #1d1b20);
        transition: border-color 0.2s ease;
        box-sizing: border-box;
      }

      input::placeholder {
        color: var(--md-sys-color-on-surface-variant, #49454f);
        opacity: 1;
      }

      input:hover:not(:disabled) {
        border-color: var(--md-sys-color-on-surface, #1d1b20);
      }

      input:focus {
        outline: none;
        border-color: var(--md-sys-color-primary, #6750a4);
      }

      input:focus-visible {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: -2px;
      }

      input:disabled {
        opacity: 0.38;
        cursor: not-allowed;
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
      }

      /* Outlined variant */
      input.outlined {
        background-color: transparent;
        border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: var(--md-sys-shape-corner-medium);
      }

      input.outlined:hover:not(:disabled) {
        border-color: var(--md-sys-color-on-surface, #1d1b20);
        background-color: transparent;
      }

      input.pill {
        border-radius: var(--md-sys-shape-corner-full);
      }

      input.outlined:focus {
        border-color: var(--md-sys-color-primary, #6750a4);
        background-color: transparent;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        input {
          background-color: #333333;
          color: var(--md-sys-color-on-surface, #e6e0e9);
          border-color: var(--md-sys-color-outline, #938f99);
        }

        input::placeholder {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        input:hover:not(:disabled) {
          border-color: #cccccc;
        }

        input:focus {
          border-color: var(--md-sys-color-primary, #d0bcff);
        }

        input:focus-visible {
          outline: 2px solid var(--md-sys-color-primary, #6750a4);
          outline-offset: -2px;
        }

        input:disabled {
          background-color: #333333;
        }

        input.outlined {
          background-color: transparent;
          border-color: var(--md-sys-color-outline, #938f99);
        }

        input.outlined:hover:not(:disabled) {
          border-color: var(--md-sys-color-on-surface, #e6e0e9);
        }

        input.outlined:focus {
          border-color: var(--md-sys-color-primary, #d0bcff);
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
  }

  firstUpdated() {
    if (this.autofocus && this._input) {
      this._input.focus();
    }
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="text-field-container">
        <input
          type="${this.type}"
          .value="${this.value}"
          placeholder="${this.placeholder}"
          min="${this.min}"
          max="${this.max}"
          part="base"
          step="${this.step}"
          ?disabled="${this.disabled}"
          class="${this.variant} ${this.pill ? 'pill' : ''}"
          @input="${this._handleInput}"
          @change="${this._handleChange}"
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-text-field': MdTextField;
  }
}
