import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
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

  /** Visible label rendered above the select trigger */
  @property({ type: String }) label = '';
  /** aria-label override for the combobox trigger */
  @property({ type: String, attribute: 'aria-label' }) ariaLabel = '';
  /** ID(s) of external elements that label this select */
  @property({ type: String, attribute: 'aria-labelledby' }) ariaLabelledBy = '';

  @state() private _open = false;
  @state() private _options: MdOption[] = [];
  @state() private _highlightedIndex = -1;

  @query('.dropdown') private _dropdown!: HTMLDivElement;

  private _listboxId = `md-select-listbox-${Math.random().toString(36).slice(2, 9)}`;
  private _labelId = `md-select-label-${Math.random().toString(36).slice(2, 9)}`;

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
        anchor-name: --md-select-trigger;
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
        position: fixed;
        position-anchor: --md-select-trigger;
        inset: auto;
        top: anchor(bottom);
        left: anchor(left);
        margin: 4px 0 0 0;
        padding: 0;
        border: none;
        width: anchor-size(width);
        max-height: 280px;
        overflow-y: auto;
        background: var(--md-sys-color-surface-container, #f3edf7);
        border-radius: var(--md-sys-shape-corner-extra-small);
        box-shadow:
          0px 1px 2px rgba(0, 0, 0, 0.3),
          0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: scaleY(0);
        transform-origin: top;
        transition:
          opacity 0.15s cubic-bezier(0.2, 0, 0, 1),
          transform 0.15s cubic-bezier(0.2, 0, 0, 1),
          display 0.15s allow-discrete,
          overlay 0.15s allow-discrete;
        transition-behavior: allow-discrete;
      }

      .dropdown:popover-open {
        opacity: 1;
        transform: scaleY(1);
      }

      @starting-style {
        .dropdown:popover-open {
          opacity: 0;
          transform: scaleY(0.95);
        }
      }

      :host([icon-only]) .dropdown {
        width: max-content;
        min-width: 200px;
        max-width: min(280px, calc(100vw - 24px));
      }

      .dropdown::backdrop {
        background: transparent;
      }

      ::slotted(md-option) {
        cursor: pointer;
      }

      .select-field-label {
        display: block;
        font-size: var(--md-sys-typescale-body-small-font-size, 12px);
        font-weight: 500;
        line-height: 16px;
        letter-spacing: 0.4px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        margin-bottom: 4px;
      }

      @media (prefers-color-scheme: dark) {
        .select-field-label {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }
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

  private _optionClickHandlers = new WeakMap<MdOption, () => void>();

  private _updateOptions() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      const assignedElements = slot.assignedElements() as MdOption[];
      const nextOptions = assignedElements.filter(
        (el) => el.tagName === 'MD-OPTION'
      );

      const optionsChanged =
        nextOptions.length !== this._options.length ||
        nextOptions.some((option, index) => option !== this._options[index]);

      if (optionsChanged) {
        this._options = nextOptions;
      }

      nextOptions.forEach((option, index) => {
        if (!this._optionClickHandlers.has(option)) {
          const handler = () => this._handleOptionClick(option);
          this._optionClickHandlers.set(option, handler);
          option.addEventListener('click', handler);
        }
        option.id = `${this._listboxId}-opt-${index}`;
      });

      this._syncOptionsSelected();
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
    }
  }

  private _handleOptionClick(option: MdOption) {
    if (option.disabled) return;

    const oldValue = this.value;
    this.value = option.value;
    this._syncOptionsSelected();

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

  private _syncOptionsSelected() {
    this._options.forEach((opt) => {
      const isSelected = opt.value === this.value;
      if (opt.selected !== isSelected) {
        opt.selected = isSelected;
      }
    });
  }

  private _syncOptionsHighlighted() {
    this._options.forEach((opt, i) => {
      const isHighlighted = i === this._highlightedIndex;
      if (opt.highlighted !== isHighlighted) {
        opt.highlighted = isHighlighted;
      }
    });
  }

  private _close() {
    this._open = false;
  }

  private _handleDropdownToggle = (e: Event) => {
    const { newState } = e as Event & { newState?: 'open' | 'closed' };
    const isOpen = newState
      ? newState === 'open'
      : this._dropdown.matches(':popover-open');

    if (this._open !== isOpen) {
      this._open = isOpen;
    }

    this.dispatchEvent(
      new CustomEvent(isOpen ? 'md-select-open' : 'md-select-close', {
        bubbles: true,
        composed: true,
      })
    );
  };

  private _syncPopover() {
    if (!this.isConnected || !this._dropdown) return;

    const isOpen = this._dropdown.matches(':popover-open');
    if (this._open && !isOpen) {
      this._dropdown.showPopover();
      return;
    }

    if (!this._open && isOpen) {
      this._dropdown.hidePopover();
    }
  }

  private _getDisplayLabel(): string {
    if (!this.value) return this.placeholder;

    // Query light DOM directly so the label is correct even before
    // _options is populated by the slotchange handler.
    const fromDOM = (
      this.querySelector(
        `md-option[value="${CSS.escape(this.value)}"]`
      ) as MdOption | null
    )?.textContent?.trim();
    if (fromDOM) return fromDOM;

    const fromState = this._options.find((opt) => opt.value === this.value);
    return fromState?.textContent?.trim() || this.value;
  }

  render() {
    const displayLabel = this._getDisplayLabel();
    const isPlaceholder = !this.value;
    // Build accessible name: explicit ariaLabel > labeled via prop > icon fallback > existing fallback
    const computedAriaLabel =
      this.ariaLabel ||
      (this.label
        ? nothing
        : this.iconOnly
          ? this.iconLabel || this.placeholder
          : this.placeholder || displayLabel);
    const computedLabelledBy = this.ariaLabel
      ? nothing
      : this.ariaLabelledBy || (this.label ? this._labelId : nothing);

    return html`
      <div class="select-container">
        ${this.label
          ? html`<span id="${this._labelId}" class="select-field-label"
              >${this.label}</span
            >`
          : ''}
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
            : nothing}"
          aria-label="${computedAriaLabel}"
          aria-labelledby="${computedLabelledBy}"
        >
          ${this.iconOnly && this.iconSrc
            ? html`<md-icon
                class="icon-only-image"
                src="${this.iconSrc}"
                label="${computedAriaLabel}"
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
          class="dropdown"
          role="listbox"
          id="${this._listboxId}"
          popover="auto"
          @toggle=${this._handleDropdownToggle}
        >
          <slot @slotchange=${this._updateOptions}></slot>
        </div>
      </div>
    `;
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('_open')) {
      this._syncPopover();
    }
    if (changedProperties.has('value')) {
      this._syncOptionsSelected();
    }
    if (changedProperties.has('_highlightedIndex')) {
      this._syncOptionsHighlighted();
    }
  }
}

// Define the MdOption interface for type checking
interface MdOption extends HTMLElement {
  value: string;
  disabled: boolean;
  selected: boolean;
  highlighted: boolean;
}

declare global {
  interface HTMLElementTagNameMap {
    'md-select': MdSelect;
  }
}
