import { LitElement, html, css } from 'lit';
import type { MdMenuItem } from './md-menu-item.js';
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
        box-shadow:
          0 1px 3px 1px rgba(0, 0, 0, 0.15),
          0 1px 2px 0 rgba(0, 0, 0, 0.3);
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
            #49454f
          );
          color: var(--md-sys-color-on-surface, #e6e1e5);
          box-shadow:
            0 2px 6px 2px rgba(0, 0, 0, 0.25),
            0 1px 2px 0 rgba(0, 0, 0, 0.35);
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

  connectedCallback() {
    super.connectedCallback();
    this._initRovingTabindex();
  }

  private _getItems(): MdMenuItem[] {
    return Array.from(this.querySelectorAll<MdMenuItem>('md-menu-item'));
  }

  private _getEnabledItems(): MdMenuItem[] {
    return this._getItems().filter((item) => !item.disabled);
  }

  private _getFocusedItem(): MdMenuItem | undefined {
    return this._getItems().find(
      (item) => item.matches(':focus') || item.matches(':focus-within')
    );
  }

  private _focusItem(item: MdMenuItem) {
    this._getItems().forEach((i) => i.setAttribute('tabindex', '-1'));
    item.setAttribute('tabindex', '0');
    item.focus();
  }

  /** Focus the first enabled menu item. Called by md-dropdown on open. */
  focusFirst() {
    const first = this._getEnabledItems()[0];
    if (first) this._focusItem(first);
  }

  private _initRovingTabindex() {
    requestAnimationFrame(() => {
      this._getItems().forEach((item) => item.setAttribute('tabindex', '-1'));
    });
  }

  private _handleSlotChange() {
    this._getItems().forEach((item) => {
      if (!item.hasAttribute('tabindex')) {
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  private _handleMenuKeydown(e: KeyboardEvent) {
    const items = this._getEnabledItems();
    if (items.length === 0) return;

    const focused = this._getFocusedItem();
    const idx = focused ? items.indexOf(focused) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._focusItem(items[(idx + 1) % items.length]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._focusItem(items[(idx - 1 + items.length) % items.length]);
        break;
      case 'Home':
        e.preventDefault();
        this._focusItem(items[0]);
        break;
      case 'End':
        e.preventDefault();
        this._focusItem(items[items.length - 1]);
        break;
    }
  }

  render() {
    return html`
      <div class="menu" role="menu" @keydown="${this._handleMenuKeydown}">
        <slot @slotchange="${this._handleSlotChange}"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-menu': MdMenu;
  }
}
