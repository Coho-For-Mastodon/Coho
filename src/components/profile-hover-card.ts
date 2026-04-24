import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import type { Account } from '../mastodon/types/account';
import { parseEmojis } from '../utils/emoji-parser';
import { router } from '../router/routes';

/** Global singleton getter — lazily appends to document.body. */
let _instance: ProfileHoverCard | null = null;
export function getProfileHoverCard(): ProfileHoverCard {
  if (!_instance) {
    _instance = document.createElement(
      'profile-hover-card'
    ) as ProfileHoverCard;
    document.body.appendChild(_instance);
  }
  return _instance;
}

/**
 * Floating profile card that appears when hovering @mention links.
 * Uses the Popover API for top-layer rendering (escapes overflow/stacking).
 */
@customElement('profile-hover-card')
export class ProfileHoverCard extends LitElement {
  @property({ type: Object }) account: Account | null = null;
  @property({ type: Boolean }) loading = false;

  @query('.popup') popup!: HTMLDivElement;

  /** Registered by hover utilities so card can cancel pending hide on mouse-enter. */
  private _cancelHide?: () => void;

  static styles = css`
    :host {
      display: contents;
    }

    .popup {
      position: fixed;
      inset: auto;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      overflow: visible;
      width: 300px;
      max-width: calc(100vw - 16px);
      opacity: 0;
      transform: scale(0.95);
      transform-origin: var(--origin-y, top) var(--origin-x, left);
      transition:
        opacity 0.15s cubic-bezier(0.2, 0, 0, 1),
        transform 0.15s cubic-bezier(0.2, 0, 0, 1),
        display 0.15s allow-discrete,
        overlay 0.15s allow-discrete;
      transition-behavior: allow-discrete;
    }

    .popup:popover-open {
      opacity: 1;
      transform: scale(1);
    }

    @starting-style {
      .popup:popover-open {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    .popup::backdrop {
      background: transparent;
    }

    .card {
      background: var(--md-sys-color-surface-container-high, #2b2b36);
      border-radius: var(--md-sys-shape-corner-large, 16px);
      padding: 16px;
      box-shadow:
        0 4px 8px 3px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: var(--md-sys-shape-corner-circle, 9999px);
      border: 2px solid var(--md-sys-color-primary);
      flex-shrink: 0;
      object-fit: cover;
    }

    .avatar-skeleton {
      width: 48px;
      height: 48px;
      border-radius: var(--md-sys-shape-corner-circle, 9999px);
      background: var(--md-sys-color-surface-container-highest, #3b3b46);
      flex-shrink: 0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    .name-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .display-name {
      font-weight: 600;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--md-sys-color-on-surface);
    }

    .acct {
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bio {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .bio a {
      color: var(--md-sys-color-primary);
      text-decoration: none;
    }

    .bio a:hover {
      text-decoration: underline;
    }

    .stats {
      display: flex;
      gap: 16px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-value {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--md-sys-color-on-surface);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
    }

    .view-profile-btn {
      background: none;
      border: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.2));
      border-radius: var(--md-sys-shape-corner-full, 9999px);
      padding: 6px 14px;
      color: var(--md-sys-color-primary);
      font-size: 0.85rem;
      cursor: pointer;
      align-self: flex-start;
      transition: background 0.15s;
      font-family: inherit;
    }

    .view-profile-btn:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary) 12%,
        transparent
      );
    }

    .skeleton-line {
      height: 12px;
      border-radius: 6px;
      background: var(--md-sys-color-surface-container-highest, #3b3b46);
      animation: pulse 1.5s ease-in-out infinite;
    }
  `;

  /**
   * Provide a callback that the card will call on mouseenter to cancel
   * any pending hide timer managed by the hover utilities.
   */
  registerCancelHide(fn: () => void) {
    this._cancelHide = fn;
  }

