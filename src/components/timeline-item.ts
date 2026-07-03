import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { msg, str } from '@lit/localize';

import {
  getSettings,
  Settings,
  SETTINGS_CHANGED_EVENT,
} from '../services/settings';
import { getCurrentUser } from '../services/account';
import {
  toggleStatusAction,
  shareStatus as shareStatusAction,
  showGuestActionToast,
} from '../utils/timeline-actions';

import { Post } from '../interfaces/Post';
import type { Account } from '../mastodon/types';
import {
  renderSensitive,
  renderRegularTweet,
  renderReblog,
  renderThread,
  renderThreadAncestors,
  TimelineItemHandlers,
  TimelineItemState,
} from './timeline-renderers';
import type { ReportSubmitDetail } from './report-dialog';
import { handleStatusContentClick } from '../utils/content-links';

@customElement('timeline-item')
export class TimelineItem extends LitElement {
  @property({ type: Object }) tweet: Post | undefined;
  @property({ type: Boolean }) show: boolean = false;
  @property({ type: Boolean }) showreply: boolean = false;
  @property({ type: Boolean }) guestMode: boolean = false;
  @property({ type: Boolean, reflect: true }) focused: boolean = false;
  @property({ type: Boolean }) allowPin: boolean = false;
  @property({ type: Array }) filterTitles: string[] = [];

  @state() private _filterRevealed: boolean = false;
  @state() isBoosted: boolean = false;
  @state() isReblogged: boolean = false;
  @state() isBookmarked: boolean = false;
  @state() isMuted: boolean = false;
  @state() threadExpanded: boolean = false;
  @state() threadPosts: Post[] = [];
  @state() loadingThread: boolean = false;

  /** Number of ancestor posts at the start of threadPosts. */
  private _ancestorCount: number = 0;

  @state() settings: Settings | undefined;

  @state() currentUser: Account | null = null;

  @state() showReportDialog: boolean = false;
  @state() reportAccountId: string = '';
  @state() reportAccountAcct: string = '';
  @state() reportStatusId: string | undefined;
  @state() isOnDeviceTranslateAvailable: boolean = false;

  private _handleSettingsChanged = (event: Event) => {
    const detail = (event as CustomEvent<Settings>).detail;
    if (!detail) return;
    this.settings = detail;
  };

  device: 'mobile' | 'desktop' = 'mobile';

