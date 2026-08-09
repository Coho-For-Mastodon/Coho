import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Menu Item Component
 * A menu item represents an option within a menu
 */
@customElement('md-menu-item')
export class MdMenuItem extends LitElement {
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: String, reflect: true }) override title: string = '';

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        margin: 0 4px;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 48px;
        padding: 0 12px;
        cursor: pointer;
        user-select: none;
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        letter-spacing: 0.25px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
        position: relative;
        overflow: hidden;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      /* Selected state */
      :host([selected]) .menu-item {
        background-color: var(--md-sys-color-secondary-container, #f7d8e8);
        color: var(--md-sys-color-on-secondary-container, #31111d);
      }

      .menu-item:focus-visible {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: -2px;
      }

      :host([selected]) .check-icon {
        display: flex;
      }

      .menu-item:hover:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          transparent
        );
      }

      :host([selected]) .menu-item:hover:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-secondary-container, #f7d8e8) 100%,
          var(--md-sys-color-on-secondary-container, #31111d) 8%
        );
      }

      .menu-item:active:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 12%,
          transparent
        );
      }

      :host([selected]) .menu-item:active:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-secondary-container, #f7d8e8) 100%,
          var(--md-sys-color-on-secondary-container, #31111d) 12%
        );
      }

      .menu-item.disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .check-icon {
        display: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--md-sys-color-on-secondary-container, #31111d);
      }

      .prefix {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .content {
        flex: 1;
        display: flex;
        align-items: center;
      }

      .suffix {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        font-size: 12px;
        letter-spacing: 0.5px;
      }

      ::slotted([slot='prefix']) {
        width: 24px;
        height: 24px;
      }

      ::slotted([slot='suffix']) {
        font-size: 12px;
      }

      /* Ripple effect */
      .menu-item::before {
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

      .menu-item:active:not(.disabled)::before {
        width: 100%;
        height: 100%;
        opacity: 0.1;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .menu-item {
          color: var(--md-sys-color-on-surface, #e6e1e5);
        }

        :host([selected]) .menu-item {
          background-color: var(--md-sys-color-secondary-container, #4a3045);
          color: var(--md-sys-color-on-secondary-container, #ffd8e8);
        }

        .check-icon {
          color: var(--md-sys-color-on-secondary-container, #ffd8e8);
        }

        .suffix {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        .menu-item:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e1e5) 8%,
            transparent
          );
        }

        :host([selected]) .menu-item:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-secondary-container, #4a3045) 100%,
            var(--md-sys-color-on-secondary-container, #ffd8e8) 8%
          );
        }

        .menu-item:active:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e1e5) 12%,
            transparent
          );
        }

        :host([selected]) .menu-item:active:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-secondary-container, #4a3045) 100%,
            var(--md-sys-color-on-secondary-container, #ffd8e8) 12%
          );
        }
      }

      /* Light mode override */
      @media (prefers-color-scheme: light) {
        .menu-item {
          color: var(--md-sys-color-on-surface-light, #1d1b20);
        }

        .menu-item:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface-light, #1d1b20) 8%,
            transparent
          );
        }

        .menu-item:active:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface-light, #1d1b20) 12%,
            transparent
          );
        }
      }

      /* On-device indicator - shown as badge on right side */
      /* Reserve space so label text doesn't overlap the badge */
      :host([title]) .menu-item {
        padding-right: 90px;
      }

      :host([title])::after {
        content: attr(title);
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        padding: 2px 6px;
        background: var(
          --md-sys-color-surface-container-highest,
          rgba(255, 255, 255, 0.12)
        );
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        border-radius: var(--md-sys-shape-corner-small);
        pointer-events: none;
      }

      :host([title=''])::after,
      :host(:not([title]))::after {
        display: none;
      }

      @media (prefers-color-scheme: light) {
        :host([title])::after {
          background: rgba(0, 0, 0, 0.08);
          color: var(--md-sys-color-on-surface-variant, #49454f);
        }
      }
    `,
  ];

  render() {
    return html`
      <div
        class="menu-item ${this.disabled ? 'disabled' : ''}"
        role="menuitem"
        aria-selected="${this.selected ? 'true' : 'false'}"
        tabindex="${this.disabled ? '-1' : '0'}"
        title=${ifDefined(this.title || undefined)}
        @click="${this._handleClick}"
        @keydown="${this._handleKeydown}"
      >
        ${
          this.selected
            ? html`<span class="check-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                    fill="currentColor"
                  />
                </svg>
              </span>`
            : html`<div class="prefix"><slot name="prefix"></slot></div>`
        }
        <div class="content">
          <slot></slot>
        </div>
        <div class="suffix">
          <slot name="suffix"></slot>
        </div>
      </div>
    `;
  }

  private _handleClick(e: Event) {
    if (!this.disabled) {
      this.dispatchEvent(
        new CustomEvent('menu-item-click', {
          bubbles: true,
          composed: true,
          detail: { originalEvent: e },
        })
      );
    }
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this._handleClick(e);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-menu-item': MdMenuItem;
  }
}
