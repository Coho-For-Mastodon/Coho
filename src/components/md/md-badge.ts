import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Badge Component
 * A badge displays a descriptor for a UI element (e.g., count, status)
 */
@customElement('md-badge')
export class MdBadge extends LitElement {
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Boolean }) clickable = false;

  static styles = css`
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
      border-radius: 8px;
      font-family:
        'Roboto',
        system-ui,
        -apple-system,
        sans-serif;
      font-size: var(--md-sys-typescale-label-large-font-size);
      font-weight: 500;
      line-height: 20px;
      letter-spacing: 0.1px;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
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
      color: var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      border: 1px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
    }

    .badge.clickable {
      cursor: pointer;
    }

    .badge.clickable:hover {
      box-shadow:
        0 1px 2px 0 rgba(0, 0, 0, 0.3),
        0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .badge.clickable.filled:hover {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4)) 92%,
        white
      );
    }

    .badge.clickable.outlined:hover {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4)) 8%,
        transparent
      );
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
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-primary, var(--sl-color-primary-600, #d0bcff)) 92%,
          black
        );
      }

      .badge.clickable.outlined:hover {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-primary, var(--sl-color-primary-600, #d0bcff)) 12%,
          transparent
        );
      }
    }
  `;

  render() {
    return html`
      <div
        class="badge ${this.variant} ${this.clickable ? 'clickable' : ''}"
        @click="${this._handleClick}"
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
}

declare global {
  interface HTMLElementTagNameMap {
    'md-badge': MdBadge;
  }
}
