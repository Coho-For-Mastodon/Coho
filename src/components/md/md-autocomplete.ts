import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

/**
 * Material Design 3 Autocomplete Component
 * A text input with dropdown suggestions following MD3 styling.
 */
@customElement('md-autocomplete')
export class MdAutocomplete extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) autofocus = false;
  @property({ type: String }) variant: 'filled' | 'outlined' = 'filled';
  @property({ type: Boolean }) pill = false;
  @property({ type: Array }) options: AutocompleteOption[] = [];
  @property({ type: Boolean }) loading = false;

  @state() private _showDropdown = false;
  @state() private _highlightedIndex = -1;
  @state() private _isFocused = false;

  @query('input') private _input!: HTMLInputElement;

  // When options change and input is focused, show the dropdown
  updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has('options') &&
      this._isFocused &&
      this.options.length > 0
    ) {
      this._showDropdown = true;
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }

    .autocomplete-container {
      position: relative;
      width: 100%;
    }

    input {
      width: 100%;
      min-height: 40px;
      padding: 12px 16px;
      border: none;
      border-radius: 52px;
      background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
      font-family:
        'Roboto',
        system-ui,
        -apple-system,
        sans-serif;
      font-size: var(--md-sys-typescale-body-large-font-size);
      font-weight: 400;
      line-height: 24px;
      letter-spacing: 0.5px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      box-sizing: border-box;
    }

    input::placeholder {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      opacity: 1;
    }

    input:hover:not(:disabled) {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 8%,
        var(--md-sys-color-surface-container-highest, #e6e0e9)
      );
    }

    input:focus {
      outline: none;
      border-bottom-color: var(--md-sys-color-primary, #6750a4);
      border-bottom-width: 2px;
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 12%,
        var(--md-sys-color-surface-container-highest, #e6e0e9)
      );
    }

    input:disabled {
      opacity: 0.38;
      cursor: not-allowed;
      background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
    }

    /* Outlined variant */
    input.outlined {
      background-color: transparent;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: 4px;
    }

    input.outlined:hover:not(:disabled) {
      border-color: var(--md-sys-color-on-surface, #1d1b20);
      background-color: transparent;
    }

    input.pill {
      border-radius: 9999px;
      border-bottom: none;
    }

    input.pill.outlined {
      border-radius: 9999px;
    }

    input.outlined:focus {
      border-color: var(--md-sys-color-primary, #6750a4);
      border-width: 2px;
      background-color: transparent;
      padding: 11px 15px;
    }

    /* Dropdown styles */
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background-color: var(--md-sys-color-surface-container, #f3edf7);
      border-radius: 0 0 12px 12px;
      box-shadow:
        0 2px 6px 2px rgba(0, 0, 0, 0.15),
        0 1px 2px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.15s cubic-bezier(0.2, 0, 0, 1);
    }

    .dropdown-item:hover,
    .dropdown-item.highlighted {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 8%,
        var(--md-sys-color-surface-container, #f3edf7)
      );
    }

    .dropdown-item:active {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 12%,
        var(--md-sys-color-surface-container, #f3edf7)
      );
    }

    .dropdown-item:last-child {
      border-radius: 0 0 12px 12px;
    }

    .item-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .item-description {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    .no-results {
      padding: 16px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    /* Icon in item */
    .item-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .item-icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: cover;
    }

    .item-text {
      flex: 1;
      min-width: 0;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      input {
        background-color: var(
          --md-sys-color-surface-container-highest,
          #49454f
        );
        color: var(--md-sys-color-on-surface, #e6e0e9);
        border-bottom-color: var(--md-sys-color-outline, #938f99);
      }

      input::placeholder {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      input:hover:not(:disabled) {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #e6e0e9) 8%,
          var(--md-sys-color-surface-container-highest, #49454f)
        );
      }

      input:focus {
        border-bottom-color: var(--md-sys-color-primary, #d0bcff);
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #e6e0e9) 12%,
          var(--md-sys-color-surface-container-highest, #49454f)
        );
      }

      input:disabled {
        background-color: var(
          --md-sys-color-surface-container-highest,
          #49454f
        );
      }

      input.outlined {
        background-color: transparent;
        border-color: var(--md-sys-color-outline, #938f99);
      }

      input.outlined:hover:not(:disabled) {
        border-color: var(--md-sys-color-on-surface, #e6e0e9);
      }

      input.outlined:focus {
        border-color: var(--md-sys-color-primary, #d0bcff);
      }

      .dropdown {
        background-color: var(--md-sys-color-surface-container, #2b2930);
      }

      .dropdown-item:hover,
      .dropdown-item.highlighted {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #e6e0e9) 8%,
          var(--md-sys-color-surface-container, #2b2930)
        );
      }

      .dropdown-item:active {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #e6e0e9) 12%,
          var(--md-sys-color-surface-container, #2b2930)
        );
      }

      .item-label {
        color: var(--md-sys-color-on-surface, #e6e0e9);
      }

      .item-description {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .loading-indicator,
      .no-results {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Close dropdown when clicking outside
    document.addEventListener('click', this._handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
  }

  firstUpdated() {
    if (this.autofocus && this._input) {
      this._input.focus();
    }
  }

  private _handleOutsideClick = (e: Event) => {
    // Use composedPath to properly handle Shadow DOM
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._showDropdown = false;
      this._highlightedIndex = -1;
    }
  };

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this._showDropdown = true;
    this._highlightedIndex = -1;

    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFocus() {
    this._isFocused = true;
    // Always show dropdown on focus if there are options available
    if (this.options.length > 0) {
      this._showDropdown = true;
    }
    // Emit focus event so parent can load initial options if needed
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleBlur() {
    this._isFocused = false;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (!this._showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this._showDropdown = true;
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._highlightedIndex = Math.min(
          this._highlightedIndex + 1,
          this.options.length - 1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._highlightedIndex = Math.max(this._highlightedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (
          this._highlightedIndex >= 0 &&
          this.options[this._highlightedIndex]
        ) {
          this._selectOption(this.options[this._highlightedIndex]);
        }
        break;
      case 'Escape':
        this._showDropdown = false;
        this._highlightedIndex = -1;
        break;
    }
  }

  private _selectOption(option: AutocompleteOption) {
    this.value = option.value;
    this._showDropdown = false;
    this._highlightedIndex = -1;

    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { value: option.value, option },
        bubbles: true,
        composed: true,
      })
    );

    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: option.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const showDropdown =
      this._showDropdown && (this.options.length > 0 || this.loading);

    return html`
      <div class="autocomplete-container">
        <input
          type="text"
          .value="${this.value}"
          placeholder="${this.placeholder}"
          ?disabled="${this.disabled}"
          class="${this.variant} ${this.pill ? 'pill' : ''}"
          @input="${this._handleInput}"
          @focus="${this._handleFocus}"
          @blur="${this._handleBlur}"
          @keydown="${this._handleKeyDown}"
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="${showDropdown ? 'true' : 'false'}"
          aria-haspopup="listbox"
        />
        <div class="dropdown ${showDropdown ? 'open' : ''}" role="listbox">
          ${this.loading
            ? html`<div class="loading-indicator">Loading...</div>`
            : this.options.length === 0
              ? html`<div class="no-results">No results found</div>`
              : this.options.map(
                  (option, index) => html`
                    <div
                      class="dropdown-item ${index === this._highlightedIndex
                        ? 'highlighted'
                        : ''}"
                      role="option"
                      aria-selected="${index === this._highlightedIndex
                        ? 'true'
                        : 'false'}"
                      @click="${() => this._selectOption(option)}"
                      @mouseenter="${() => (this._highlightedIndex = index)}"
                    >
                      <div class="item-content">
                        ${option.icon
                          ? html`<img
                              class="item-icon"
                              src="${option.icon}"
                              alt=""
                              loading="lazy"
                              @error="${(e: Event) =>
                                ((e.target as HTMLImageElement).style.display =
                                  'none')}"
                            />`
                          : null}
                        <div class="item-text">
                          <div class="item-label">${option.label}</div>
                          ${option.description
                            ? html`<div class="item-description">
                                ${option.description}
                              </div>`
                            : null}
                        </div>
                      </div>
                    </div>
                  `
                )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-autocomplete': MdAutocomplete;
  }
}
