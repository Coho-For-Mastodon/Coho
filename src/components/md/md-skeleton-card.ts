import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Material Design 3 Skeleton Card Component
 *
 * Minimal loading placeholder for timeline items.
 */
@customElement('md-skeleton-card')
export class MdSkeletonCard extends LitElement {
  @property({ type: Number }) count = 1;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .skeleton-card {
      background: var(
        --md-sys-color-surface-container,
        var(--sl-panel-background-color)
      );
      border-radius: var(--md-sys-shape-corner-medium);
      height: 280px;
      margin-bottom: 10px;
      border: 1px solid
        var(--md-sys-color-outline-variant, rgba(121, 116, 126, 0.3));
      position: relative;
      overflow: hidden;
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

    .skeleton-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--md-sys-color-surface-container-highest, rgba(255, 255, 255, 0.1))
          50%,
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }

    @media (prefers-color-scheme: dark) {
      .skeleton-card {
        background: var(--md-sys-color-surface-container, #1c1b1f);
        border-color: var(
          --md-sys-color-outline-variant,
          rgba(202, 196, 208, 0.3)
        );
      }

      .skeleton-card::after {
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.05) 50%,
          transparent 100%
        );
      }
    }

    @media (max-width: 820px) {
      .skeleton-card {
        border-radius: var(--md-sys-shape-corner-none);
        height: 250px;
      }
    }
  `;

  renderSkeletonCard() {
    return html` <div class="skeleton-card"></div> `;
  }

  render() {
    return html`
      ${Array.from({ length: this.count }, () => this.renderSkeletonCard())}
    `;
  }
}
