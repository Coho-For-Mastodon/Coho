import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * Material Design 3 Dropdown
 * Shows a popup surface when trigger is clicked. Content can be anything (md-menu, form, etc).
 *
 * The popup is hoisted to the document body to escape overflow clipping from parent containers.
 */
@customElement('md-dropdown')
export class MdDropdown extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) placement:
    | 'bottom-start'
    | 'bottom-end'
    | 'top-start'
    | 'top-end' = 'bottom-start';
  @property({ type: Number }) distance = 8;

  @query('slot[name="trigger"]') triggerSlot!: HTMLSlotElement;
  @query('slot:not([name])') contentSlot!: HTMLSlotElement;

  private _popupContainer: HTMLDivElement | null = null;
  private _backdrop: HTMLDivElement | null = null;
  private _movedElements: Element[] = [];

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }

    .trigger {
      display: inline-flex;
      cursor: pointer;
    }

    .content-holder {
      display: none;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleEscape);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleEscape);
    this._cleanup();
  }

  private _handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.hide();
    }
  };

  private _handleTriggerClick = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  };

  private _createPopup() {
    // Create backdrop
    this._backdrop = document.createElement('div');
    this._backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99998;
      background: transparent;
    `;
    this._backdrop.addEventListener('click', this._handleBackdropClick);
    document.body.appendChild(this._backdrop);

    // Create popup container
    this._popupContainer = document.createElement('div');
    this._popupContainer.style.cssText = `
      position: fixed;
      z-index: 100000;
      opacity: 0;
      transform: scale(0.95);
      transform-origin: top left;
      transition: opacity 0.15s cubic-bezier(0.2, 0, 0, 1), transform 0.15s cubic-bezier(0.2, 0, 0, 1);
    `;

    // Move actual slotted elements to popup (preserves event handlers)
    if (this.contentSlot) {
      const elements = this.contentSlot.assignedElements();
      this._movedElements = [...elements];
      elements.forEach((el) => {
        this._popupContainer!.appendChild(el);
      });
    }

    // Listen for clicks inside popup to close dropdown
    this._popupContainer.addEventListener('click', this._handlePopupClick);

    document.body.appendChild(this._popupContainer);

    // Position and animate in
    requestAnimationFrame(() => {
      this._positionPopup();
      requestAnimationFrame(() => {
        if (this._popupContainer) {
          this._popupContainer.style.opacity = '1';
          this._popupContainer.style.transform = 'scale(1)';
        }
      });
    });
  }

  private _handlePopupClick = (e: Event) => {
    // Close dropdown when a menu item is clicked
    const target = e.target as HTMLElement;
    if (target.tagName === 'MD-MENU-ITEM' || target.closest('md-menu-item')) {
      // Small delay to allow the click handler to fire first
      setTimeout(() => this.hide(), 50);
    }
  };

  private _cleanup() {
    // Move elements back to their original slot
    if (this._movedElements.length > 0) {
      const holder = this.shadowRoot?.querySelector('.content-holder');
      if (holder) {
        this._movedElements.forEach((el) => {
          this.appendChild(el);
        });
      }
      this._movedElements = [];
    }

    if (this._backdrop) {
      this._backdrop.removeEventListener('click', this._handleBackdropClick);
      this._backdrop.remove();
      this._backdrop = null;
    }
    if (this._popupContainer) {
      this._popupContainer.removeEventListener('click', this._handlePopupClick);
      this._popupContainer.remove();
      this._popupContainer = null;
    }
  }

  show() {
    this.open = true;
    this._createPopup();
    this.dispatchEvent(
      new CustomEvent('md-dropdown-show', { bubbles: true, composed: true })
    );
  }

  hide() {
    this.open = false;
    this._cleanup();
    this.dispatchEvent(
      new CustomEvent('md-dropdown-hide', { bubbles: true, composed: true })
    );
  }

  private _positionPopup() {
    const triggerEl = this.triggerSlot?.assignedElements()[0] as HTMLElement;
    if (!triggerEl || !this._popupContainer) return;

    const rect = triggerEl.getBoundingClientRect();
    const popupRect = this._popupContainer.getBoundingClientRect();

    let top = rect.bottom + this.distance;
    let left = rect.left;

    // Adjust for placement
    if (this.placement === 'bottom-end') {
      left = rect.right - popupRect.width;
    } else if (this.placement === 'top-start') {
      top = rect.top - popupRect.height - this.distance;
    } else if (this.placement === 'top-end') {
      top = rect.top - popupRect.height - this.distance;
      left = rect.right - popupRect.width;
    }

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + popupRect.width > viewportWidth) {
      left = viewportWidth - popupRect.width - 8;
    }
    if (left < 8) {
      left = 8;
    }
    if (top + popupRect.height > viewportHeight) {
      top = rect.top - popupRect.height - this.distance;
    }
    if (top < 8) {
      top = 8;
    }

    this._popupContainer.style.top = `${top}px`;
    this._popupContainer.style.left = `${left}px`;
  }

  private _handleBackdropClick = () => {
    this.hide();
  };

  render() {
    return html`
      <div class="trigger" @click=${this._handleTriggerClick}>
        <slot name="trigger"></slot>
      </div>
      <div class="content-holder">
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
