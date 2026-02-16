import { LitElement, css, html, svg } from 'lit';
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

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      cursor: inherit;
      outline: none;
    }

    :host([disabled]) {
      opacity: 0.38;
      cursor: not-allowed;
    }

    /* State layer container for hover/press effects */
    .control-wrapper {
      position: relative;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--md-sys-shape-corner-circle);
      flex-shrink: 0;
      margin: -11px; /* Pull back so checkbox doesn't take extra space */
    }

    .state-layer {
      position: absolute;
      inset: 0;
      border-radius: var(--md-sys-shape-corner-circle);
      background: transparent;
      transition: background 0.15s ease;
    }

    .control {
      position: relative;
      width: 18px;
      height: 18px;
      border: 2px solid var(--md-sys-color-on-surface-variant, #938f99);
      border-radius: var(--md-sys-shape-corner-extra-small);
      transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
      background-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host([checked]) .control {
      background-color: var(--md-sys-color-primary, #6750a4);
      border-color: var(--md-sys-color-primary, #6750a4);
    }

    .checkmark {
      width: 12px;
      height: 12px;
      opacity: 0;
      transform: scale(0);
      transition: all 0.12s cubic-bezier(0.2, 0, 0, 1);
    }

    :host([checked]) .checkmark {
      opacity: 1;
      transform: scale(1);
    }

    .checkmark path {
      fill: none;
      stroke: var(--md-sys-color-on-primary, #fff);
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .wrapper:focus-visible .control-wrapper {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: 0;
    }

    /* Hover state layer */
    @media (hover: hover) {
      :host(:not([disabled])) .wrapper:hover .state-layer {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 8%,
          transparent
        );
      }

      :host([checked]:not([disabled])) .wrapper:hover .state-layer {
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 8%,
          transparent
        );
      }
    }

    /* Active/pressed state */
    :host(:not([disabled])) .wrapper:active .state-layer {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 12%,
        transparent
      );
    }

    :host([checked]:not([disabled])) .wrapper:active .state-layer {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 12%,
        transparent
      );
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
        class="wrapper"
        role="checkbox"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        tabindex="${this.disabled ? -1 : 0}"
        @click=${this._onClick}
        @keydown=${this._onKeyDown}
      >
        <div class="control-wrapper">
          <div class="state-layer"></div>
          <div class="control" aria-hidden="true">
            <svg class="checkmark" viewBox="0 0 12 12">
              ${svg`<path d="M2 6 L5 9 L10 3" />`}
            </svg>
          </div>
        </div>
        <slot class="label"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-checkbox': MdCheckbox;
  }
}