  static styles = [
    css`
      :host {
        display: block;

        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;

        margin-bottom: 0;
        -webkit-tap-highlight-color: transparent;
        outline: none;
      }

      .thread-connector-bar {
        width: 100%;
        background: var(--md-sys-color-primary);
        height: 8px;
        border-radius: 8px;
        margin-left: 20px;
      }

      :host([focused]) md-card {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: 2px;
      }

      :host(:focus-visible) md-card {
        outline: 2px solid var(--md-sys-color-primary, #6750a4);
        outline-offset: 2px;
      }

      * {
        box-sizing: border-box;
      }

      md-card {
        content-visibility: auto;
        contain-intrinsic-size: auto 400px;

        animation-name: slideUp;
        animation-duration: 0.3s;
        animation-fill-mode: forwards;

        cursor: pointer;

        border-radius: var(--md-sys-shape-corner-medium);
        overflow: hidden;

        width: auto;

        overflow-x: hidden;
      }

      md-card::part(base) {
        transition:
          background 0.2s ease,
          border-color 0.2s ease;
        padding-left: 10px;
        padding-right: 10px;
        padding-top: 0px;
        background: var(--md-sys-color-surface-container, #1e1e24);
      }

      :host(:hover) md-card::part(base) {
        border-color: var(--md-sys-color-outline-variant, #2b2930);
      }

      image-grid {
        margin-left: -12px;
        margin-right: -12px;
        width: calc(100% + 24px);
        display: block;
        margin-top: 12px;
        margin-bottom: 12px;
      }

      md-card::part(header) {
        padding: 0;
        padding-top: 12px;
      }

      md-card::part(body) {
        padding: 12px;
        padding-top: 8px;
      }

      md-card::part(footer) {
        padding-left: 0;
        padding-bottom: 12px;
      }

      .boost-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin: -10px -10px 10px -10px;
        background: transparent;
        border: none;
        outline: none;
        border-radius: var(--md-sys-shape-corner-medium)
          var(--md-sys-shape-corner-medium) 0 0;
        font-size: var(--md-sys-typescale-body-small-font-size);
        color: var(--md-sys-color-on-surface-variant, #c4c4c4);
        cursor: pointer;
      }

      .boost-indicator:hover {
        background: var(--md-sys-color-surface-container-highest, #353539);
      }

      .boost-indicator md-icon {
        color: var(--md-sys-color-primary, var(--sl-color-primary-600));
        font-size: 16px;
      }

      .boost-indicator img {
        width: 20px;
        height: 20px;
        border-radius: var(--md-sys-shape-corner-circle);
        border: 1px solid var(--md-sys-color-outline-variant, #444);
      }

      .boost-indicator .booster-name {
        font-weight: 500;
        color: var(--md-sys-color-on-surface, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }

      .boosted-by {
        flex: 2;
      }

      .boosted-by span {
        font-size: var(--md-sys-typescale-body-small-font-size);

        margin-bottom: 6px;
        display: block;
      }

      .sensitive {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        padding: 24px 20px 20px;
        border-radius: var(--md-sys-shape-corner-large, 16px);
        background: var(--md-sys-color-surface-container-high, rgb(36 36 40));
        border: 1px solid
          color-mix(
            in srgb,
            var(--md-sys-color-outline-variant, #49454f) 45%,
            transparent
          );
      }

      .sensitive-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(
          --md-sys-color-secondary-container,
          rgba(255, 255, 255, 0.08)
        );
        color: var(--md-sys-color-on-secondary-container, #cac4d0);
        margin-bottom: 2px;
      }

      .sensitive-icon md-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .sensitive-title {
        font-weight: 500;
        font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
        line-height: 1.25;
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .sensitive-text {
        margin: 0;
        max-width: 340px;
        font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
        line-height: 1.4;
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .sensitive-text--muted {
        font-style: italic;
        opacity: 0.75;
      }

      .sensitive-action {
        margin-top: 6px;
      }

      /* Legacy fallbacks for any remaining markup */
      .sensitive > span {
        font-weight: 500;
        font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .sensitive > p {
        margin: 0;
        max-width: 340px;
        font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .filter-warning {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 22px;
        background: var(--md-sys-color-surface-container, rgb(32, 32, 35));
        border-radius: var(--md-sys-shape-corner-small);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
        cursor: default;
      }

      .filter-warning-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* === Link card: compact horizontal (no image) === */
      .link-card {
        display: flex;
        align-items: stretch;
        background: #ffffff0d;
        border-radius: var(--md-sys-shape-corner-small);
        overflow: hidden;
        margin-top: 10px;
        cursor: pointer;
        height: auto;
        gap: 10px;
        border: 1px solid
          color-mix(
            in srgb,
            var(--md-sys-color-outline-variant, #2b2930) 60%,
            transparent
          );
      }

      .link-card:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .link-card h4 {
        margin-bottom: 4px;
        margin-top: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 18px;
      }

      .link-card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 60px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
      }

      .link-card-icon img {
        width: 24px;
        height: 24px;
        opacity: 0.6;
        background: transparent;
      }

      .link-card-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 10px 12px;
        flex: 1;
        min-width: 0;
      }

      .link-card p {
        margin: 0;
        font-size: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--md-sys-color-on-surface-variant);
      }

      .link-card-provider {
        font-size: 11px;
        color: var(--md-sys-color-on-surface-variant, #938f99);
        margin-top: 4px;
      }

      /* === Link card: large vertical (with image) === */
      .link-card--large {
        flex-direction: column;
        gap: 0;
      }

      .link-card--large .link-card-hero {
        width: 100%;
        height: auto;
        max-height: 200px;
        object-fit: cover;
        border-radius: 0;
        padding: 0;
        min-width: unset;
        display: block;
        background: rgba(255, 255, 255, 0.04);
      }

      .link-card--large .link-card-content {
        padding: 12px 14px;
      }

      .link-card--large h4 {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      @media (prefers-color-scheme: light) {
        .link-card {
          background: rgba(0, 0, 0, 0.05);
          border-color: color-mix(
            in srgb,
            var(--md-sys-color-outline-variant, #cac4d0) 60%,
            transparent
          );
        }

        .link-card:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .link-card-icon {
          background: rgba(0, 0, 0, 0.04);
        }

        .sensitive {
          background: var(
            --md-sys-color-surface-container-high,
            rgb(243 243 247)
          );
          border-color: color-mix(
            in srgb,
            var(--md-sys-color-outline-variant, #cac4d0) 60%,
            transparent
          );
        }

        .sensitive-icon {
          background: var(
            --md-sys-color-secondary-container,
            rgba(0, 0, 0, 0.06)
          );
          color: var(--md-sys-color-on-secondary-container, #1d1b20);
        }
      }

      .header-actions-block {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-actions-block div {
        display: flex;
        align-items: center;
      }

      .header-actions-block span {
        color: #878792;
        font-size: var(--md-sys-typescale-body-medium-font-size);
      }

      .edited-indicator {
        display: inline-block;
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #878792);
        margin-top: 4px;
        background: none;
        border: none;
        padding: 0;
        font-family: inherit;
        cursor: pointer;
      }

      .edited-indicator:hover {
        text-decoration: underline;
        color: var(--md-sys-color-primary, var(--sl-color-primary-600));
      }

      img[data-src] {
        opacity: 0;
      }

      img {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }

      .status-link-card {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 10px;
        background: rgb(255 255 255 / 11%);
        border-radius: var(--md-sys-shape-corner-small);
        padding: 10px;
      }

      .status-link-card a {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 10px;
      }

      .status-link-card img {
        width: 100%;
        max-width: 300px;
        border-radius: var(--md-sys-shape-corner-small);
        height: initial;
      }

      .status-link-card__content p {
        margin-top: 6px;

        white-space: nowrap;
        max-width: 40vw;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-link-card__title {
        padding: 0;
        margin: 0;
      }

      md-card a {
        color: var(--sl-color-secondary-700);
      }

      md-card img {
        object-fit: cover;
        border-radius: var(--md-sys-shape-corner-small)
          var(--md-sys-shape-corner-small) 0 0;
      }

      .header-block {
        display: flex;
        align-items: center;
        gap: 14px;
        justify-content: space-between;
      }

      .header-block img {
        height: 62px;
        border-radius: var(--md-sys-shape-corner-circle);
      }

      .header-block h4 {
        margin-bottom: 0;
      }

      .actions {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
      }

      .actions md-button {
        background: transparent;
        border: none;
        font-size: 1.2em;
        color: grey;
      }

      img {
        background: #ffffff4f;
      }

      @media (prefers-color-scheme: dark) {
        img {
          background: rgb(24 25 31);
        }
      }

      md-card::part(footer) {
        border-top: none;
      }

      .replyCard {
        margin-left: 15px;
        width: calc(100% - 15px);
        max-width: calc(100% - 15px);
        min-width: 0;
      }

      #reply-to {
        height: 33px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        color: var(--primary-color);
        margin-top: 0px;
        margin-bottom: 0px;

        font-size: var(--md-sys-typescale-body-medium-font-size);
        gap: 8px;
      }

      .thread-continuation {
        margin-left: 16px;
        padding-left: 20px;
        border-left: 3px solid var(--sl-color-primary-600);
        margin-top: 8px;
        min-width: 0;
      }

      .thread-continuation md-card {
        margin-bottom: 8px;
        min-width: 0;
      }

      /* Ensure content in cards doesn't overflow */
      md-card {
        min-width: 0;
        max-width: 100%;
      }

      md-card div {
        word-wrap: break-word;
        overflow-wrap: break-word;
        word-break: break-word;
        min-width: 0;
      }

      /* === Connected thread card styles === */

      /* Connector bar between connected cards — sits in normal flow */

      .thread-connector-line {
        width: 2px;
        min-height: 24px;
        /* 11px bar padding-left + 30px = 41px from card left edge,
           matching avatar center (16px card padding + 25px = half of 50px avatar) */
        margin-left: 30px;
        background: var(--md-sys-color-outline, #938f99);
        border-radius: 1px;
        flex-shrink: 0;
      }

      /* Connected thread cards: radius is handled inside md-card via :host([connected-top/bottom]) */

      .thread-continuation-card {
        cursor: pointer;
      }

      .thread-show-more {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        color: var(--md-sys-color-on-primary-container, #fff);
        font-size: var(--md-sys-typescale-label-large-font-size, 14px);
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 18%,
          var(--md-sys-color-surface-container, #1e1e24)
        );
        border: 1px solid
          color-mix(
            in srgb,
            var(--md-sys-color-primary, #6750a4) 40%,
            transparent
          );
        border-top: none;
        border-radius: 0 0 var(--md-sys-shape-corner-medium)
          var(--md-sys-shape-corner-medium);
        transition: background 0.15s ease;
      }

      .thread-show-more:hover {
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #6750a4) 28%,
          var(--md-sys-color-surface-container, #1e1e24)
        );
      }

      .thread-line {
        width: 3px;
        background: var(--sl-color-primary-600);
        margin-left: 8px;
        height: 16px;
      }

      @media (prefers-color-scheme: light) {
        .thread-show-more {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary, #6750a4) 12%,
            var(--md-sys-color-surface-container, #f3f3f3)
          );
          color: var(--md-sys-color-primary, #6750a4);
          border-color: color-mix(
            in srgb,
            var(--md-sys-color-primary, #6750a4) 30%,
            transparent
          );
        }

        .thread-show-more:hover {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary, #6750a4) 22%,
            var(--md-sys-color-surface-container, #f3f3f3)
          );
        }
      }

      @media (max-width: 820px) {
        .timeline-item {
          border-radius: var(--md-sys-shape-corner-none);
        }

        .actions {
          width: 100%;
        }

        .boost-indicator .booster-name {
          max-width: 100px;
        }

        md-card::part(footer) {
          padding-left: 12px;
          padding-bottom: 12px;
        }

        md-card::part(base) {
          padding-left: 6px;
          padding-right: 6px;
          background: transparent;
        }
      }

      @media (prefers-color-scheme: light) {
        #reply-to {
          color: black;
        }

        .boost-indicator {
          color: var(--md-sys-color-on-surface-variant, #5a5a5a);
        }

        .boost-indicator:hover {
          background: var(--md-sys-color-surface-container-highest, #dcdce0);
        }

        .boost-indicator .booster-name {
          color: var(--md-sys-color-on-surface, #1c1c1c);
        }
      }

      @keyframes slideUp {
        0% {
          transform: translateY(30px);
          opacity: 0;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .quote-placeholder {
        padding: 12px 16px;
        font-style: italic;
        color: var(--md-sys-color-on-surface-variant, #938f99);
        font-size: 0.875rem;
      }

      /* Hide Mastodon fallback "RE:" inline quote links */
      .quote-inline {
        display: none !important;
      }

      /* Extracted from inline styles in timeline-renderers.ts */
      .link-card-link {
        text-decoration: none;
        color: inherit;
        display: block;
      }

      .button-reset {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        width: 100%;
      }
    `,
  ];

