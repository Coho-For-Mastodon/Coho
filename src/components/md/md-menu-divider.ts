import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Menu Divider Component
 * A divider separates groups of menu items, optionally with a label
 */
@customElement('md-menu-divider')
export class MdMenuDivider extends LitElement {
  @property({ type: String }) label = '';

  static styles = css`
    :host {
      display: block;
      padding: 0 4px;
    }

    .divider {
      height: 1px;
      background-color: var(--md-sys-color-outline-variant, #cac4cf);
      margin: 0 12px;
    }

    .label-container {
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 12px;
    }

    .label {
      font-family:
        'Roboto',
        system-ui,
        -apple-system,
        sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .divider {
        background-color: var(--md-sys-color-outline-variant, #49454f);
      }

      .label {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }
    }
  `;

  render() {
    if (this.label) {
      return html`
        <div class="label-container">
          <span class="label">${this.label}</span>
        </div>
      `;
    }
    return html`<div class="divider" role="separator"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-menu-divider': MdMenuDivider;
  }
}
