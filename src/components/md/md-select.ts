import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdSharedStyles } from './md-shared-styles.js';
import './md-icon.js';

/**
 * Material Design 3 Select Component
 * A dropdown selector that displays a list of options.
 * Replaces fluent-combobox with MD3 styling.
 */
@customElement('md-select')
export class MdSelect extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Boolean }) pill = false;
  @property({ type: Boolean, attribute: 'icon-only', reflect: true })
  iconOnly = false;
  @property({ type: String, attribute: 'icon-src' }) iconSrc = '';
  @property({ type: String, attribute: 'icon-label' }) iconLabel = '';

  @state() private _open = false;
  @state() private _options: MdOption[] = [];
  @state() private _highlightedIndex = -1;

  private _listboxId = `md-select-listbox-${Math.random().toString(36).slice(2, 9)}`;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        min-width: 200px;
      }

      :host([icon-only]) {
        min-width: 40px;
        width: 40px;
      }

      .select-container {
        position: relative;
      }

      .select-input {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 26px;
        padding: 8px 16px;
        border-radius: var(--md-sys-shape-corner-extra-small)
          var(--md-sys-shape-corner-extra-small) 0 0;
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
        cursor: pointer;
        user-select: none;
        font-size: var(--md-sys-typescale-body-large-font-size);
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.5px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        border-bottom: 1px solid var(--md-sys-color-on-surface-variant, #49454f);
        transition:
          background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
          border-bottom-color 0.2s cubic-bezier(0.2, 0, 0, 1);
        position: relative;
      }

      .select-input:hover:not(.disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          var(--md-sys-color-surface-container-highest, #e6e0e9)
        );
      }

      .select-input.open {
        border-bottom-color: var(--md-sys-color-primary, #6750a4);
        border-bottom-width: 2px;
      }

      .select-input.outlined {
        background-color: transparent;
        border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: var(--md-sys-shape-corner-extra-small);
      }

      .select-input.outlined:hover:not(.disabled) {
        border-color: var(--md-sys-color-on-surface, #1d1b20);
        background-color: transparent;
      }

      .select-input.outlined.open {
        border-color: var(--md-sys-color-primary, #6750a4);
        border-width: 2px;
      }

      .select-input.pill {
        border-radius: var(--md-sys-shape-corner-full);
        border-bottom: none;
      }

      .select-input.pill.outlined {
        border-radius: var(--md-sys-shape-corner-full);
      }

      .select-input.icon-only {
        padding: 8px;
        border-radius: var(--md-sys-shape-corner-circle);
        border-bottom: none !important;
        border: none !important;
        background: transparent !important;
        color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
        justify-content: center;
        gap: 0;
      }

      .select-input.icon-only.outlined {
        border-radius: var(--md-sys-shape-corner-circle);
      }

      .select-input.icon-only .select-label,
      .select-input.icon-only .dropdown-icon {
        display: none;
      }

      .icon-only-image {
        width: 24px;
        height: 24px;
      }

      .select-input.icon-only:hover:not(.disabled) {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, white) 8%,
          transparent
        ) !important;
      }

      .select-input.icon-only:active:not(.disabled) {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, white) 12%,
          transparent
        ) !important;
      }

      .select-input.disabled {
        opacity: 0.38;
        cursor: not-allowed;
        background-color: var(
          --md-sys-color-surface-container-highest,
          #e6e0e9
        );
      }

      .select-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .select-label.placeholder {
        color: var(--md-sys-color-on-surface-variant, #49454f);
      }

      .dropdown-icon {
        width: 24px;
        height: 24px;
        transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
        fill: currentColor;
      }

      .select-input.open .dropdown-icon {
        transform: rotate(180deg);
      }

      .dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        max-height: 280px;
        overflow-y: auto;
        background: var(--md-sys-color-surface-container, #f3edf7);
        border-radius: var(--md-sys-shape-corner-extra-small);
        box-shadow:
          0px 1px 2px rgba(0, 0, 0, 0.3),
          0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        opacity: 0;
        transform: scaleY(0);
        transform-origin: top;
        transition:
          opacity 0.15s cubic-bezier(0.2, 0, 0, 1),
          transform 0.15s cubic-bezier(0.2, 0, 0, 1);
        pointer-events: none;
      }

      .dropdown.open {
        opacity: 1;
        transform: scaleY(1);
        pointer-events: auto;
      }

      :host([icon-only]) .dropdown {
        left: 0;
        right: auto;
        width: max-content;
        min-width: 200px;
        max-width: min(280px, calc(100vw - 24px));
      }

      .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999;
        background: transparent;
        display: none;
      }

      .backdrop.open {
        display: block;
      }

      ::slotted(md-option) {
        cursor: pointer;
      }

      /* Focus visible styles */
      .select-input:focus-visible {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: 2px;
      }

      /* Dark mode */
      @media (prefers-color-scheme: light) {
        .select-input.icon-only {
          color: var(--md-sys-color-on-surface-variant, rgba(0, 0, 0, 0.6));
        }

        .select-input.icon-only:hover:not(.disabled) {
          background: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, black) 8%,
            transparent
          ) !important;
        }

        .select-input.icon-only:active:not(.disabled) {
          background: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, black) 12%,
            transparent
          ) !important;
        }
      }

      @media (prefers-color-scheme: dark) {
        .select-input {
          background-color: var(
            --md-sys-color-surface-container-highest,
            #36343b
          );
          color: var(--md-sys-color-on-surface, #e6e1e5);
          border-bottom-color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        .select-input:hover:not(.disabled) {
          background-color: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #e6e1e5) 8%,
            var(--md-sys-color-surface-container-highest, #36343b)
          );
        }

        .select-input.outlined {
          background-color: transparent;
          border-color: var(--md-sys-color-outline, #938f99);
        }

        .select-input.outlined:hover:not(.disabled) {
          border-color: var(--md-sys-color-on-surface, #e6e1e5);
        }

        .select-label.placeholder {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        .select-input.icon-only {
          color: var(
            --md-sys-color-on-surface-variant,
            rgba(255, 255, 255, 0.7)
          );
        }

        .dropdown {
          background: var(--md-sys-color-surface-container, #211f26);
          box-shadow:
            0px 1px 3px 1px rgba(0, 0, 0, 0.15),
            0px 1px 2px rgba(0, 0, 0, 0.3);
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
  }

  firstUpdated() {
    this._updateOptions();
  }

  private _optionClickHandlers = new WeakMap<MdOption, () => void>();

  private _updateOptions() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      const assignedElements = slot.assignedElements() as MdOption[];
      this._options = assignedElements.filter(
        (el) => el.tagName === 'MD-OPTION'
      );

      this._options.forEach((option, index) => {
        if (!this._optionClickHandlers.has(option)) {
          const handler = () => this._handleOptionClick(option);
          this._optionClickHandlers.set(option, handler);
          option.addEventListener('click', handler);
        }
        option.id = `${this._listboxId}-opt-${index}`;
      });
    }
  }

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this._open) {
      this._close();
      return;
    }

    if (!this._open) {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        const trigger = this.shadowRoot?.querySelector('.select-input');
        if (trigger?.contains(e.target as Node) || e.target === trigger) {
          e.preventDefault();
          this._open = true;
          this._highlightedIndex = this._options.findIndex(
            (opt) => opt.value === this.value
          );
          if (this._highlightedIndex < 0) this._highlightedIndex = 0;
        }
      }
      return;
    }

    const enabledOptions = this._options.filter((o) => !o.disabled);
    if (enabledOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._highlightedIndex = Math.min(
          this._highlightedIndex + 1,
          this._options.length - 1
        );
        while (
          this._options[this._highlightedIndex]?.disabled &&
          this._highlightedIndex < this._options.length - 1
        ) {
          this._highlightedIndex++;
        }
        this._scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        while (
          this._options[this._highlightedIndex]?.disabled &&
          this._highlightedIndex > 0
        ) {
          this._highlightedIndex--;
        }
        this._scrollHighlightedIntoView();
        break;
      case 'Home':
        e.preventDefault();
        this._highlightedIndex = 0;
        this._scrollHighlightedIntoView();
        break;
      case 'End':
        e.preventDefault();
        this._highlightedIndex = this._options.length - 1;
        this._scrollHighlightedIntoView();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (
          this._highlightedIndex >= 0 &&
          this._options[this._highlightedIndex] &&
          !this._options[this._highlightedIndex].disabled
        ) {
          this._handleOptionClick(this._options[this._highlightedIndex]);
        }
        break;
    }
  };

  private _scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const option = this._options[this._highlightedIndex];
      if (option) {
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private _handleInputClick() {
    if (this.disabled) return;

    if (this._open) {
      this._close();
    } else {
      this._open = true;
      this.dispatchEvent(
        new CustomEvent('md-select-open', { bubbles: true, composed: true })
      );
    }
  }

  private _handleBackdropClick = () => {
    this._close();
  };

  private _handleOptionClick(option: MdOption) {
    if (option.disabled) return;

    const oldValue = this.value;
    this.value = option.value;

    // Dispatch change event
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value, oldValue },
        bubbles: true,
        composed: true,
      })
    );

    this._close();
  }

  private _close() {
    this._open = false;
    this.dispatchEvent(
      new CustomEvent('md-select-close', { bubbles: true, composed: true })
    );
  }

  private _getDisplayLabel(): string {
    if (!this.value) return this.placeholder;

    const selectedOption = this._options.find(
      (opt) => opt.value === this.value
    );
    return selectedOption?.textContent?.trim() || this.value;
  }

  render() {
    const displayLabel = this._getDisplayLabel();
    const isPlaceholder = !this.value;
    const ariaLabel = this.iconLabel || this.placeholder || displayLabel;

    return html`
      <div class="select-container">
        <div
          class="select-input ${this.variant} ${this._open ? 'open' : ''} ${this
            .disabled
            ? 'disabled'
            : ''} ${this.pill ? 'pill' : ''} ${this.iconOnly
            ? 'icon-only'
            : ''}"
          @click=${this._handleInputClick}
          tabindex="${this.disabled ? -1 : 0}"
          role="combobox"
          aria-expanded="${this._open ? 'true' : 'false'}"
          aria-haspopup="listbox"
          aria-controls="${this._listboxId}"
          aria-activedescendant="${this._open && this._highlightedIndex >= 0
            ? `${this._listboxId}-opt-${this._highlightedIndex}`
            : ''}"
          aria-label="${ariaLabel}"
        >
          ${this.iconOnly && this.iconSrc
            ? html`<md-icon
                class="icon-only-image"
                src="${this.iconSrc}"
                label="${ariaLabel}"
              ></md-icon>`
            : html`
                <span
                  class="select-label ${isPlaceholder ? 'placeholder' : ''}"
                >
                  ${displayLabel}
                </span>
                <svg
                  class="dropdown-icon"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 10l5 5 5-5z" fill="currentColor" />
                </svg>
              `}
        </div>

        <div
          class="backdrop ${this._open ? 'open' : ''}"
          @click=${this._handleBackdropClick}
        ></div>

        <div
          class="dropdown ${this._open ? 'open' : ''}"
          role="listbox"
          id="${this._listboxId}"
        >
          <slot @slotchange=${this._updateOptions}></slot>
        </div>
      </div>
    `;
  }
}

// Define the MdOption interface for type checking
interface MdOption extends HTMLElement {
  value: string;
  disabled: boolean;
}

declare global {
  interface HTMLElementTagNameMap {
    'md-select': MdSelect;
  }
}