  async showThread() {
    if (!this.tweet?.in_reply_to_id) return;

    this.loadingThread = true;
    try {
      const { getReplies } = await import('../services/timeline');
      const context = await getReplies(this.tweet.id);

      // Combine ancestors and descendants, removing the current post
      const ancestors = context.ancestors || [];
      const descendants = context.descendants || [];

      // Filter out the immediate parent post if it's already shown via reply_to
      // to avoid displaying the same post twice
      const replyToId = this.tweet.reply_to?.id || this.tweet.in_reply_to_id;
      const filteredAncestors = ancestors.filter(
        (post: Post) => post.id !== replyToId
      );

      this._ancestorCount = filteredAncestors.length;
      this.threadPosts = [...filteredAncestors, ...descendants];
      this.threadExpanded = true;
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      this.loadingThread = false;
    }
  }

  async firstUpdated() {
    this.settings = await getSettings();
    this.currentUser = (await getCurrentUser()) ?? null;
    const { isOnDeviceTranslationAvailable } = await import('../services/ai');
    this.isOnDeviceTranslateAvailable = isOnDeviceTranslationAvailable();

    // Add keyboard event listener for when this item is focused
    this.addEventListener('keydown', this._handleKeydown);
    window.addEventListener(
      SETTINGS_CHANGED_EVENT,
      this._handleSettingsChanged
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    window.removeEventListener(
      SETTINGS_CHANGED_EVENT,
      this._handleSettingsChanged
    );
  }

  updated(changed: PropertyValues) {
    if (changed.has('tweet')) {
      this._filterRevealed = false;
    }
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    // Only handle if this item is focused
    if (!this.focused || !this.tweet) return;

    const postId = this.tweet.reblog?.id || this.tweet.id;

    switch (event.key) {
      case 'Enter':
      case 'o':
        // Open post
        event.preventDefault();
        this.openPost();
        break;
      case 'r':
        // Reply
        event.preventDefault();
        this.replies();
        break;
      case 'b':
        // Boost/reblog
        event.preventDefault();
        this.reblog(postId);
        break;
      case 'f':
        // Favorite
        event.preventDefault();
        this.favorite(postId);
        break;
      case 's':
        // Bookmark (s = save)
        event.preventDefault();
        this.bookmark(postId);
        break;
      case 'x':
        // Expand thread
        event.preventDefault();
        this.showThread();
        break;
      case 'm':
        // Mute/unmute conversation
        event.preventDefault();
        this.muteConversation();
        break;
      case 'q':
        // Quote post
        event.preventDefault();
        this.quotePost(this.tweet.reblog || this.tweet);
        break;
      default:
        break;
    }
  };

  /**
   * Find a post by ID in thread_continuation or threadPosts arrays.
   * Returns undefined if the id matches the main tweet (callers handle that case).
   */
  private findThreadPost(id: string): Post | undefined {
    if (this.tweet?.thread_continuation) {
      const found = this.tweet.thread_continuation.find((p) => p.id === id);
      if (found) return found;
    }
    return this.threadPosts.find((p) => p.id === id);
  }

  async favorite(id: string) {
    if (!this.tweet) return;

    const isMainTweet = id === this.tweet.id || id === this.tweet.reblog?.id;
    const threadPost = !isMainTweet ? this.findThreadPost(id) : undefined;

    // Check current state (optimistic or actual)
    // Note: isBoosted here refers to the "favorited" state (legacy naming issue)
    const currentlyFavorited = isMainTweet
      ? this.isBoosted || this.tweet.favourited
      : !!threadPost?.favourited;

    // Store original state for rollback
    const originalFavorited = this.isBoosted;
    const originalTweetFavorited = this.tweet.favourited;
    const originalCount = this.tweet.reblog
      ? this.tweet.reblog.favourites_count
      : this.tweet.favourites_count;
    const originalThreadFavorited = threadPost?.favourited;
    const originalThreadCount = threadPost?.favourites_count;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'like posts',
      isActive: currentlyFavorited,
      errorMessageDo: 'Failed to favorite post.',
      errorMessageUndo: 'Failed to un-favorite post.',

      onOptimisticUpdate: (active) => {
        if (isMainTweet) {
          this.isBoosted = active;
          if (this.tweet) {
            this.tweet.favourited = active;
            const delta = active ? 1 : -1;
            const target = this.tweet.reblog || this.tweet;
            target.favourites_count = Math.max(
              0,
              target.favourites_count + delta
            );
          }
        } else if (threadPost) {
          threadPost.favourited = active;
          threadPost.favourites_count = Math.max(
            0,
            (threadPost.favourites_count || 0) + (active ? 1 : -1)
          );
        }
        this.requestUpdate();
      },

      doApiCall: async () => {
        const { boostPost } = await import('../services/timeline');
        return boostPost(id);
      },

      undoApiCall: async () => {
        const { unboostPost } = await import('../services/timeline');
        return unboostPost(id);
      },

      onRollback: () => {
        if (isMainTweet) {
          this.isBoosted = originalFavorited;
          if (this.tweet) {
            this.tweet.favourited = originalTweetFavorited;
            const target = this.tweet.reblog || this.tweet;
            target.favourites_count = originalCount;
          }
        } else if (threadPost) {
          threadPost.favourited = originalThreadFavorited ?? false;
          threadPost.favourites_count = originalThreadCount ?? 0;
        }
        this.requestUpdate();
      },
    });

