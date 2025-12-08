import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

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

  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
      outline: none;
      flex: 1;
      min-width: 0;
    }

    button {
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
      flex: 1;
      box-sizing: border-box;

      /* Typography - Label Medium for tabs */
      font-family:
        Roboto,
        system-ui,
        -apple-system,
        sans-serif;
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

    /* Vertical orientation (side nav) - stacked icon/label layout like MD3 nav rail */
    :host([data-orientation='vertical']) button,
    :host([data-orientation='horizontal'][data-placement='bottom']) button {
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
      border-radius: 0;
      background: transparent;
    }

    :host([data-orientation='vertical']) {
      flex: none;
      width: 80px;
    }

    /* Icon container with pill background for vertical nav and mobile bottom nav */
    :host([data-orientation='vertical']) .icon-container,
    :host([data-orientation='horizontal'][data-placement='bottom'])
      .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 32px;
      border-radius: 16px;
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    :host([data-orientation='vertical']:hover) .icon-container,
    :host([data-orientation='horizontal'][data-placement='bottom']:hover)
      .icon-container {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface-variant, var(--sl-color-neutral-600)) 8%,
        transparent
      );
    }

    :host([active][data-orientation='vertical']) .icon-container,
    :host([active][data-orientation='horizontal'][data-placement='bottom'])
      .icon-container {
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
    :host([active]) button {
      color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    }

    /* Active icon fill */
    :host([active]) ::slotted([slot='icon']) {
      color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    }

    /* Disabled state */
    :host([disabled]) button {
      color: var(--md-sys-color-on-surface, var(--sl-color-neutral-400));
      opacity: 0.38;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Hover overlay */
    button::before {
      content: '';
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
      pointer-events: none;
      border-radius: inherit;
    }

    /* Only show button hover overlay for horizontal tabs */
    :host(:not([data-orientation='vertical'])) button:hover::before {
      opacity: 0.08;
    }

    :host(:not([data-orientation='vertical'])) button:active::before {
      opacity: 0.12;
    }

    /* Disable button overlay for vertical tabs - hover is on icon-container instead */
    :host([data-orientation='vertical']) button::before,
    :host([data-orientation='horizontal'][data-placement='bottom'])
      button::before {
      display: none;
    }

    /* Focus visible ring */
    :host(:focus-visible) button::after {
      content: '';
      position: absolute;
      inset: 4px;
      border: 2px solid var(--md-sys-color-primary, var(--sl-color-primary-600));
      border-radius: 8px;
      pointer-events: none;
    }

    /* Active indicator - MD3 pill shape */
    .indicator {
      position: absolute;
      background: var(--md-sys-color-primary, var(--sl-color-primary-600));
      transition:
        transform 0.2s cubic-bezier(0.2, 0, 0, 1),
        opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
      opacity: 0;
      transform: scaleX(0);
    }

    /* Horizontal indicator (bottom) - centered pill */
    :host([data-orientation='horizontal']) .indicator {
      bottom: 0;
      left: 50%;
      transform: translateX(-50%) scaleX(0);
      width: calc(100% - 32px);
      min-width: 24px;
      max-width: 48px;
      height: 3px;
      border-radius: 3px 3px 0 0;
    }

    /* Horizontal bottom placement indicator (top) - Hidden for mobile style pill */
    :host([data-orientation='horizontal'][data-placement='bottom']) .indicator {
      display: none;
    }

    /* Vertical indicator - hidden since we use background highlight instead */
    :host([data-orientation='vertical']) .indicator {
      display: none;
    }

    :host([data-orientation='vertical'][data-placement='end']) .indicator {
      display: none;
    }

    /* Vertical active state - handled by icon-container pill, no full button background */
    :host([active][data-orientation='vertical']) button,
    :host([active][data-orientation='horizontal'][data-placement='bottom'])
      button {
      background: transparent;
    }

    :host([active]) .indicator {
      opacity: 1;
      transform: translateX(-50%) scaleX(1);
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      button {
        color: var(
          --md-sys-color-on-surface-variant,
          var(--sl-color-neutral-400)
        );
      }

      :host([active]) button {
        color: var(--md-sys-color-primary, var(--sl-color-primary-600));
      }

      :host([disabled]) button {
        color: var(--md-sys-color-on-surface, var(--sl-color-neutral-600));
      }
    }

    /* Ripple effect on click */
    @keyframes ripple {
      from {
        transform: scale(0);
        opacity: 0.4;
      }
      to {
        transform: scale(1);
        opacity: 0;
      }
    }

    .ripple {
      position: absolute;
      border-radius: 50%;
      background: currentColor;
      pointer-events: none;
      animation: ripple 0.6s cubic-bezier(0.2, 0, 0, 1);
    }
  `;

  private _handleClick(e: MouseEvent) {
    if (this.disabled) return;

    // Create ripple effect
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // Emit tab selected event
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
      this._handleClick(e as unknown as MouseEvent);
    }
  }

  render() {
    return html`
      <button
        role="tab"
        aria-selected="${this.active}"
        aria-disabled="${this.disabled}"
        tabindex="${this.disabled ? '-1' : '0'}"
        @click="${this._handleClick}"
        @keydown="${this._handleKeyDown}"
      >
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
