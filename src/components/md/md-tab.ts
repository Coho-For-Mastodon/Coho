import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';

/**
 * MD3 Tab Button
 *
 * Individual tab button within md-tabs container.
 * Follows Material Design 3 primary tabs specification with stacked icon/label layout.
 *
 * @fires tab-selected - Emitted when tab is clicked { detail: { panel: string } }
 *
 * @slot default - Tab label content
 * @slot icon - Optional icon above label (stacked in horizontal mode)
 *
 * @example
 * ```html
 * <md-tab slot="nav" panel="accounts">
 *   <md-icon slot="icon" name="person"></md-icon>
 *   Accounts
 * </md-tab>
 * ```
 */
@customElement('md-tab')
export class MdTab extends LitElement {
  /**
   * Panel ID this tab controls
   */
  @property({ type: String }) panel = '';

  /**
   * Whether tab is currently active
   */
  @property({ type: Boolean, reflect: true }) active = false;

  /**
   * Whether tab is disabled
   */
  @property({ type: Boolean, reflect: true }) disabled = false;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: inline-flex;
        position: relative;
        outline: none;
        flex: 1;
        min-width: 0;
      }

      .tab-inner {
        all: unset;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px 16px;
        min-height: 64px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        flex: 1;
        box-sizing: border-box;

        /* Typography - Label Medium for tabs */
        font-size: 12px;
        font-weight: 500;
        line-height: 16px;
        letter-spacing: 0.5px;

        color: var(
          --md-sys-color-on-surface-variant,
          var(--sl-color-neutral-600)
        );
        background: transparent;
        transition: color 0.2s cubic-bezier(0.2, 0, 0, 1);
        white-space: nowrap;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      /* Stacked layout (vertical, bottom placement, or mobile) */
      :host([data-stacked]) .tab-inner {
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 4px;
        padding: 12px 2px 12px;
        min-height: 56px;
        width: 100%;
        font-size: 11px;
        line-height: 16px;
        letter-spacing: 0.1px;
        border-radius: var(--md-sys-shape-corner-none);
        background: transparent;
      }

      :host([data-orientation='vertical']) {
        flex: none;
        width: 80px;
      }

      /* Icon container with pill background for stacked layout */
      :host([data-stacked]) .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 32px;
        border-radius: var(--md-sys-shape-corner-large);
        transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      @media (hover: hover) {
        :host([data-stacked]:hover) .icon-container {
          background: color-mix(
            in srgb,
            var(--md-sys-color-on-surface-variant, var(--sl-color-neutral-600))
              8%,
            transparent
          );
        }
      }

      :host([active][data-stacked]) .icon-container {
        background: var(
          --md-sys-color-secondary-container,
          color-mix(
            in srgb,
            var(--md-sys-color-primary, var(--sl-color-primary-600)) 15%,
            transparent
          )
        );
      }

      /* Icon container - default (horizontal top) */
      .icon-container {
        display: contents;
      }

      /* Icon slot */
      ::slotted([slot='icon']) {
        width: 24px;
        height: 24px;
        font-size: 24px;
        flex-shrink: 0;
      }

      /* Active state */
      :host([active]) .tab-inner {
        color: var(--md-sys-color-primary, var(--sl-color-primary-600));
      }

      :host([active][data-stacked]) .tab-inner {
        color: var(--md-sys-color-on-surface);
        font-weight: 600;
      }

      /* Active icon fill */
      :host([active]) ::slotted([slot='icon']) {
        color: var(--md-sys-color-primary, var(--sl-color-primary-600));
      }

      :host([active][data-stacked]) ::slotted([slot='icon']) {
        color: var(
          --md-sys-color-on-secondary-container,
          var(--md-sys-color-primary)
        );
      }

      /* Disabled state */
      :host([disabled]) .tab-inner {
        color: var(--md-sys-color-on-surface, var(--sl-color-neutral-400));
        opacity: 0.38;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Hover overlay */
      .tab-inner::before {
        content: '';
        position: absolute;
        inset: 0;
        background: currentColor;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
        pointer-events: none;
        border-radius: inherit;
      }

      /* Only show hover overlay for non-stacked tabs */
      @media (hover: hover) {
        :host(:not([data-stacked])) .tab-inner:hover::before {
          opacity: 0.08;
        }
      }

      :host(:not([data-stacked])) .tab-inner:active::before {
        opacity: 0.12;
      }

      /* Hide overlay for stacked tabs - hover is on icon-container instead */
      :host([data-stacked]) .tab-inner::before {
        display: none;
      }

      /* Focus visible ring */
      :host(:focus-visible) .tab-inner {
        outline: 2px solid
          var(--md-sys-color-primary, var(--sl-color-primary-600));
        outline-offset: -6px;
        border-radius: var(--md-sys-shape-corner-small);
      }

      /* Active indicator - only shown for non-stacked horizontal tabs */
      .indicator {
        display: none;
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%) scaleX(0);
        width: calc(100% - 32px);
        min-width: 24px;
        max-width: 48px;
        height: 3px;
        border-radius: var(--md-sys-shape-corner-extra-small)
          var(--md-sys-shape-corner-extra-small) 0 0;
        background: var(--md-sys-color-primary, var(--sl-color-primary-600));
        transition:
          transform 0.2s cubic-bezier(0.2, 0, 0, 1),
          opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
        opacity: 0;
      }

      :host(:not([data-stacked])) .indicator {
        display: block;
      }

      /* Stacked active state - handled by icon-container pill */
      :host([active][data-stacked]) .tab-inner {
        background: transparent;
      }

      :host([active]) .indicator {
        opacity: 1;
        transform: translateX(-50%) scaleX(1);
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .tab-inner {
          color: var(
            --md-sys-color-on-surface-variant,
            var(--sl-color-neutral-400)
          );
        }

        :host([active]) .tab-inner {
          color: var(--md-sys-color-primary, var(--sl-color-primary-600));
        }

        :host([disabled]) .tab-inner {
          color: var(--md-sys-color-on-surface, var(--sl-color-neutral-600));
        }
      }

      /* CSS-only ripple — expands from center on click */
      .tab-inner::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(
          circle,
          currentColor 10%,
          transparent 10.01%
        );
        background-repeat: no-repeat;
        background-position: 50%;
        transform: scale(10, 10);
        opacity: 0;
        transition:
          transform 0.5s,
          opacity 0.8s;
        pointer-events: none;
      }

      .tab-inner:active::after {
        transform: scale(0, 0);
        opacity: 0.25;
        transition: 0s;
      }

      /* Stacked variant uses the icon-container pill for press feedback */
      :host([data-stacked]) .tab-inner::after {
        display: none;
      }
    `,
  ];

  private _handleClick() {
    if (this.disabled) return;
    import('../../utils/haptics')
      .then((m) => m.hapticSelection())
      .catch(() => {});
    this.dispatchEvent(
      new CustomEvent('tab-selected', {
        detail: { panel: this.panel },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tab');
    this.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('active')) {
      this.setAttribute('aria-selected', this.active ? 'true' : 'false');
    }
    if (changedProperties.has('disabled')) {
      this.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    }
  }

  render() {
    return html`
      <button class="tab-inner" tabindex="-1" @click="${this._handleClick}">
        <span class="icon-container">
          <slot name="icon"></slot>
        </span>
        <slot></slot>
        <span class="indicator"></span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-tab': MdTab;
  }
}
