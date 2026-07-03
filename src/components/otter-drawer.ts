import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import './md/md-icon-button';

/**
 * Custom drawer component to replace sl-drawer
 * Supports:
 * - placement: 'end' (right), 'start' (left), 'bottom', 'top'
 * - label: drawer title
 * - show() and hide() methods
 * - default slot and footer slot
 */
@localized()
@customElement('otter-drawer')
export class OtterDrawer extends LitElement {
  @property() label: string = '';
  @property() placement: 'start' | 'end' | 'top' | 'bottom' = 'end';
  @state() private open: boolean = false;

  // Drag-to-dismiss (bottom placement only)
  @state() private dragging: boolean = false;
  private dragStartY: number = 0;
  private dragCurrentY: number = 0;
  private dragStartTime: number = 0;
  private dragPointerId: number | null = null;

  private _previouslyFocused: HTMLElement | null = null;

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
      --drawer-radius: 18px;
      --drawer-body-padding: 1.5rem;
      --drawer-header-padding: 1rem 1.5rem;
      --drawer-footer-padding: 1rem 1.5rem;
      --drawer-handle-width: 44px;
      --drawer-handle-height: 4px;
      --drawer-handle-bg: rgba(120, 120, 120, 0.35);
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

    .drawer.dragging {
      transition: none !important;
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
      border-top-left-radius: var(--drawer-radius);
      border-top-right-radius: var(--drawer-radius);
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
      border-bottom-left-radius: var(--drawer-radius);
      border-bottom-right-radius: var(--drawer-radius);
    }

    .drawer.top.open {
      transform: translateY(0);
    }

    /* Android-like grab handle for bottom sheets */
    .handle {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-top: 10px;
      padding-bottom: 16px;
      border-bottom: 1px solid transparent;
      touch-action: none;
    }

    .handle-bar {
      width: var(--drawer-handle-width);
      height: var(--drawer-handle-height);
      border-radius: var(--md-sys-shape-corner-full);
      background: var(--drawer-handle-bg);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--drawer-header-padding);
      border-bottom: 1px solid var(--drawer-border);
      min-height: var(--header-height);
      flex-shrink: 0;
      touch-action: none;
    }

    .header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--sl-color-neutral-900, #000);
    }

    .close-button {
      /* positioning handled by md-icon-button */
    }

    .body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--drawer-body-padding);
    }

    .footer {
      border-top: 1px solid var(--drawer-border);
      padding: var(--drawer-footer-padding);
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
        class="drawer ${this.placement} ${this.open ? 'open' : ''} ${
          this.dragging ? 'dragging' : ''
        }"
        part="base"
        role="dialog"
        aria-modal="true"
        aria-label="${this.label}"
      >
        ${
          this.placement === 'bottom'
            ? html`<div
                class="handle"
                part="handle"
                @pointerdown=${this.onDragStart}
              >
                <div class="handle-bar"></div>
              </div>`
            : null
        }

        <div
          class="header"
          part="header"
          @pointerdown=${this.placement === 'bottom' ? this.onDragStart : null}
        >
          <h2>${this.label}</h2>
          <md-icon-button
            class="close-button"
            name="close"
            .label="${msg('Close drawer')}"
            part="close-button"
            @click="${this.hide}"
          ></md-icon-button>
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
    this.resetDragState();
    this._previouslyFocused = document.activeElement as HTMLElement | null;
    this.open = true;

    this.dispatchEvent(
      new CustomEvent('otter-show', {
        bubbles: true,
        composed: true,
      })
    );

    document.body.style.overflow = 'hidden';

    await this.updateComplete;
    const closeBtn = this.shadowRoot?.querySelector(
      '.close-button'
    ) as HTMLElement | null;
    closeBtn?.focus();

    return Promise.resolve();
  }

  /**
   * Hide the drawer
   */
  async hide() {
    this.resetDragState();
    this.open = false;

    this.dispatchEvent(
      new CustomEvent('otter-hide', {
        bubbles: true,
        composed: true,
      })
    );

    document.body.style.overflow = '';

    if (this._previouslyFocused) {
      this._previouslyFocused.focus();
      this._previouslyFocused = null;
    }

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
      return;
    }

    if (event.key === 'Tab' && this.open) {
      this._trapFocus(event);
    }
  }

  private _trapFocus(event: KeyboardEvent) {
    const drawer = this.shadowRoot?.querySelector('.drawer') as HTMLElement;
    if (!drawer) return;

    const focusable = [
      ...drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ),
      ...(this.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), md-icon-button, md-button, md-menu-item, md-checkbox'
      ) ?? []),
    ].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private get drawerEl(): HTMLElement | null {
    return this.shadowRoot?.querySelector('.drawer') as HTMLElement | null;
  }

  private resetDragState() {
    this.dragging = false;
    this.dragPointerId = null;
    this.dragStartY = 0;
    this.dragCurrentY = 0;
    this.dragStartTime = 0;
    this.drawerEl?.style.removeProperty('transform');
  }

  private onDragStart = (event: PointerEvent) => {
    if (this.placement !== 'bottom' || !this.open) return;
    // Only left-button / primary touch
    if (event.button !== 0 && event.pointerType !== 'touch') return;

    this.dragging = true;
    this.dragPointerId = event.pointerId;
    this.dragStartY = event.clientY;
    this.dragCurrentY = event.clientY;
    this.dragStartTime = performance.now();

    // Capture pointer so we keep getting moves outside header/handle.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    window.addEventListener('pointermove', this.onDragMove, { passive: false });
    window.addEventListener('pointerup', this.onDragEnd, { passive: false });
    window.addEventListener('pointercancel', this.onDragEnd, {
      passive: false,
    });
  };

  private onDragMove = (event: PointerEvent) => {
    if (!this.dragging || this.dragPointerId !== event.pointerId) return;

    // Prevent scroll while dragging the sheet
    event.preventDefault();

    this.dragCurrentY = event.clientY;
    const dy = Math.max(0, this.dragCurrentY - this.dragStartY);

    const el = this.drawerEl;
    if (!el) return;

    el.style.transform = `translateY(${dy}px)`;
  };

  private onDragEnd = async (event: PointerEvent) => {
    if (!this.dragging || this.dragPointerId !== event.pointerId) return;

    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    window.removeEventListener('pointercancel', this.onDragEnd);

    const el = this.drawerEl;
    const elapsed = Math.max(1, performance.now() - this.dragStartTime);
    const dy = Math.max(0, this.dragCurrentY - this.dragStartY);
    const velocity = dy / elapsed; // px/ms

    // Threshold: either distance or velocity
    const height = el?.getBoundingClientRect().height ?? 0;
    const shouldClose = dy > height * 0.25 || velocity > 0.9;

    this.dragging = false;

    if (shouldClose) {
      // Clear inline transform so close animation can run
      el?.style.removeProperty('transform');
      await this.hide();
      return;
    }

    // Snap back
    if (el) {
      el.style.transform = 'translateY(0px)';
      window.setTimeout(() => {
        // Let CSS own the final transform state again
        el.style.removeProperty('transform');
      }, 180);
    }

    this.dragPointerId = null;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'otter-drawer': OtterDrawer;
  }
}
