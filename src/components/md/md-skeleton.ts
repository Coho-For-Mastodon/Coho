import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Skeleton Component
 *
 * Minimal loading placeholder for content that's being loaded.
 * Supports different shapes (rectangle, circle) and sizes.
 */
@customElement('md-skeleton')
export class MdSkeleton extends LitElement {
  @property({ type: String }) shape: 'rectangle' | 'circle' = 'rectangle';
  @property({ type: String }) width = '100%';
  @property({ type: String }) height = '1em';

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      overflow: hidden;
      width: 100%;
      height: 1em;
    }

    .skeleton {
      width: 100%;
      height: 100%;
      background: var(
        --md-sys-color-surface-container-highest,
        var(--sl-color-neutral-200)
      );
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }

    .skeleton.circle {
      border-radius: 50%;
    }

    /* Shimmer animation */
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    .skeleton::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--md-sys-color-surface-container-highest, rgba(255, 255, 255, 0.4))
          50%,
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }

    @media (prefers-color-scheme: dark) {
      .skeleton {
        background: var(--md-sys-color-surface-container, #2a2d36);
      }

      .skeleton::after {
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 50%,
          transparent 100%
        );
      }
    }
  `;

  private _applyInlineSize() {
    // Only apply inline sizing when the author explicitly provided attributes.
    // Otherwise, allow CSS (e.g. overlays, component-specific rules) to size us.
    if (this.hasAttribute('width')) {
      this.style.width = this.width;
    } else {
      this.style.removeProperty('width');
    }

    if (this.hasAttribute('height')) {
      this.style.height = this.height;
    } else {
      this.style.removeProperty('height');
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._applyInlineSize();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('width') || changed.has('height')) {
      this._applyInlineSize();
    }
  }

  render() {
    return html` <div class="skeleton ${this.shape}"></div> `;
  }
}
