import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Switch
 * Accessible toggle control with MD3 colors, motion, and states.
 */
@customElement('md-switch')
export class MdSwitch extends LitElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

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
      width: 52px;
      height: 32px;
      border-radius: var(--md-sys-shape-corner-full, 9999px);
      transition:
        background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
        border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
      border: 2px solid var(--md-sys-color-outline, #79747e);
      box-sizing: border-box;
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

    .thumb {
      position: absolute;
      top: 6px;
      left: 6px;
      width: 16px;
      height: 16px;
      border-radius: var(--md-sys-shape-corner-circle);
      background: var(--md-sys-color-outline, #79747e);
      transition:
        transform 0.2s cubic-bezier(0.2, 0, 0, 1),
        width 0.15s cubic-bezier(0.2, 0, 0, 1),
        height 0.15s cubic-bezier(0.2, 0, 0, 1),
        top 0.15s cubic-bezier(0.2, 0, 0, 1),
        left 0.15s cubic-bezier(0.2, 0, 0, 1),
        background-color 0.2s;
    }

    :host([checked]) .thumb {
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      transform: translateX(20px);
      background: var(--md-sys-color-on-primary, #ffffff);
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .control:focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      outline-offset: 3px;
    }

    .label {
      font-size: var(--md-sys-typescale-body-large-font-size, 16px);
      font-weight: 400;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    @media (prefers-color-scheme: dark) {
      .control {
        background-color: var(
          --md-sys-color-surface-container-highest,
          #36343b
        );
        border-color: var(--md-sys-color-outline, #938f99);
      }
      .thumb {
        background: var(--md-sys-color-outline, #938f99);
      }
      :host([checked]) .thumb {
        background: var(--md-sys-color-on-primary, #381e72);
      }
      .label {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }
    }
  `;

  private _onClick(e: MouseEvent) {
    if (this.disabled) return;
    this.checked = !this.checked;
    import('../../utils/haptics')
      .then((m) => m.hapticSelection())
      .catch(() => {});
    this._emitChange(e);
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.checked = !this.checked;
      import('../../utils/haptics')
        .then((m) => m.hapticSelection())
        .catch(() => {});
      this._emitChange(e);
    }
  }

  private _emitChange(originalEvent: Event) {
    const detail = { checked: this.checked, originalEvent };
    this.dispatchEvent(
      new CustomEvent('change', { bubbles: true, composed: true, detail })
    );
    // Shoelace compatibility
    this.dispatchEvent(
      new CustomEvent('sl-change', { bubbles: true, composed: true, detail })
    );
  }

  private _labelId = `md-sw-label-${Math.random().toString(36).slice(2, 9)}`;

  render() {
    return html`
      <div
        class="control"
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        aria-labelledby="${this._labelId}"
        tabindex="${this.disabled ? -1 : 0}"
        @click=${this._onClick}
        @keydown=${this._onKeyDown}
      >
        <div class="thumb"></div>
      </div>
      <span id="${this._labelId}"><slot class="label"></slot></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-switch': MdSwitch;
  }
}