  /** Show the card anchored below (or above) the given anchor element. */
  showAt(anchor: HTMLElement) {
    if (!this.popup) return;
    const rect = anchor.getBoundingClientRect();
    const alreadyOpen = this.popup.matches(':popover-open');

    if (!alreadyOpen) {
      // Position off-screen before showing to avoid a visible flash at 0,0
      this.popup.style.top = '-9999px';
      this.popup.style.left = '-9999px';
      try {
        this.popup.showPopover();
      } catch {
        // Popover API not supported — graceful degradation
      }
    }

    requestAnimationFrame(() => this._positionAt(rect));
  }

  hide() {
    if (!this.popup) return;
    try {
      this.popup.hidePopover();
    } catch {
      // Already hidden or not supported
    }
  }

  private _positionAt(rect: DOMRect) {
    if (!this.popup) return;
    const popupRect = this.popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const gap = 8;

    // Prefer below; flip to above if not enough space
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    let originY: string;

    if (spaceBelow >= popupRect.height || spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
      originY = 'top';
    } else {
      top = rect.top - popupRect.height - gap;
      originY = 'bottom';
    }

    // Left-align with anchor; flip if it would overflow right edge
    let left = rect.left;
    const wouldOverflowRight = left + popupRect.width > vw - margin;
    const originX = wouldOverflowRight ? 'right' : 'left';
    if (wouldOverflowRight) {
      left = rect.right - popupRect.width;
    }

    left = Math.max(margin, Math.min(left, vw - popupRect.width - margin));
    top = Math.max(margin, Math.min(top, vh - popupRect.height - margin));

    this.popup.style.setProperty('--origin-y', originY);
    this.popup.style.setProperty('--origin-x', originX);
    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  private _onCardMouseEnter = () => {
    // Cancel any pending hide timer so card stays open
    this._cancelHide?.();
  };

  private _onCardMouseLeave = () => {
    this.hide();
  };

  private _viewProfile() {
    if (!this.account) return;
    this.hide();
    router.navigate(`/account?id=${this.account.id}`);
  }

  render() {
    return html`
      <div
        class="popup"
        popover="manual"
        @mouseenter="${this._onCardMouseEnter}"
        @mouseleave="${this._onCardMouseLeave}"
      >
        ${this.loading ? this._renderSkeleton() : this._renderAccount()}
      </div>
    `;
  }

  private _renderSkeleton() {
    return html`
      <div class="card">
        <div class="header">
          <div class="avatar-skeleton"></div>
          <div class="name-block" style="flex:1">
            <div class="skeleton-line" style="width:70%"></div>
            <div class="skeleton-line" style="width:50%;margin-top:4px"></div>
          </div>
        </div>
        <div class="skeleton-line" style="width:100%"></div>
        <div class="skeleton-line" style="width:80%"></div>
      </div>
    `;
  }

  private _renderAccount() {
    if (!this.account) return nothing;
    const { account } = this;
    const acctDisplay = `@${account.acct}`;

    return html`
      <div class="card">
        <div class="header">
          <img
            class="avatar"
            src="${account.avatar_static || account.avatar}"
            alt="${account.display_name}"
            loading="lazy"
          />
          <div class="name-block">
            <span
              class="display-name"
              .innerHTML="${parseEmojis(account.display_name, account.emojis)}"
            ></span>
            <span class="acct">${acctDisplay}</span>
          </div>
        </div>

        ${account.note
          ? html`<div
              class="bio"
              .innerHTML="${parseEmojis(account.note, account.emojis)}"
            ></div>`
          : nothing}

        <div class="stats">
          <div class="stat">
            <span class="stat-value"
              >${account.followers_count.toLocaleString()}</span
            >
            <span class="stat-label">${msg('Followers')}</span>
          </div>
          <div class="stat">
            <span class="stat-value"
              >${account.following_count.toLocaleString()}</span
            >
            <span class="stat-label">${msg('Following')}</span>
          </div>
          <div class="stat">
            <span class="stat-value"
              >${account.statuses_count.toLocaleString()}</span
            >
            <span class="stat-label">${msg('Posts')}</span>
          </div>
        </div>

        <button class="view-profile-btn" @click="${this._viewProfile}">
          ${msg('View profile')}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-hover-card': ProfileHoverCard;
  }
}
