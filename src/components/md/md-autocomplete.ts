import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Material Design 3 Autocomplete Component
 * A text input with dropdown suggestions following MD3 styling.
 */
@customElement('md-autocomplete')
export class MdAutocomplete extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Array }) options: AutocompleteOption[] = [];
  @property({ type: Boolean }) loading = false;

  @state() private _showDropdown = false;
  @state() private _highlightedIndex = -1;
  @state() private _isFocused = false;

  @query('input') private _input!: HTMLInputElement;
  @query('.dropdown') private _dropdown!: HTMLDivElement;

  private _listboxId = 'autocomplete-listbox';

  updated(changedProperties: Map<string, unknown>) {
    if (
      (changedProperties.has('options') || changedProperties.has('loading')) &&
      this._isFocused &&
      (this.options.length > 0 || this.loading)
    ) {
      this._showDropdown = true;
    }

    if (
      changedProperties.has('options') ||
      changedProperties.has('loading') ||
      changedProperties.has('_showDropdown')
    ) {
      this._syncPopover();
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;

      --_surface-container: var(--md-sys-color-surface-container);
      --_surface-container-highest: var(
        --md-sys-color-surface-container-highest
      );
      --_on-surface: var(--md-sys-color-on-surface);
      --_on-surface-variant: var(--md-sys-color-on-surface-variant);
    }

    input {
      width: 100%;
      min-height: 40px;
      padding: 12px 16px;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: var(--md-sys-shape-corner-medium);
      background-color: var(--_surface-container-highest);
      font-family: inherit;
      font-size: var(--md-sys-typescale-body-large-font-size);
      font-weight: 400;
      line-height: 24px;
      letter-spacing: 0;
      color: var(--_on-surface);
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    input::placeholder {
      color: var(--_on-surface-variant);
      opacity: 1;
    }

    input:hover {
      border-color: var(--_on-surface);
    }

    input:focus-visible {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: -2px;
    }

    input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary, #6750a4);
    }

    .dropdown {
      position: fixed;
      inset: auto;
      top: 0;
      left: 0;
      margin: 0;
      padding: 0;
      border: none;
      width: 0;
      max-height: 300px;
      overflow-y: auto;
      background-color: var(--_surface-container);
      border-radius: var(--md-sys-shape-corner-large);
      box-shadow: var(--md-sys-elevation-level2);
      opacity: 0;
      transform: translateY(-6px);
      transform-origin: var(--md-autocomplete-origin-y, top) left;
      transition:
        opacity 0.15s ease,
        transform 0.15s ease;
    }

    .dropdown:popover-open {
      opacity: 1;
      transform: translateY(0);
    }

    .dropdown::backdrop {
      background: transparent;
    }

    .dropdown-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .dropdown-item:hover,
    .dropdown-item.highlighted {
      background-color: rgba(0, 0, 0, 0.06); /* Default light mode */
    }

    .dropdown-item:active {
      opacity: 0.7;
    }

    @media (prefers-color-scheme: dark) {
      .dropdown-item:hover,
      .dropdown-item.highlighted {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    .dropdown-item:last-child {
      border-radius: 0 0 12px 12px;
    }

    .item-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--_on-surface);
    }

    .item-description {
      font-size: 12px;
      color: var(--_on-surface-variant);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-status {
      padding: 16px;
      text-align: center;
      color: var(--_on-surface-variant);
      font-size: 14px;
    }
  `;

  private _handleInput(e: Event) {
    e.stopPropagation();
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
    if (this.options.length > 0 || this.loading) {
      this._showDropdown = true;
    }

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

  private _handleDropdownToggle = (e: ToggleEvent) => {
    if (e.newState === 'open') {
      requestAnimationFrame(() => this._positionDropdown());
    } else {
      this._showDropdown = false;
      this._highlightedIndex = -1;
    }
  };

  private _shouldShowDropdown() {
    return this._showDropdown && (this.options.length > 0 || this.loading);
  }

  private _syncPopover() {
    if (!this.isConnected || !this._dropdown) return;

    const shouldShow = this._shouldShowDropdown();
    const isOpen = this._dropdown.matches(':popover-open');

    if (shouldShow && !isOpen) {
      this._dropdown.showPopover();
      return;
    }

    if (!shouldShow && isOpen) {
      this._dropdown.hidePopover();
    }
  }

  private _positionDropdown() {
    if (!this._input || !this._dropdown) return;

    const inputRect = this._input.getBoundingClientRect();
    const dropdownRect = this._dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const gap = 4;
    const spaceBelow = viewportHeight - inputRect.bottom - margin;
    const spaceAbove = inputRect.top - margin;
    const width = Math.min(inputRect.width, viewportWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(inputRect.left, viewportWidth - width - margin)
    );

    let top = inputRect.bottom + gap;
    let originY = 'top';

    if (dropdownRect.height > spaceBelow && spaceAbove > spaceBelow) {
      top = inputRect.top - dropdownRect.height - gap;
      originY = 'bottom';
    }

    top = Math.max(
      margin,
      Math.min(top, viewportHeight - dropdownRect.height - margin)
    );

    this._dropdown.style.setProperty('--md-autocomplete-origin-y', originY);
    this._dropdown.style.left = `${left}px`;
    this._dropdown.style.top = `${top}px`;
    this._dropdown.style.width = `${width}px`;
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
  }

  render() {
    const showDropdown = this._shouldShowDropdown();

    return html`
      <input
        type="text"
        .value="${this.value}"
        placeholder="${this.placeholder}"
        @input="${this._handleInput}"
        @focus="${this._handleFocus}"
        @blur="${this._handleBlur}"
        @keydown="${this._handleKeyDown}"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="${this._listboxId}"
        aria-activedescendant="${
          showDropdown && this._highlightedIndex >= 0
            ? `${this._listboxId}-opt-${this._highlightedIndex}`
            : ''
        }"
        aria-expanded="${showDropdown ? 'true' : 'false'}"
        aria-haspopup="listbox"
      />
      <div
        class="dropdown"
        role="listbox"
        id="${this._listboxId}"
        popover="auto"
        @toggle=${this._handleDropdownToggle}
      >
        ${
          this.loading
            ? html`<div class="dropdown-status">Loading...</div>`
            : this.options.map(
                (option, index) => html`
                  <div
                    class="dropdown-item ${
                      index === this._highlightedIndex ? 'highlighted' : ''
                    }"
                    id="${this._listboxId}-opt-${index}"
                    role="option"
                    aria-selected="${
                      index === this._highlightedIndex ? 'true' : 'false'
                    }"
                    @click="${() => this._selectOption(option)}"
                    @mouseenter="${() => (this._highlightedIndex = index)}"
                  >
                    <div class="item-label">${option.label}</div>
                    ${
                      option.description
                        ? html`<div class="item-description">
                            ${option.description}
                          </div>`
                        : null
                    }
                  </div>
                `
              )
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-autocomplete': MdAutocomplete;
  }
}
