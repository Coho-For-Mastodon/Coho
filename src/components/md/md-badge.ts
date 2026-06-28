import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Badge Component
 * A badge displays a descriptor for a UI element (e.g., count, status)
 */
@customElement('md-badge')
export class MdBadge extends LitElement {
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Boolean }) clickable = false;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        border-radius: var(--md-sys-shape-corner-small);
        font-size: var(--md-sys-typescale-label-large-font-size);
        font-weight: 500;
        line-height: 20px;
        letter-spacing: 0;
        transition: all 0.2s ease;
        user-select: none;
        height: 1em;
        min-width: 98px;
      }

      .badge.filled {
        background-color: var(
          --md-sys-color-primary,
          var(--sl-color-primary-600, #6750a4)
        );
        color: var(--md-sys-color-on-primary, #ffffff);
      }

      .badge.outlined {
        background-color: transparent;
        color: var(
          --md-sys-color-primary,
          var(--sl-color-primary-600, #6750a4)
        );
        border: 1px solid
          var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      }

      .badge.clickable {
        cursor: pointer;
      }

      .badge.clickable:hover {
        /* No shadow on hover */
      }

      .badge.clickable.filled:hover {
        filter: brightness(0.92);
      }

      .badge.clickable.outlined:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }

      .badge.clickable:focus-visible {
        outline: 2px outline var(--md-sys-color-primary, #6750a4);
        outline-offset: 2px;
      }

      .badge.clickable:active {
        transform: scale(0.98);
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .badge.filled {
          background-color: var(
            --md-sys-color-primary,
            var(--sl-color-primary-600, #d0bcff)
          );
          color: var(--md-sys-color-on-primary, #381e72);
        }

        .badge.outlined {
          color: var(
            --md-sys-color-primary,
            var(--sl-color-primary-600, #d0bcff)
          );
          border-color: var(
            --md-sys-color-primary,
            var(--sl-color-primary-600, #d0bcff)
          );
          border: 1px solid;
        }

        .badge.clickable.filled:hover {
          filter: brightness(1.1);
        }

        .badge.clickable.outlined:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }
      }
    `,
  ];

  render() {
    return html`
      <div
        class="badge ${this.variant} ${this.clickable ? 'clickable' : ''}"
        part="badge"
        tabindex="${this.clickable ? '0' : '-1'}"
        role="${this.clickable ? 'button' : 'status'}"
        @click="${this._handleClick}"
        @keydown="${this._handleKeyDown}"
      >
        <slot></slot>
      </div>
    `;
  }

  private _handleClick(e: Event) {
    if (this.clickable) {
      this.dispatchEvent(
        new CustomEvent('badge-click', {
          bubbles: true,
          composed: true,
          detail: { originalEvent: e },
        })
      );
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (!this.clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick(e);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-badge': MdBadge;
  }
}
