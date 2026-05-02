import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * Material Design 3 Dropdown
 * Shows a popup surface when trigger is clicked. Content can be anything (md-menu, form, etc).
 */
@customElement('md-dropdown')
export class MdDropdown extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  /** When true, clicking a menu item will NOT auto-close the dropdown. */
  @property({ type: Boolean }) keepOpen = false;
  /** When true, close the dropdown when any ancestor scroll container scrolls. */
  @property({ type: Boolean, attribute: 'close-on-scroll' })
  closeOnScroll = false;
  @property({ type: String }) placement:
    | 'bottom-start'
    | 'bottom-end'
    | 'top-start'
    | 'top-end' = 'bottom-start';
  @property({ type: Number }) distance = 8;

  @query('slot[name="trigger"]') triggerSlot!: HTMLSlotElement;
  @query('.popup') popup!: HTMLDivElement;

  private _positionRaf: number | null = null;
  private _scrollTargets: EventTarget[] = [];
  private _popupId = `md-dropdown-popup-${Math.random().toString(36).slice(2, 9)}`;
  private _focusRestoreTarget: HTMLElement | null = null;

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }

    .trigger:focus-visible {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: 2px;
    }

    .trigger {
      display: inline-flex;
      cursor: pointer;
      position: relative;
    }

    .popup {
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      overflow: visible;
      max-width: calc(100vw - 16px);
      max-height: calc(100vh - 16px);
      opacity: 0;
      transform: scale(0.95);
      transform-origin: var(--md-dropdown-origin-y, top)
        var(--md-dropdown-origin-x, left);
      transition:
        opacity 0.15s cubic-bezier(0.2, 0, 0, 1),
        transform 0.15s cubic-bezier(0.2, 0, 0, 1),
        display 0.15s allow-discrete,
        overlay 0.15s allow-discrete;
      transition-behavior: allow-discrete;
    }

    .popup:popover-open {
      opacity: 1;
      transform: scale(1);
    }

    @starting-style {
      .popup:popover-open {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    .popup::backdrop {
      background: transparent;
    }
  `;

  private _handleTriggerClick = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  };

  private _handlePopupClick = (e: Event) => {
    // Close dropdown when a menu item is clicked
    if (this.keepOpen) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'MD-MENU-ITEM' || target.closest('md-menu-item')) {
      // Small delay to allow the click handler to fire first
      setTimeout(() => this.hide(), 50);
    }
  };

  show() {
    if (!this.open) {
      this._focusRestoreTarget = document.activeElement as HTMLElement;
      this.open = true;
    }
  }

  hide() {
    if (this.open) {
      this.open = false;
    }
  }

  private _positionPopup() {
    const triggerEl = this.triggerSlot?.assignedElements()[0] as HTMLElement;
    if (!triggerEl || !this.popup) return;

    const rect = triggerEl.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    // Parse requested placement
    let [vertical, horizontal] = this.placement.split('-') as [
      'top' | 'bottom',
      'start' | 'end',
    ];

    // Calculate available space in each direction
    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const spaceRight = viewportWidth - rect.left - margin;
    const spaceLeft = rect.right - margin;

    // Flip vertical if needed
    if (
      vertical === 'bottom' &&
      popupRect.height > spaceBelow &&
      spaceAbove > spaceBelow
    ) {
      vertical = 'top';
    } else if (
      vertical === 'top' &&
      popupRect.height > spaceAbove &&
      spaceBelow > spaceAbove
    ) {
      vertical = 'bottom';
    }

    // Flip horizontal if needed
    if (
      horizontal === 'start' &&
      popupRect.width > spaceRight &&
      spaceLeft > spaceRight
    ) {
      horizontal = 'end';
    } else if (
      horizontal === 'end' &&
      popupRect.width > spaceLeft &&
      spaceRight > spaceLeft
    ) {
      horizontal = 'start';
    }

    // Calculate position based on computed placement
    let top: number;
    let left: number;

    if (vertical === 'bottom') {
      top = rect.bottom + this.distance;
    } else {
      top = rect.top - popupRect.height - this.distance;
    }

    if (horizontal === 'start') {
      left = rect.left;
    } else {
      left = rect.right - popupRect.width;
    }

    // Final clamp to viewport (in case popup is larger than available space)
    left = Math.max(
      margin,
      Math.min(left, viewportWidth - popupRect.width - margin)
    );
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - popupRect.height - margin)
    );

    // Set transform-origin based on computed placement for natural animation
    const originY = vertical === 'bottom' ? 'top' : 'bottom';
    const originX = horizontal === 'start' ? 'left' : 'right';
    this.popup.style.setProperty('--md-dropdown-origin-y', originY);
    this.popup.style.setProperty('--md-dropdown-origin-x', originX);

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  private _handleToggle = (e: Event) => {
    const { newState } = e as Event & { newState?: 'open' | 'closed' };
    const isOpen = newState
      ? newState === 'open'
      : this.popup.matches(':popover-open');

    if (this.open !== isOpen) {
      this.open = isOpen;
    }

    if (isOpen) {
      this._attachOpenListeners();
      requestAnimationFrame(() => {
        this._positionPopup();
        this._focusMenuContent();
      });
    } else {
      this._detachOpenListeners();
      // Restore focus to the element that was focused before the dropdown opened
      requestAnimationFrame(() => {
        this._focusRestoreTarget?.focus();
        this._focusRestoreTarget = null;
      });
    }

    this.dispatchEvent(
      new CustomEvent(isOpen ? 'md-dropdown-show' : 'md-dropdown-hide', {
        bubbles: true,
        composed: true,
      })
    );
  };

  private _schedulePositionPopup() {
    if (this._positionRaf !== null) return;
    this._positionRaf = requestAnimationFrame(() => {
      this._positionRaf = null;
      if (this.open) {
        this._positionPopup();
      }
    });
  }

  private _handleScrollOrResize = (e: Event) => {
    if (!this.open) return;

    const target = e.target;
    const scrolledInsidePopup =
      target instanceof Node && !!this.popup && this.popup.contains(target);
    if (scrolledInsidePopup) {
      return;
    }

    if (this.closeOnScroll && e.type === 'scroll') {
      this.hide();
      return;
    }

    this._schedulePositionPopup();
  };

  private _isScrollableElement(el: Element): boolean {
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY =
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      el.scrollHeight > el.clientHeight;
    const canScrollX =
      (overflowX === 'auto' ||
        overflowX === 'scroll' ||
        overflowX === 'overlay') &&
      el.scrollWidth > el.clientWidth;
    return canScrollY || canScrollX;
  }

  private _collectScrollTargets(start: HTMLElement): EventTarget[] {
    const targets: EventTarget[] = [];
    const seen = new Set<EventTarget>();

    let current: Element | null = start;
    while (current) {
      if (this._isScrollableElement(current) && !seen.has(current)) {
        seen.add(current);
        targets.push(current);
      }

      if (current.parentElement) {
        current = current.parentElement;
        continue;
      }

      const root = current.getRootNode();
      if (root instanceof ShadowRoot) {
        current = root.host;
      } else {
        current = null;
      }
    }

    if (!seen.has(window)) {
      seen.add(window);
      targets.push(window);
    }

    return targets;
  }

  private _attachOpenListeners() {
    this._detachOpenListeners();

    const triggerEl = this.triggerSlot?.assignedElements()[0] as
      | HTMLElement
      | undefined;
    this._scrollTargets = triggerEl
      ? this._collectScrollTargets(triggerEl)
      : [window];

    for (const target of this._scrollTargets) {
      target.addEventListener('scroll', this._handleScrollOrResize, {
        passive: true,
      });
    }

    window.addEventListener('resize', this._handleScrollOrResize, {
      passive: true,
    });
  }

  private _detachOpenListeners() {
    window.removeEventListener('resize', this._handleScrollOrResize);

    for (const target of this._scrollTargets) {
      target.removeEventListener('scroll', this._handleScrollOrResize);
    }
    this._scrollTargets = [];

    if (this._positionRaf !== null) {
      cancelAnimationFrame(this._positionRaf);
      this._positionRaf = null;
    }
  }

  private _syncPopover() {
    if (!this.isConnected || !this.popup) return;

    const isOpen = this.popup.matches(':popover-open');
    if (this.open && !isOpen) {
      this.popup.showPopover();
      return;
    }

    if (!this.open && isOpen) {
      this.popup.hidePopover();
    }
  }

  private _updateTriggerAria() {
    const triggerEl = this.triggerSlot?.assignedElements()[0] as HTMLElement;
    if (!triggerEl) return;

    triggerEl.setAttribute('aria-expanded', String(this.open));
    triggerEl.setAttribute('aria-haspopup', 'menu');
    triggerEl.setAttribute('aria-controls', this._popupId);
  }

  private _focusMenuContent() {
    const defaultSlot =
      this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    const elements = (defaultSlot?.assignedElements() ?? []) as HTMLElement[];
    for (const el of elements) {
      if (el.tagName === 'MD-MENU') {
        const menu = el as HTMLElement & { focusFirst?: () => void };
        if (typeof menu.focusFirst === 'function') {
          menu.focusFirst();
        }
        return;
      }
    }
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('open')) {
      this._syncPopover();
      this._updateTriggerAria();

      if (this.open) {
        this._attachOpenListeners();
        this._schedulePositionPopup();
      } else {
        this._detachOpenListeners();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachOpenListeners();
  }

  render() {
    return html`
      <div class="trigger" @click=${this._handleTriggerClick}>
        <slot name="trigger"></slot>
      </div>
      <div
        id="${this._popupId}"
        class="popup"
        popover="auto"
        @toggle=${this._handleToggle}
        @click=${this._handlePopupClick}
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-dropdown': MdDropdown;
  }
}
