import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Toolbar Component
 * A toolbar provides access to actions and navigation
 */
@customElement('md-toolbar')
export class MdToolbar extends LitElement {
  @property({ type: String }) position: 'top' | 'bottom' | 'static' = 'static';
  @property({ type: String }) align: 'start' | 'center' | 'end' = 'start';

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .toolbar {
      display: flex;
      align-items: center;
      min-height: 64px;
      padding: 8px 16px;
      gap: 8px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .toolbar.position-top {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
      box-shadow:
        0 2px 4px -1px rgba(0, 0, 0, 0.2),
        0 4px 5px 0 rgba(0, 0, 0, 0.14),
        0 1px 10px 0 rgba(0, 0, 0, 0.12);
    }

    .toolbar.position-bottom {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 10;
      box-shadow:
        0 -2px 4px -1px rgba(0, 0, 0, 0.2),
        0 -4px 5px 0 rgba(0, 0, 0, 0.14),
        0 -1px 10px 0 rgba(0, 0, 0, 0.12);
    }

    .toolbar.align-start {
      justify-content: flex-start;
    }

    .toolbar.align-center {
      justify-content: center;
    }

    .toolbar.align-end {
      justify-content: flex-end;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .toolbar {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }
    }

    /* Mobile adjustments */
        @media (max-width: 820px) {
      .toolbar {
        padding: 8px 12px;
  `;

  render() {
    return html`
      <div class="toolbar position-${this.position} align-${this.align}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-toolbar': MdToolbar;
  }
}
