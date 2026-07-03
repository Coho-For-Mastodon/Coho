import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * Material Design 3 Menu Component
 * A menu displays a list of choices on a temporary surface
 */
@customElement('md-menu')
export class MdMenu extends LitElement {
  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
      }

      .menu {
        display: flex;
        flex-direction: column;
        min-width: 112px;
        max-width: 280px;
        padding: 8px 0;
        background-color: var(--md-sys-color-surface-container, #f3edf7);
        color: var(--md-sys-color-on-surface, #1d1b20);
        border-radius: var(--md-sys-shape-corner-large);
        box-shadow: var(
          --md-sys-elevation-level2,
          0 4px 12px rgba(0, 0, 0, 0.1)
        );
        overflow: hidden;
      }

      ::slotted(md-menu-divider) {
        margin: 8px 0;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .menu {
          background-color: var(
            --md-sys-color-surface-container-highest,
            #222222
          );
          color: var(--md-sys-color-on-surface, #f0f0f0);
          box-shadow: var(
            --md-sys-elevation-level2,
            0 4px 12px rgba(0, 0, 0, 0.3)
          );
        }
      }

      /* Light mode override */
      @media (prefers-color-scheme: light) {
        .menu {
          background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
          color: var(--md-sys-color-on-surface-light, #1d1b20);
        }
      }
    `,
  ];

  render() {
    return html`
      <div class="menu" role="menu">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-menu': MdMenu;
  }
}
