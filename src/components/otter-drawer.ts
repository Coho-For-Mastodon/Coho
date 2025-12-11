import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Custom drawer component to replace sl-drawer
 * Supports:
 * - placement: 'end' (right), 'start' (left), 'bottom', 'top'
 * - label: drawer title
 * - show() and hide() methods
 * - default slot and footer slot
 */
@customElement('otter-drawer')
export class OtterDrawer extends LitElement {
  @property() label: string = '';
  @property() placement: 'start' | 'end' | 'top' | 'bottom' = 'end';
  @state() private open: boolean = false;

  static styles = css`
    :host {
      --drawer-width: 400px;
      --drawer-height: 50vh;
      --overlay-bg: rgba(0, 0, 0, 0.5);
      --drawer-bg: var(--sl-panel-background-color, #fff);
      --drawer-border: var(--sl-panel-border-color, #e0e0e0);
      --header-height: 60px;
      --footer-height: auto;
      --transition-speed: 0.3s;
    }

    @media (prefers-color-scheme: dark) {
      .drawer {
        --drawer-bg: var(--md-sys-color-background);
      }
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: var(--overlay-bg);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity var(--transition-speed) ease,
        visibility 0s var(--transition-speed);
      z-index: 9998;
    }

    .overlay.open {
      opacity: 1;
      visibility: visible;
      transition: opacity var(--transition-speed) ease;
    }

    .drawer {
      position: fixed;
      background: var(--drawer-bg);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transition:
        transform var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0s var(--transition-speed);
      z-index: 9999;
      overflow: hidden;
      visibility: hidden;
    }

    .drawer.open {
      visibility: visible;
      transition:
        transform var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0s;
    }

    /* Placement: end (right) */
    .drawer.end {
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--drawer-width);
      transform: translateX(100%);
    }

    .drawer.end.open {
      transform: translateX(0);
    }

    /* Placement: start (left) */
    .drawer.start {
      top: 0;
      left: 0;
      bottom: 0;
      width: var(--drawer-width);
      transform: translateX(-100%);
    }

    .drawer.start.open {
      transform: translateX(0);
    }

    /* Placement: bottom */
    .drawer.bottom {
      left: 0;
      right: 0;
      bottom: 0;
      height: var(--drawer-height);
      transform: translateY(100%);
    }

    .drawer.bottom.open {
      transform: translateY(0);
    }

    /* Placement: top */
    .drawer.top {
      left: 0;
      right: 0;
      top: 0;
      height: var(--drawer-height);
      transform: translateY(-100%);
    }

    .drawer.top.open {
      transform: translateY(0);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--drawer-border);
      min-height: var(--header-height);
      flex-shrink: 0;
    }

    .header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--sl-color-neutral-900, #000);
    }

    .close-button {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      color: var(--sl-color-neutral-600, #666);
      transition: all 0.2s ease;
    }

    .close-button:hover {
      background: var(--sl-color-neutral-100, #f5f5f5);
      color: var(--sl-color-neutral-900, #000);
    }

    .close-button svg {
      width: 24px;
      height: 24px;
    }

    .body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.5rem;
    }

    .footer {
      border-top: 1px solid var(--drawer-border);
      padding: 1rem 1.5rem;
      flex-shrink: 0;
    }

    .footer:empty {
      display: none;
    }

    /* Responsive */
    @media (max-width: 820px) {
      :host {
        --drawer-width: 100vw;
        --drawer-height: 70vh;
      }

      .drawer.end,
      .drawer.start {
        width: 100vw;
      }
    }

    /* when in window controls overlay */
    @media (display-mode: window-controls-overlay) {
      .header {
        padding: 1.62rem;
      }
    }

    /* Animations for smooth interactions */
    @media (prefers-reduced-motion: reduce) {
      .overlay,
      .drawer {
        transition: none;
      }
    }
  `;

  render() {
    return html`
      <div
        class="overlay ${this.open ? 'open' : ''}"
        @click="${this.hide}"
        part="overlay"
      ></div>

      <div
        class="drawer ${this.placement} ${this.open ? 'open' : ''}"
        part="base"
      >
        <div class="header" part="header">
          <h2>${this.label}</h2>
          <button
            class="close-button"
            @click="${this.hide}"
            aria-label="Close drawer"
            part="close-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="body" part="body">
          <slot></slot>
        </div>

        <div class="footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }

  /**
   * Show the drawer with optional animation
   */
  async show() {
    this.open = true;

    // Emit event for potential listeners
    this.dispatchEvent(
      new CustomEvent('otter-show', {
        bubbles: true,
        composed: true,
      })
    );

    // Lock body scroll when drawer is open
    document.body.style.overflow = 'hidden';

    return Promise.resolve();
  }

  /**
   * Hide the drawer
   */
  async hide() {
    this.open = false;

    // Emit event for potential listeners
    this.dispatchEvent(
      new CustomEvent('otter-hide', {
        bubbles: true,
        composed: true,
      })
    );

    // Restore body scroll
    document.body.style.overflow = '';

    return Promise.resolve();
  }

  /**
   * Handle escape key to close drawer
   */
  connectedCallback() {
    super.connectedCallback();
    this._handleKeyDown = this._handleKeyDown.bind(this);
    document.addEventListener('keydown', this._handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeyDown);
    // Restore body scroll on unmount
    document.body.style.overflow = '';
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.open) {
      this.hide();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'otter-drawer': OtterDrawer;
  }
}
