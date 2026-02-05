import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { getSettings, Settings } from '../services/settings';
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
  TimelineItemHandlers,
  TimelineItemState,
} from './timeline-renderers';
import './report-dialog';
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

  @state() isBoosted: boolean = false;
  @state() isReblogged: boolean = false;
  @state() isBookmarked: boolean = false;
  @state() threadExpanded: boolean = false;
  @state() threadPosts: Post[] = [];
  @state() loadingThread: boolean = false;

  @state() settings: Settings | undefined;

  @state() currentUser: Account | null = null;

  @state() showReportDialog: boolean = false;
  @state() reportAccountId: string = '';
  @state() reportAccountAcct: string = '';
  @state() reportStatusId: string | undefined;
  @state() isOnDeviceTranslateAvailable: boolean = false;

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

        animation-name: slideUp;
        animation-duration: 0.3s;
        animation-fill-mode: forwards;

        cursor: pointer;

        border-radius: 12px;
        overflow: hidden;

        width: auto;

        overflow-x: hidden;
      }

      md-card::part(base) {
        border: 1px
          solidcolor-mix(
            in srgb,
            var(--md-sys-color-outline-variant, #2b2930) 60%,
            transparent
          );
        transition:
          background 0.2s ease,
          border-color 0.2s ease;
        background: var(--md-sys-color-surface-container, #1e1e24);
        padding-left: 10px;
        padding-right: 10px;
        padding-top: 0px;
      }

      :host(:hover) md-card::part(base) {
        background: var(--md-sys-color-surface-container, #1e1e24);
        border-color: var(--md-sys-color-outline-variant, #2b2930);
      }

      image-carousel {
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
        padding: 8px 12px;
      }

      .boost-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin: -10px -10px 10px -10px;
        background: transparent;
        border-radius: 12px 12px 0 0;
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
        border-radius: 50%;
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
        background: rgb(32 32 35);
        z-index: 1;
        display: flex;
        align-items: center;
        text-align: center;
        justify-content: center;
        flex-direction: column;
        border-radius: 6px;
        padding: 22px;
      }

      .sensitive span {
        font-weight: bold;
        display: block;
        width: 142px;
      }

      .sensitive p {
        text-align: center;
      }

      .link-card {
        display: flex;
        align-items: stretch;
        background: #ffffff0d;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 10px;
        cursor: pointer;
        height: auto;
        gap: 10px;
      }

      .link-card:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .link-card h4 {
        margin-bottom: 8px;
        margin-top: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.9em;
      }

      .link-card img {
        min-width: 80px;
        border-radius: 0;
        object-fit: cover;

        height: 20%;
        width: 20%;
        padding: 8px;
      }

      .link-card-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 8px 10px;
        flex: 1;
        min-width: 0;
      }

      .link-card p {
        margin: 0;
        font-size: 11px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--md-sys-color-on-surface-variant);
      }

      @media (prefers-color-scheme: light) {
        .link-card {
          background: rgba(0, 0, 0, 0.05);
        }

        .link-card:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .sensitive {
          background: white;
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
        border-radius: 6px;
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
        border-radius: 6px;
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
        border-radius: 6px 6px 0px 0px;
      }

      .header-block {
        display: flex;
        align-items: center;
        gap: 14px;
        justify-content: space-between;
      }

      .header-block img {
        height: 62px;
        border-radius: 50%;
      }

      .header-block h4 {
        margin-bottom: 0;
      }

      .actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
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

      .thread-line {
        width: 3px;
        background: var(--sl-color-primary-600);
        margin-left: 8px;
        height: 16px;
      }

      @media (max-width: 820px) {
        .timeline-item {
          border-radius: 0;
        }

        .actions {
          width: 100%;
          justify-content: space-between;
        }

        .boost-indicator .booster-name {
          max-width: 100px;
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
    const { isOnDeviceTranslationAvailable } = await import('../services/ai');
    this.isOnDeviceTranslateAvailable = isOnDeviceTranslationAvailable();

    // Add keyboard event listener for when this item is focused
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    // Only handle if this item is focused
    if (!this.focused || !this.tweet) return;

    // All shortcuts require alt modifier (except Enter) to avoid conflicts with typing
    const postId = this.tweet.reblog?.id || this.tweet.id;

    // Enter doesn't need alt modifier as it doesn't conflict with typing
    if (event.key === 'Enter') {
      event.preventDefault();
      this.openPost();
      return;
    }

    // All other shortcuts require alt key
    if (!event.altKey) return;

    switch (event.key) {
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
      case 'd':
        // Bookmark
        event.preventDefault();
        this.bookmark(postId);
        break;
      case 'o':
        // Open post
        event.preventDefault();
        this.openPost();
        break;
      case 'x':
        // Expand thread
        event.preventDefault();
        this.showThread();
        break;
      default:
        break;
    }
  };

  async favorite(id: string) {
    if (!this.tweet) return;

    // Check current state (optimistic or actual)
    // Note: isBoosted here refers to the "favorited" state (legacy naming issue)
    const currentlyFavorited = this.isBoosted || this.tweet.favourited;

    // Store original state for rollback
    const originalFavorited = this.isBoosted;
    const originalTweetFavorited = this.tweet.favourited;
    const originalCount = this.tweet.reblog
      ? this.tweet.reblog.favourites_count
      : this.tweet.favourites_count;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'like posts',
      isActive: currentlyFavorited,
      errorMessageDo: 'Failed to favorite post.',
      errorMessageUndo: 'Failed to un-favorite post.',

      onOptimisticUpdate: (active) => {
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
        this.isBoosted = originalFavorited;
        if (this.tweet) {
          this.tweet.favourited = originalTweetFavorited;
          const target = this.tweet.reblog || this.tweet;
          target.favourites_count = originalCount;
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

    // Check current state (optimistic or actual)
    const currentlyReblogged = this.isReblogged || this.tweet.reblogged;

    // Store original state for rollback
    const originalReblogged = this.isReblogged;
    const originalTweetReblogged = this.tweet.reblogged;
    const originalCount = this.tweet.reblog
      ? this.tweet.reblog.reblogs_count
      : this.tweet.reblogs_count;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'boost posts',
      isActive: currentlyReblogged,
      errorMessageDo: 'Failed to boost post.',
      errorMessageUndo: 'Failed to un-boost post.',

      onOptimisticUpdate: (active) => {
        this.isReblogged = active;
        if (this.tweet) {
          this.tweet.reblogged = active;
          const delta = active ? 1 : -1;
          const target = this.tweet.reblog || this.tweet;
          target.reblogs_count = Math.max(0, target.reblogs_count + delta);
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
        this.isReblogged = originalReblogged;
        if (this.tweet) {
          this.tweet.reblogged = originalTweetReblogged;
          const target = this.tweet.reblog || this.tweet;
          target.reblogs_count = originalCount;
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

    const isActive = this.isBookmarked || this.tweet.bookmarked;

    // Store original state for rollback
    const originalBookmarked = this.isBookmarked;
    const originalTweetBookmarked = this.tweet.bookmarked;

    await toggleStatusAction({
      guestMode: this.guestMode,
      actionName: 'bookmark posts',
      isActive,
      onOptimisticUpdate: (active) => {
        this.isBookmarked = active;
        if (this.tweet) {
          this.tweet.bookmarked = active;
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
        this.isBookmarked = originalBookmarked;
        if (this.tweet) {
          this.tweet.bookmarked = originalTweetBookmarked;
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

  async replies() {
    if (this.guestMode) {
      showGuestActionToast('reply to posts');
      return;
    }

    const event = new CustomEvent('reply-clicked', {
      detail: {
        tweet: this.tweet,
      },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    const dispatched = this.dispatchEvent(event);

    if (dispatched) {
      await this.openPost();
    }
  }

  // async analyzeStatus(tweet: Post | null) {
  //     if (tweet) {
  //         const { analyzeStatusText, analyzeStatusImage } = await import('../services/ai');
  //         const data = await analyzeStatusText(tweet.reblog ? tweet.reblog.content : tweet.content);

  //         let imageData: string | null = null;
  //         const imageURL = tweet.reblog ? tweet.reblog.media_attachments[0] ? tweet.reblog.media_attachments[0].preview_url : null : tweet.media_attachments[0] ? tweet.media_attachments[0]?.preview_url : null;

  //         if (imageURL) {
  //             imageData = await analyzeStatusImage(imageURL);
  //         }

  //         if (data) {
  //             console.log(data);

  //             this.dispatchEvent(new CustomEvent('analyze', {
  //                 detail: {
  //                     data,
  //                     imageData: imageData ? imageData : null,
  //                     tweet
  //                 }
  //             }));
  //         }
  //     }

  // }

  async shareStatus(tweet: Post | null) {
    await shareStatusAction(tweet);
  }

  async openPost() {
    if (!this.tweet) return;

    // Emit an open event so the parent context can handle navigation
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: {
          tweet: this.tweet,
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
    const index = this.threadPosts.findIndex((p) => p.id === id);
    if (index > -1) {
      const newPosts = [...this.threadPosts];
      newPosts[index] = { ...newPosts[index], sensitive: false };
      this.threadPosts = newPosts;
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

  async summarizePost(postContent: string | null) {
    if (!postContent) return;

    // remove all html tags
    const text = postContent.replace(/(<([^>]+)>)/gi, '');

    const { summarize } = await import('../services/ai');
    const summaryData = await summarize(text);

    if (summaryData) {
      console.log(summaryData);

      this.dispatchEvent(
        new CustomEvent('summarize', {
          detail: {
            data: summaryData.choices[0].message.content,
            tweet: this.tweet,
          },
        })
      );
    }
  }

  async translatePost(postContent: string | null) {
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
    const translateData = await translate(text);

    if (translateData) {
      console.log(translateData);

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

  reportUser(accountId: string, accountAcct: string, statusId?: string) {
    if (!accountId) return;

    this.reportAccountId = accountId;
    this.reportAccountAcct = accountAcct;
    this.reportStatusId = statusId;
    this.showReportDialog = true;
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
      replies: () => this.replies(),
      bookmark: (id: string) => this.bookmark(id),
      favorite: (id: string) => this.favorite(id),
      reblog: (id: string) => this.reblog(id),
      togglePin: () => this.togglePin(),
      addToList: (account: Account) => this.addToList(account),
      translatePost: (content: string | null) => this.translatePost(content),
      shareStatus: (tweet: Post | null) => this.shareStatus(tweet),
      deleteStatus: () => this.deleteStatus(),
      initEditStatus: () => this.initEditStatus(),
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
      canPin: this.allowPin && !this.guestMode,
      loadingThread: this.loadingThread,
      threadExpanded: this.threadExpanded,
      threadPosts: this.threadPosts,
      isOnDeviceTranslateAvailable: this.isOnDeviceTranslateAvailable,
      guestMode: this.guestMode,
    };
  }

  render() {
    if (!this.tweet) return html``;

    const state = this.getState();
    const handlers = this.getHandlers();

    if (
      this.tweet.sensitive ||
      (this.tweet.reblog && this.tweet.reblog.sensitive)
    ) {
      return renderSensitive(state, handlers);
    }

    return html`
      ${this.tweet.reblog
        ? renderReblog(state, handlers)
        : renderRegularTweet(state, handlers)}
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
