import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Option Component
 * Represents a single option within an md-select dropdown.
 * Replaces fluent-option with MD3 styling.
 */
@customElement('md-option')
export class MdOption extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) selected = false;
  @property({ type: Boolean, reflect: true }) highlighted = false;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        padding: 0 16px;
        cursor: pointer;
        user-select: none;
        font-size: var(--md-sys-typescale-body-large-font-size);
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.5px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
        position: relative;
        overflow: hidden;
      }

      .option:hover:not(.disabled) {
        background-color: var(--md-sys-color-on-surface, #1d1b20);
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          transparent
        );
      }

      .option:active:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 12%,
          transparent
        );
      }

      .option.selected {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 12%,
          transparent
        );
        font-weight: 500;
      }

      .option.highlighted {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          transparent
        );
      }

      .option.disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .content {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .checkmark {
        width: 24px;
        height: 24px;
        fill: var(--md-sys-color-primary, #6750a4);
        opacity: 0;
        transition: opacity 0.15s cubic-bezier(0.2, 0, 0, 1);
      }

      .option.selected .checkmark {
        opacity: 1;
      }

      /* Ripple effect */
      .option::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: var(--md-sys-shape-corner-circle);
        background-color: currentColor;
        opacity: 0;
        transform: translate(-50%, -50%);
        transition:
          width 0.3s,
          height 0.3s,
          opacity 0.3s;
      }

      .option:active:not(.disabled)::before {
        width: 100%;
        height: 100%;
        opacity: 0.1;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .option {
          color: var(--md-sys-color-on-surface, #e6e1e5);
        }

        .option:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e1e5) 8%,
            transparent
          );
        }

        .option:active:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e1e5) 12%,
            transparent
          );
        }

        .option.selected {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-primary, #d0bcff) 12%,
            transparent
          );
        }

        .checkmark {
          fill: var(--md-sys-color-primary, #d0bcff);
        }
      }

      /* Light mode override */
      @media (prefers-color-scheme: light) {
        .option {
          color: var(--md-sys-color-on-surface-light, #1d1b20);
        }

        .option:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface-light, #1d1b20) 8%,
            transparent
          );
        }

        .option:active:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface-light, #1d1b20) 12%,
            transparent
          );
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'option');
    this.setAttribute('aria-selected', this.selected ? 'true' : 'false');
    this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('selected')) {
      this.setAttribute('aria-selected', this.selected ? 'true' : 'false');
    }
    if (changedProperties.has('disabled')) {
      this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    }
  }

  render() {
    return html`
      <div
        class="option ${this.selected ? 'selected' : ''} ${this.highlighted
          ? 'highlighted'
          : ''} ${this.disabled ? 'disabled' : ''}"
      >
        <div class="content">
          <slot></slot>
        </div>
        <svg
          class="checkmark"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
            fill="currentColor"
          />
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-option': MdOption;
  }
}
