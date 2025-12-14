import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import './md-icon';

/**
 * Material Design 3 Icon Button Component
 *
 * An icon button is a clickable icon that triggers an action.
 * Supports standard, filled, filled-tonal, and outlined variants.
 *
 * Variants:
 * - `standard` - Transparent background (default)
 * - `filled` - Bold primary color background
 * - `filled-tonal` - Subtle secondary container background
 * - `outlined` - Transparent with border
 *
 * @slot - Default slot for custom icon content
 *
 * @fires click - Standard click event
 *
 * @csspart base - The button's base container
 * @csspart icon - The icon container
 */
@customElement('md-icon-button')
export class MdIconButton extends LitElement {
  /** The name of a built-in icon from the icon library */
  @property({ type: String }) name?: string;

  /** The path/URL to the SVG icon file (used if name is not provided) */
  @property({ type: String }) src?: string;

  /** The label for accessibility */
  @property({ type: String }) label?: string;

  /** Button variant */
  @property({ type: String }) variant:
    | 'standard'
    | 'filled'
    | 'filled-tonal'
    | 'outlined' = 'standard';

  /** Whether the button is disabled */
  @property({ type: Boolean }) disabled = false;

  /** Tooltip text shown on hover */
  @property({ type: String, reflect: true }) override title: string = '';

  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
    }

    .icon-button {
      -webkit-tap-highlight-color: transparent;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 8px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      font-size: 24px;
      outline: none;
    }

    /* Variants */
    .icon-button--standard {
      background: transparent;
    }

    .icon-button--filled {
      background: var(--md-sys-color-primary, var(--sl-color-primary-600));
      color: var(--md-sys-color-on-primary, white);
    }

    .icon-button--filled-tonal {
      background: var(
        --md-sys-color-secondary-container,
        rgba(255, 255, 255, 0.12)
      );
      color: var(
        --md-sys-color-on-secondary-container,
        rgba(255, 255, 255, 0.9)
      );
      backdrop-filter: blur(46px);
      -webkit-backdrop-filter: blur(46px);
    }

    .icon-button--outlined {
      border: 1px solid var(--md-sys-color-outline, rgba(255, 255, 255, 0.12));
    }

    /* Hover states */
    .icon-button:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, white) 8%,
        transparent
      );
    }

    .icon-button--filled:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, var(--sl-color-primary-600)) 92%,
        var(--md-sys-color-on-primary, white) 8%
      );
      box-shadow:
        0px 1px 2px rgba(0, 0, 0, 0.3),
        0px 1px 3px 1px rgba(0, 0, 0, 0.15);
    }

    .icon-button--filled-tonal:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-secondary-container, rgba(255, 255, 255, 0.12)) 92%,
        var(--md-sys-color-on-secondary-container, white) 8%
      );
      box-shadow:
        0px 1px 2px rgba(0, 0, 0, 0.2),
        0px 1px 3px 1px rgba(0, 0, 0, 0.1);
    }

    .icon-button--outlined:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, white) 8%,
        transparent
      );
      border-color: var(--md-sys-color-outline, rgba(255, 255, 255, 0.2));
    }

    /* Active states */
    .icon-button:not(:disabled):active {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, white) 12%,
        transparent
      );
    }

    .icon-button--filled:not(:disabled):active {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, var(--sl-color-primary-600)) 88%,
        var(--md-sys-color-on-primary, white) 12%
      );
    }

    .icon-button--filled-tonal:not(:disabled):active {
      background: color-mix(
        in srgb,
        var(--md-sys-color-secondary-container, rgba(255, 255, 255, 0.12)) 88%,
        var(--md-sys-color-on-secondary-container, white) 12%
      );
    }

    /* Focus state */
    .icon-button:focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600));
      outline-offset: 2px;
    }

    /* Disabled state */
    .icon-button:disabled {
      opacity: 0.38;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Light mode */
    @media (prefers-color-scheme: light) {
      .icon-button {
        color: var(--md-sys-color-on-surface-variant, rgba(0, 0, 0, 0.6));
      }

      .icon-button:not(:disabled):hover {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, black) 8%,
          transparent
        );
      }

      .icon-button--filled-tonal {
        background: var(
          --md-sys-color-secondary-container,
          rgba(0, 0, 0, 0.08)
        );
        color: var(--md-sys-color-on-secondary-container, rgba(0, 0, 0, 0.8));
      }

      .icon-button--outlined {
        border-color: var(--md-sys-color-outline, rgba(0, 0, 0, 0.12));
      }

      .icon-button--outlined:not(:disabled):hover {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, black) 8%,
          transparent
        );
        border-color: var(--md-sys-color-outline, rgba(0, 0, 0, 0.2));
      }

      .icon-button:not(:disabled):active {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, black) 12%,
          transparent
        );
      }
    }

    .icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Custom tooltip styles */
    :host([title]:hover)::after {
      content: attr(title);
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 6px;
      padding: 4px 8px;
      background: var(--md-sys-color-inverse-surface, #313033);
      color: var(--md-sys-color-inverse-on-surface, #f4eff4);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      border-radius: 4px;
      z-index: 10000;
      pointer-events: none;
      opacity: 1;
      animation: tooltipFadeIn 0.15s ease-out;
    }

    :host([title=''])::after,
    :host(:not([title]))::after {
      display: none;
    }

    @keyframes tooltipFadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;

  private handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.click();
    }
  }

  render() {
    const classes = {
      'icon-button': true,
      'icon-button--standard': this.variant === 'standard',
      'icon-button--filled': this.variant === 'filled',
      'icon-button--filled-tonal': this.variant === 'filled-tonal',
      'icon-button--outlined': this.variant === 'outlined',
    };

    return html`
      <button
        part="base"
        class="${Object.entries(classes)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(' ')}"
        ?disabled=${this.disabled}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
        aria-label="${this.label || 'icon button'}"
        title=${ifDefined(this.title || undefined)}
      >
        <div part="icon" class="icon">
          ${this.name
            ? html`<md-icon
                name="${this.name}"
                label="${ifDefined(this.label)}"
              ></md-icon>`
            : this.src
              ? html`<md-icon
                  src="${this.src}"
                  label="${ifDefined(this.label)}"
                ></md-icon>`
              : html`<slot></slot>`}
        </div>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-icon-button': MdIconButton;
  }
}
