import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Card Component
 *
 * A card is a container for content and actions on a single topic.
 * Supports elevation, variants (filled, outlined, elevated), and slotted content.
 *
 * @slot - Default slot for card body content
 * @slot header - Card header content
 * @slot footer - Card footer content (typically for actions)
 * @slot image - Card image/media content at the top
 *
 * @fires card-click - Dispatched when card is clicked (if not disabled)
 *
 * @csspart base - The card's base container
 * @csspart header - The header container
 * @csspart body - The body container
 * @csspart footer - The footer container
 */
@customElement('md-card')
export class MdCard extends LitElement {
  /** Card variant: filled, outlined, or elevated */
  @property({ type: String }) variant: 'filled' | 'outlined' | 'elevated' =
    'filled';

  /** Whether the card is clickable/interactive */
  @property({ type: Boolean }) clickable = false;

  /** Whether the card is disabled */
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    .card {
      -webkit-tap-highlight-color: transparent;
      display: flex;
      flex-direction: column;
      background: transparent;
      border-bottom: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
      color: var(--md-sys-color-on-surface, white);
      min-width: 0;
      max-width: 100%;
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none;
      }
    }

    /* Variants */
    .card--filled {
      background: transparent;
    }

    .card--outlined {
      background: transparent;
    }

    .card--elevated {
      background: transparent;
      box-shadow: none;
    }

    /* Clickable state */
    .card--clickable {
      cursor: pointer;
    }

    .card--clickable:not(.card--disabled):hover {
      background: color-mix(
        in srgb,
        transparent 92%,
        var(--md-sys-color-on-surface, white) 8%
      );
    }

    .card--clickable.card--outlined:not(.card--disabled):hover {
      background: color-mix(
        in srgb,
        transparent 92%,
        var(--md-sys-color-on-surface, white) 8%
      );
      border-top-color: var(--md-sys-color-outline, rgba(255, 255, 255, 0.2));
      border-bottom-color: var(
        --md-sys-color-outline,
        rgba(255, 255, 255, 0.2)
      );
    }

    .card--clickable.card--elevated:not(.card--disabled):hover {
      box-shadow: none;
    }

    .card--clickable:not(.card--disabled):active {
      background: color-mix(
        in srgb,
        transparent 88%,
        var(--md-sys-color-on-surface, white) 12%
      );
    }

    /* Disabled state */
    .card--disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    /* Focus state */
    .card--clickable:not(.card--disabled):focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600));
      outline-offset: 2px;
    }

    /* Slots */
    .card__image {
      width: 100%;
      display: block;
    }

    .card__header {
      padding: 16px;
    }

    .card__header:empty {
      display: none;
    }

    .card__body {
      padding: 16px;
      flex: 1;
      min-width: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .card__footer {
      padding: 16px;
      border-top: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card__footer:empty {
      display: none;
    }

    /* Light mode */
    @media (prefers-color-scheme: light) {
      .card {
        background: transparent;
        color: var(--md-sys-color-on-surface, rgba(0, 0, 0, 0.87));
        border-top-color: var(
          --md-sys-color-outline-variant,
          rgba(0, 0, 0, 0.08)
        );
        border-bottom-color: var(
          --md-sys-color-outline-variant,
          rgba(0, 0, 0, 0.08)
        );
      }

      .card--filled {
        background: transparent;
      }

      .card--outlined {
        background: transparent;
      }

      .card--elevated {
        background: transparent;
        box-shadow: none;
      }

      .card--clickable:not(.card--disabled):hover {
        background: color-mix(
          in srgb,
          transparent 92%,
          var(--md-sys-color-on-surface, black) 8%
        );
      }

      .card--clickable.card--outlined:not(.card--disabled):hover {
        background: color-mix(
          in srgb,
          transparent 92%,
          var(--md-sys-color-on-surface, black) 8%
        );
        border-top-color: var(--md-sys-color-outline, rgba(0, 0, 0, 0.2));
        border-bottom-color: var(--md-sys-color-outline, rgba(0, 0, 0, 0.2));
      }

      .card__header,
      .card__footer {
        border-color: var(--md-sys-color-outline-variant, rgba(0, 0, 0, 0.08));
      }
    }

    /* Responsive */
    @media (max-width: 820px) {
      .card__header,
      .card__body,
      .card__footer {
        padding: 12px;
      }
    }
  `;

  private handleClick() {
    if (!this.disabled && this.clickable) {
      this.dispatchEvent(
        new CustomEvent('card-click', {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    const classes = {
      'card': true,
      'card--filled': this.variant === 'filled',
      'card--outlined': this.variant === 'outlined',
      'card--elevated': this.variant === 'elevated',
      'card--clickable': this.clickable,
      'card--disabled': this.disabled,
    };

    return html`
      <div
        part="base"
        class="${Object.entries(classes)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(' ')}"
        @click=${this.handleClick}
        tabindex="${this.clickable && !this.disabled ? '0' : '-1'}"
        role="${this.clickable ? 'button' : 'article'}"
        aria-disabled="${this.disabled}"
      >
        <div class="card__image">
          <slot name="image"></slot>
        </div>

        <div part="header" class="card__header">
          <slot name="header"></slot>
        </div>

        <div part="body" class="card__body">
          <slot></slot>
        </div>

        <div part="footer" class="card__footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-card': MdCard;
  }
}
