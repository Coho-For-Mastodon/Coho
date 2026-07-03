import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Button Component
 * Supports filled, outlined, text, elevated, tonal, and fab variants
 */
@customElement('md-button')
export class MdButton extends LitElement {
  @property({ type: String }) variant:
    'filled' | 'outlined' | 'text' | 'tonal' | 'fab' = 'filled';
  @property({ type: String }) size: 'small' | 'medium' = 'medium';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) pill = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: String, reflect: true }) override title: string = '';

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: inline-block;
        background: transparent;
        position: relative;
      }

      button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        letter-spacing: 0;
        transition: all 200ms ease;
        overflow: hidden;
        white-space: nowrap;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      button:focus-visible {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: 2px;
      }

      button:active:not(:disabled) {
        opacity: 0.7;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.38;
        color: color-mix(in srgb, currentColor 38%, transparent);
      }

      /* Size variants */
      button.small {
        height: 32px;
        padding: 0 12px;
        font-size: var(--md-sys-typescale-label-medium-font-size);
        border-radius: var(--md-sys-shape-corner-large);
      }

      button.medium {
        height: 40px;
        padding: 0 24px;
        font-size: var(--md-sys-typescale-label-large-font-size);
        border-radius: var(--md-sys-shape-corner-extra-large);
      }

      /* Pill shape override */
      button.pill {
        border-radius: var(--md-sys-shape-corner-full);
      }

      button.filled {
        background: var(--md-sys-color-primary, #6750a4);
        color: var(--md-sys-color-on-primary, #ffffff);
      }

      button.filled:hover:not(:disabled) {
        filter: brightness(0.92);
      }

      button.filled:disabled,
      button.elevated:disabled,
      button.tonal:disabled,
      button.fab:disabled {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }

      button.outlined {
        background: transparent;
        color: var(--md-sys-color-primary, #6750a4);
        border: 1px solid var(--md-sys-color-outline, #79747e);
      }

      button.outlined:hover:not(:disabled),
      button.text:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.04);
      }

      @media (prefers-color-scheme: dark) {
        button.outlined:hover:not(:disabled),
        button.text:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }
      }

      button.outlined:disabled {
        border-color: color-mix(in srgb, currentColor 12%, transparent);
      }

      /* Text variant */
      button.text {
        background: transparent;
        color: var(--md-sys-color-primary, #6750a4);
      }

      button.tonal {
        background: var(--md-sys-color-secondary-container, #e8def8);
        color: var(--md-sys-color-on-secondary-container, #1d192b);
      }

      button.tonal:hover:not(:disabled) {
        filter: brightness(0.92);
      }

      button.fab {
        background: var(
          --md-sys-color-primary,
          var(--sl-color-primary-600, #6750a4)
        );
        color: var(--md-sys-color-on-primary, #ffffff);
        width: 56px;
        height: 56px;
        border-radius: var(--md-sys-shape-corner-large);
        padding: 0;
      }

      button.fab.small {
        width: 40px;
        height: 40px;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      button.fab:hover:not(:disabled) {
        filter: brightness(0.92);
      }

      /* Ripple removed */

      ::slotted(*) {
        pointer-events: none;
      }

      /* Custom tooltip styles */
      :host([title]:hover)::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 6px;
        padding: 4px 8px;
        background: var(--md-sys-color-inverse-surface, #313033);
        color: var(--md-sys-color-inverse-on-surface, #f4eff4);
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        border-radius: var(--md-sys-shape-corner-extra-small);
        z-index: 10000;
        pointer-events: none;
        animation: tooltipFadeIn 0.15s ease-out;
      }

      :host([title=''])::after,
      :host(:not([title]))::after {
        display: none;
      }

      @keyframes tooltipFadeIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `,
  ];

  private handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  render() {
    const classes = [this.variant, this.size, this.pill ? 'pill' : '']
      .filter(Boolean)
      .join(' ');

    return html`
      <button
        part="button"
        class="${classes}"
        ?disabled="${this.disabled}"
        type="${this.type}"
        title=${ifDefined(this.title || undefined)}
        @click="${this.handleClick}"
      >
        <slot name="prefix"></slot>
        <slot></slot>
        <slot name="suffix"></slot>
      </button>
    `;
  }
}
