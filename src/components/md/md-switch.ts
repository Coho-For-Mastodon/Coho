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
      border-radius: var(--md-sys-shape-corner-large);
      transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
      background-color: var(
        --md-switch-track,
        color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 12%,
          transparent
        )
      );
    }

    :host([checked]) .control {
      background-color: var(
        --md-sys-color-primary,
        var(--sl-color-primary-600, #6750a4)
      );
    }

    .thumb {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 24px;
      height: 24px;
      border-radius: var(--md-sys-shape-corner-circle);
      background: var(--md-sys-color-surface, #fef7ff);
      box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.3),
        0 1px 3px 1px rgba(0, 0, 0, 0.15);
      transition:
        transform 0.2s cubic-bezier(0.2, 0, 0, 1),
        background-color 0.2s;
    }

    :host([checked]) .thumb {
      transform: translateX(20px);
      background: var(--md-sys-color-on-primary, #ffffff);
    }

    .control:focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      outline-offset: 3px;
      border-radius: var(--md-sys-shape-corner-large);
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
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #e6e1e5) 12%,
          transparent
        );
      }
      .thumb {
        background: var(--md-sys-color-surface, #1d1b20);
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