    // Invalidate favorites preload cache so the favorites tab shows fresh data
    const { invalidatePreloadCache } = await import('../services/preload');
    invalidatePreloadCache('favorites');

    // fire custom event
    this.dispatchEvent(
      new CustomEvent('favorite', {
        detail: {
          id,
        },
      })
    );
  }

  async reblog(id: string) {
    if (!this.tweet) return;

    const isMainTweet = id === this.tweet.id || id === this.tweet.reblog?.id;
    const threadPost = !isMainTweet ? this.findThreadPost(id) : undefined;

    // Check current state (optimistic or actual)
    const currentlyReblogged = isMainTweet
      ? this.isReblogged || this.tweet.reblogged
      : !!threadPost?.reblogged;

    // Store original state for rollback
    const originalReblogged = this.isReblogged;
    const originalTweetReblogged = this.tweet.reblogged;
    const originalCount = this.tweet.reblog
      ? this.tweet.reblog.reblogs_count
      : this.tweet.reblogs_count;
    const originalThreadReblogged = threadPost?.reblogged;
    const originalThreadCount = threadPost?.reblogs_count;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'boost posts',
      isActive: currentlyReblogged,
      errorMessageDo: 'Failed to boost post.',
      errorMessageUndo: 'Failed to un-boost post.',

      onOptimisticUpdate: (active) => {
        if (isMainTweet) {
          this.isReblogged = active;
          if (this.tweet) {
            this.tweet.reblogged = active;
            const delta = active ? 1 : -1;
            const target = this.tweet.reblog || this.tweet;
            target.reblogs_count = Math.max(0, target.reblogs_count + delta);
          }
        } else if (threadPost) {
          threadPost.reblogged = active;
          threadPost.reblogs_count = Math.max(
            0,
            (threadPost.reblogs_count || 0) + (active ? 1 : -1)
          );
        }
        this.requestUpdate();
      },

      doApiCall: async () => {
        const { reblogPost } = await import('../services/timeline');
        return reblogPost(id);
      },

      undoApiCall: async () => {
        const { unreblogPost } = await import('../services/timeline');
        return unreblogPost(id);
      },

      onRollback: () => {
        if (isMainTweet) {
          this.isReblogged = originalReblogged;
          if (this.tweet) {
            this.tweet.reblogged = originalTweetReblogged;
            const target = this.tweet.reblog || this.tweet;
            target.reblogs_count = originalCount;
          }
        } else if (threadPost) {
          threadPost.reblogged = originalThreadReblogged ?? false;
          threadPost.reblogs_count = originalThreadCount ?? 0;
        }
        this.requestUpdate();
      },
    });

    // fire custom event
    this.dispatchEvent(
      new CustomEvent('reblog', {
        detail: {
          id,
        },
      })
    );
  }

  async bookmark(id: string) {
    if (!this.tweet) return;

    const isMainTweet = id === this.tweet.id || id === this.tweet.reblog?.id;
    const threadPost = !isMainTweet ? this.findThreadPost(id) : undefined;

    const isActive = isMainTweet
      ? this.isBookmarked || this.tweet.bookmarked
      : !!threadPost?.bookmarked;

    // Store original state for rollback
    const originalBookmarked = this.isBookmarked;
    const originalTweetBookmarked = this.tweet.bookmarked;
    const originalThreadBookmarked = threadPost?.bookmarked;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'bookmark posts',
      isActive,
      onOptimisticUpdate: (active) => {
        if (isMainTweet) {
          this.isBookmarked = active;
          if (this.tweet) {
            this.tweet.bookmarked = active;
          }
        } else if (threadPost) {
          threadPost.bookmarked = active;
        }
        this.requestUpdate();
      },
      doApiCall: async () => {
        const { addBookmark } = await import('../services/bookmarks');
        return addBookmark(id);
      },
      undoApiCall: async () => {
        const { removeBookmark } = await import('../services/bookmarks');
        return removeBookmark(id);
      },
      onRollback: () => {
        if (isMainTweet) {
          this.isBookmarked = originalBookmarked;
          if (this.tweet) {
            this.tweet.bookmarked = originalTweetBookmarked;
          }
        } else if (threadPost) {
          threadPost.bookmarked = originalThreadBookmarked ?? false;
        }
        this.requestUpdate();
      },
      errorMessageDo: 'Failed to bookmark post.',
      errorMessageUndo: 'Failed to remove bookmark.',
    });

    this.dispatchEvent(
      new CustomEvent('bookmark-change', {
        detail: {
          id,
          active: !isActive,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async muteConversation() {
    if (!this.tweet) return;

    if (this.guestMode) {
      showGuestActionToast('mute conversations');
      return;
    }

    const statusId = this.tweet.reblog?.id || this.tweet.id;
    const currentlyMuted = this.isMuted || this.tweet.muted;

    const originalMuted = this.isMuted;
    const originalTweetMuted = this.tweet.muted;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'mute conversations',
      isActive: currentlyMuted,
      onOptimisticUpdate: (active) => {
        this.isMuted = active;
        if (this.tweet) {
          this.tweet.muted = active;
          if (this.tweet.reblog) {
            this.tweet.reblog.muted = active;
          }
        }
        this.requestUpdate();
      },
      doApiCall: async () => {
        const { muteConversation } = await import('../services/posts');
        return muteConversation(statusId);
      },
      undoApiCall: async () => {
        const { unmuteConversation } = await import('../services/posts');
        return unmuteConversation(statusId);
      },
      onRollback: () => {
        this.isMuted = originalMuted;
        if (this.tweet) {
          this.tweet.muted = originalTweetMuted;
          if (this.tweet.reblog) {
            this.tweet.reblog.muted = originalTweetMuted;
          }
        }
        this.requestUpdate();
      },
      errorMessageDo: 'Failed to mute conversation.',
      errorMessageUndo: 'Failed to unmute conversation.',
    });

    this.dispatchEvent(
      new CustomEvent('conversation-mute-change', {
        detail: {
          id: statusId,
          muted: this.isMuted,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async togglePin() {
    if (!this.tweet) return;

    if (this.guestMode) {
      showGuestActionToast('pin posts');
      return;
    }

    const originalPinned = this.tweet.pinned;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'pin posts',
      isActive: originalPinned,
      onOptimisticUpdate: (active) => {
        if (this.tweet) {
          this.tweet.pinned = active;
        }
        this.requestUpdate();
      },
      doApiCall: async () => {
        const { pinPost } = await import('../services/posts');
        return pinPost(this.tweet!.id);
      },
      undoApiCall: async () => {
        const { unpinPost } = await import('../services/posts');
        return unpinPost(this.tweet!.id);
      },
      onRollback: () => {
        if (this.tweet) {
          this.tweet.pinned = originalPinned;
        }
        this.requestUpdate();
      },
      errorMessageDo: 'Failed to pin post.',
      errorMessageUndo: 'Failed to unpin post.',
    });

    if (this.tweet.pinned !== originalPinned) {
      this.dispatchEvent(
        new CustomEvent('pin-change', {
          detail: {
            post: this.tweet,
            pinned: this.tweet.pinned,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  async replies(post?: Post) {
    if (this.guestMode) {
      showGuestActionToast('reply to posts');
      return;
    }

    const target = post || this.tweet;

    const event = new CustomEvent('reply-clicked', {
      detail: {
        tweet: target,
      },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    const dispatched = this.dispatchEvent(event);

    if (dispatched) {
      await this.openPost(target);
    }
  }

  quotePost(post: Post) {
    if (this.guestMode) {
      showGuestActionToast('quote posts');
      return;
    }

    this.dispatchEvent(
      new CustomEvent('quote-clicked', {
        detail: { tweet: post },
        bubbles: true,
        composed: true,
      })
    );
  }

  async shareStatus(tweet: Post | null) {
    await shareStatusAction(tweet);
  }

  async openPost(post?: Post) {
    const target = post || this.tweet;
    if (!target) return;

    // Emit an open event so the parent context can handle navigation
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: {
          tweet: target,
        },
      })
    );
  }

  async openParentPost() {
    const parentPost = this.tweet?.reply_to;
    if (!parentPost) return;

    // Emit custom event with parent post; parent decides navigation/presentation.
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: {
          tweet: parentPost,
        },
      })
    );
  }

  async deleteStatus() {
    if (this.tweet) {
      const { deletePost } = await import('../services/posts');
      await deletePost(this.tweet.id);

      this.dispatchEvent(
        new CustomEvent('delete', {
          detail: {
            id: this.tweet.id,
          },
        })
      );
    }
  }

  async initEditStatus() {
    this.dispatchEvent(
      new CustomEvent('edit', {
        detail: {
          tweet: this.tweet,
        },
      })
    );
  }

  async viewEditHistory(id: string) {
    if (!this._editHistoryDialog) {
      await import('./post-edit-history-dialog.js');
      const el = document.createElement('post-edit-history-dialog');
      this.shadowRoot!.appendChild(el);
      this._editHistoryDialog =
        el as import('./post-edit-history-dialog').PostEditHistoryDialog;
    }
    this._editHistoryDialog.show(id);
  }

  private _editHistoryDialog:
    import('./post-edit-history-dialog').PostEditHistoryDialog | null = null;

  viewSensitive() {
    if (this.tweet) {
      this.tweet.sensitive = false;
      if (this.tweet.reblog) {
        this.tweet.reblog.sensitive = false;
      }
      this.requestUpdate();
    }
  }

  viewThreadSensitive(id: string) {
    // Check in threadPosts (Alt+X expanded thread)
    const index = this.threadPosts.findIndex((p) => p.id === id);
    if (index > -1) {
      const newPosts = [...this.threadPosts];
      newPosts[index] = { ...newPosts[index], sensitive: false };
      this.threadPosts = newPosts;
      return;
    }

    // Check in thread_continuation (self-thread grouped posts)
    if (this.tweet?.thread_continuation) {
      const contIndex = this.tweet.thread_continuation.findIndex(
        (p) => p.id === id
      );
      if (contIndex > -1) {
        const newCont = [...this.tweet.thread_continuation];
        newCont[contIndex] = { ...newCont[contIndex], sensitive: false };
        this.tweet = {
          ...this.tweet,
          thread_continuation: newCont,
        };
      }
    }
  }

  viewReplySensitive() {
    if (this.tweet && this.tweet.reply_to) {
      this.tweet.reply_to.sensitive = false;
      this.requestUpdate();
    }
  }

  openLinkCard(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  async translatePost(postContent: string | null, statusId?: string) {
    if (!postContent) return;

    this.dispatchEvent(
      new CustomEvent('translating', {
        detail: {
          tweet: this.tweet,
        },
        bubbles: true,
        composed: true,
      })
    );

    // remove all html tags
    const text = postContent.replace(/(<([^>]+)>)/gi, '');

    const { translate } = await import('../services/ai');
    const translateData = await translate(text, 'en-us', statusId);

    if (translateData) {
      this.dispatchEvent(
        new CustomEvent('summarize', {
          detail: {
            data: translateData,
            tweet: this.tweet,
          },
        })
      );
    }
  }

  async muteUser(accountId: string) {
    if (!accountId) return;

    const { muteUser } = await import('../services/account');
    await muteUser(accountId);

    this.dispatchEvent(
      new CustomEvent('user-muted', {
        detail: {
          accountId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async blockUser(accountId: string) {
    if (!accountId) return;

    const { blockUser } = await import('../services/account');
    await blockUser(accountId);

    this.dispatchEvent(
      new CustomEvent('user-blocked', {
        detail: {
          accountId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async blockDomain(domain: string) {
    if (!domain) return;

    try {
      const { blockDomain } = await import('../mastodon/api/domain-blocks.js');
      await blockDomain(domain);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `Blocked domain ${domain}`,
            variant: 'success',
          },
        })
      );
    } catch (error) {
      console.error('Failed to block domain', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: `Failed to block domain ${domain}`,
            variant: 'error',
          },
        })
      );
    }
  }

  reportUser(accountId: string, accountAcct: string, statusId?: string) {
    if (!accountId) return;

    this.reportAccountId = accountId;
    this.reportAccountAcct = accountAcct;
    this.reportStatusId = statusId;
    // Lazy-load report dialog on first use
    import('./report-dialog').then(() => {
      this.showReportDialog = true;
    });
  }

  async handleReportSubmit(e: CustomEvent<ReportSubmitDetail>) {
    const detail = e.detail;

    try {
      const { reportUser } = await import('../services/account');
      await reportUser(detail.accountId, {
        statusIds: detail.statusId ? [detail.statusId] : undefined,
        comment: detail.comment,
        category: detail.category,
        forward: detail.forward,
      });

      this.showReportDialog = false;
      this.reportAccountId = '';
      this.reportAccountAcct = '';
      this.reportStatusId = undefined;

      this.dispatchEvent(
        new CustomEvent('user-reported', {
          detail: {
            accountId: detail.accountId,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      console.error('Failed to submit report:', error);
    }
  }

  handleReportCancel() {
    this.showReportDialog = false;
    this.reportAccountId = '';
    this.reportAccountAcct = '';
    this.reportStatusId = undefined;
  }

  private handleContentClick(
    event: Event,
    post: Post | null | undefined,
    openPostOnNonLink: boolean = false
  ) {
    handleStatusContentClick(
      event,
      post,
      openPostOnNonLink ? () => void this.openPost() : undefined
    );
  }

  private addToList(account: Account) {
    this.dispatchEvent(
      new CustomEvent('add-to-list', {
        detail: { account },
        bubbles: true,
        composed: true,
      })
    );
  }

  getHandlers(): TimelineItemHandlers {
    return {
      viewSensitive: () => this.viewSensitive(),
      viewThreadSensitive: (id: string) => this.viewThreadSensitive(id),
      viewReplySensitive: () => this.viewReplySensitive(),
      replies: (post?: Post) => this.replies(post),
      bookmark: (id: string) => this.bookmark(id),
      favorite: (id: string) => this.favorite(id),
      reblog: (id: string) => this.reblog(id),
      quotePost: (post: Post) => this.quotePost(post),
      togglePin: () => this.togglePin(),
      muteConversation: () => this.muteConversation(),
      addToList: (account: Account) => this.addToList(account),
      translatePost: (content: string | null, statusId?: string) =>
        this.translatePost(content, statusId),
      shareStatus: (tweet: Post | null) => this.shareStatus(tweet),
      deleteStatus: () => this.deleteStatus(),
      initEditStatus: () => this.initEditStatus(),
      viewEditHistory: (id: string) => this.viewEditHistory(id),
      openPost: () => this.openPost(),
      openParentPost: () => this.openParentPost(),
      openLinkCard: (url: string) => this.openLinkCard(url),
      handleContentClick: (
        event: Event,
        post: Post | null | undefined,
        openPostOnNonLink?: boolean
      ) => this.handleContentClick(event, post, openPostOnNonLink),
      showThread: () => this.showThread(),
      muteUser: (accountId: string) => this.muteUser(accountId),
      blockUser: (accountId: string) => this.blockUser(accountId),
      blockDomain: (domain: string) => this.blockDomain(domain),
      reportUser: (accountId: string, accountAcct: string, statusId?: string) =>
        this.reportUser(accountId, accountAcct, statusId),
    };
  }

  getState(): TimelineItemState {
    return {
      tweet: this.tweet,
      show: this.show,
      currentUser: this.currentUser,
      settings: this.settings,
      isBookmarked: this.isBookmarked,
      isBoosted: this.isBoosted,
      isReblogged: this.isReblogged,
      isMuted: this.isMuted,
      canPin: this.allowPin && !this.guestMode,
      loadingThread: this.loadingThread,
      threadExpanded: this.threadExpanded,
      threadPosts: this.threadPosts,
      threadAncestors: this.threadPosts.slice(0, this._ancestorCount),
      threadDescendants: this.threadPosts.slice(this._ancestorCount),
      isOnDeviceTranslateAvailable: this.isOnDeviceTranslateAvailable,
      guestMode: this.guestMode,
    };
  }

  private _revealFiltered() {
    this._filterRevealed = true;
  }

  render() {
    if (!this.tweet) return html``;

    if (this.filterTitles.length > 0 && !this._filterRevealed) {
      const label = this.filterTitles.join(', ');
      return html`
        <div class="filter-warning">
          <span class="filter-warning-label">
            ${msg(str`Filtered: ${label}`)}
          </span>
          <md-button variant="text" size="small" @click=${this._revealFiltered}>
            ${msg('Show')}
          </md-button>
        </div>
      `;
    }

    const state = this.getState();
    const handlers = this.getHandlers();

    if (
      this.tweet.sensitive ||
      (this.tweet.reblog && this.tweet.reblog.sensitive)
    ) {
      return renderSensitive(state, handlers);
    }

    return html`
      ${renderThreadAncestors(state, handlers)}
      ${
        this.tweet.reblog
          ? renderReblog(state, handlers)
          : renderRegularTweet(state, handlers)
      }
      ${renderThread(state, handlers)}

      <report-dialog
        .open=${this.showReportDialog}
        .accountId=${this.reportAccountId}
        .accountAcct=${this.reportAccountAcct}
        .statusId=${this.reportStatusId}
        @report-submit=${this.handleReportSubmit}
        @report-cancel=${this.handleReportCancel}
      ></report-dialog>
    `;
  }
}
