import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Checkbox
 * Accessible checkbox control with MD3 colors, motion, and states.
 */
@customElement('md-checkbox')
export class MdCheckbox extends LitElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) value = '';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    :host([disabled]) {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .control {
      position: relative;
      width: 18px;
      height: 18px;
      border: 2px solid var(--md-sys-color-on-surface-variant, #49454f);
      border-radius: 2px;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      background-color: transparent;
      flex-shrink: 0;
    }

    :host([checked]) .control {
      background-color: var(
        --md-sys-color-primary,
        var(--sl-color-primary-600, #6750a4)
      );
      border-color: var(
        --md-sys-color-primary,
        var(--sl-color-primary-600, #6750a4)
      );
    }

    .checkmark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: 10px;
      height: 10px;
      opacity: 0;
      transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
    }

    :host([checked]) .checkmark {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }

    .checkmark::before,
    .checkmark::after {
      content: '';
      position: absolute;
      background-color: var(--md-sys-color-on-primary, #ffffff);
      border-radius: 1px;
    }

    .checkmark::before {
      width: 2px;
      height: 6px;
      bottom: 2px;
      left: 3px;
      transform: rotate(-45deg);
    }

    .checkmark::after {
      width: 2px;
      height: 10px;
      bottom: 0;
      right: 1px;
      transform: rotate(45deg);
    }

    .control:focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* Hover state */
    @media (hover: hover) {
      :host(:not([disabled])) .control:hover {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 8%,
          transparent
        );
      }

      :host([checked]:not([disabled])) .control:hover {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 92%,
          black
        );
      }
    }

    .label {
      font:
        400 14px/20px system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    @media (prefers-color-scheme: dark) {
      .control {
        border-color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .label {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }
    }
  `;

  private _onClick(e: MouseEvent) {
    if (this.disabled) return;
    this.checked = !this.checked;
    this._emitChange(e);
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.checked = !this.checked;
      this._emitChange(e);
    }
  }

  private _emitChange(originalEvent: Event) {
    const detail = { checked: this.checked, value: this.value, originalEvent };
    this.dispatchEvent(
      new CustomEvent('change', { bubbles: true, composed: true, detail })
    );
  }

  render() {
    return html`
      <div
        class="control"
        role="checkbox"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        tabindex="${this.disabled ? -1 : 0}"
        @click=${this._onClick}
        @keydown=${this._onKeyDown}
      >
        <div class="checkmark"></div>
      </div>
      <slot class="label"></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-checkbox': MdCheckbox;
  }
}
