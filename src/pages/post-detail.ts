import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/header';
import '../components/timeline-item';
import '../components/thread-branch';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-skeleton-card';
import '../components/post-composer';
import { Post } from '../interfaces/Post';
import { getReplies } from '../services/timeline';
import { buildThreadTree, type ThreadNode } from '../utils/thread-tree';

import { getPostDetail, getQuotesOf } from '../services/posts';
import type { PostComposer } from '../components/post-composer';
import type { PostDialog } from '../components/post-dialog';
import { router, type AppNavigationState } from '../router/routes';
import { getNotificationById } from '../mastodon/api/notifications';
import { getConversations } from '../services/messages';

@localized()
@customElement('post-detail')
export class PostDetail extends LitElement {
  @state() tweet: Post | null = null;
  @state() replyTree: ThreadNode[] = [];
  @state() ancestors: Post[] = [];
  @state() replyingTo: Post | null = null;
  @state() loading = false;
  @state() loadingThread = false;
  @state() error: string | null = null;
  @state() isGuestMode = false;
  @state() quotes: Post[] = [];
  @state() loadingQuotes = false;

  @property({ type: Object }) passed_tweet: Post | null = null;

  @query('post-composer') private replyComposer!: PostComposer;
  @query('post-dialog') private postDialog!: PostDialog;

  private stripThreadFields(post: Post): Post {
    const result = { ...post };
    delete result.thread_continuation;
    delete result.thread_truncated;
    return result;
  }

  private get cleanMainTweet(): Post | null {
    if (!this.tweet) return null;
    return this.stripThreadFields(this.tweet);
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
        max-height: 100%;
      }

      /* Full page default */
      :host(:not([embedded])) {
        height: 100vh;
        max-height: 100vh;
      }

      main {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding-left: 16px;
        padding-right: 16px;
      }

      /* Account for fixed header on full-page view */
      :host(:not([embedded])) main {
        padding-top: calc(60px + env(safe-area-inset-top, 0px));
      }

      .scroller {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        width: 100%;
        max-width: var(--post-detail-max-width, 720px);
        margin: 0 auto;
        padding-top: 10px;
        padding-bottom: 12px;
      }

      .post-section {
        padding-bottom: 12px;
      }

      .post-section.error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        color: var(--md-sys-color-on-surface-variant, #999);
        text-align: center;
      }

      .post-section.error-state md-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: var(--md-sys-color-error, #f44336);
      }

      #main {
        min-height: 230px;
        view-transition-name: card;
      }

      .ancestors-section {
        margin-bottom: 0;
      }

      .ancestor-connector {
        display: flex;
        align-items: stretch;
        padding: 0 11px;
      }

      .ancestor-connector-line {
        width: 2px;
        min-height: 20px;
        margin-left: 19px;
        background: var(--md-sys-color-outline, #938f99);
        border-radius: 1px;
        flex-shrink: 0;
      }

      .replies-section {
        margin-top: 10px;
      }

      .replies-title {
        margin: 0 0 10px 0;
        font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
        color: var(--md-sys-color-on-surface, #fff);
      }

      .replies-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .composer {
        width: 100%;
        max-width: var(--post-detail-max-width, 720px);
        margin: 0 auto;
        padding-top: 6px;
        padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -12px 24px rgba(0, 0, 0, 0.18);
        border-radius: var(--md-sys-shape-corner-medium);
        margin-bottom: 6px;
      }

      .composer-shell {
        background: var(
          --md-sys-color-surface-container,
          rgba(255, 255, 255, 0.06)
        );
        border: 1px solid
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
        border-radius: var(--md-sys-shape-corner-large);
        padding: 8px;
        --md-text-area-min-height: 40px;
      }

      @media (min-width: 820px) {
        main {
          padding-left: 24px;
          padding-right: 24px;
        }
      }

      @media (min-width: 1100px) {
        :host(:not([embedded])) main {
          padding-left: 32px;
          padding-right: 32px;
        }
      }

      /* Embedded mode should fully rely on its container */
      :host([embedded]) main {
        padding-top: 0;
      }

      @media (prefers-color-scheme: dark) {
        md-text-area::part(textarea),
        md-button[variant='outlined']::part(control) {
          background: #1e1e1e;
          color: white;
        }
      }

      @keyframes slideup {
        from {
          transform: translateY(30%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();

    // Keep CSS in sync with whether we're embedded (sheet/dialog) vs full page
    this.toggleAttribute('embedded', this.passed_tweet !== null);

    if (this.passed_tweet) {
      this.tweet = this.passed_tweet;
      return;
    }

    // First, check if we have a post passed from navigation (instant render path)
    const navState = router.getNavigationState<AppNavigationState>();
    if (navState?.post) {
      this.tweet = navState.post;
      // No skeleton shown - post renders immediately
      return;
    }

    // Check for ID-based route (/post/:id, /home/post/:id, or /post/notification?notification_id=xxx)
    const pathMatch = window.location.pathname.match(/(?:\/home)?\/post\/(.+)/);
    if (pathMatch) {
      const pathId = pathMatch[1];
      const urlParams = new URLSearchParams(window.location.search);
      const notificationId = urlParams.get('notification_id');

      this.loading = true;
      this.error = null;

      try {
        // If coming from a push notification, fetch via notification_id
        if (notificationId || pathId === 'notification') {
          const nId = notificationId || pathId;
          if (nId && nId !== 'notification') {
            const notification = await getNotificationById(nId);
            if (notification.status) {
              this.tweet = notification.status;
            } else {
              // Notification doesn't have a status (e.g., follow notification)
              // Redirect to notifications
              router.navigate('/home?tab=notifications');
              return;
            }
          } else if (notificationId) {
            // notification_id is in query string
            const notification = await getNotificationById(notificationId);
            if (notification.status) {
              this.tweet = notification.status;
            } else {
              router.navigate('/home?tab=notifications');
              return;
            }
          } else {
            this.error = 'Invalid notification';
            this.loading = false;
            return;
          }
        } else {
          // Direct post ID access (/post/:postId)
          this.tweet = await getPostDetail(pathId);
        }
        // If the post is a DM, redirect to the messages UI
        if (this.tweet?.visibility === 'direct') {
          try {
            const convs = await getConversations();
            // Prefer exact status match, fall back to 1:1 account match
            const conv =
              convs.find((c) => c.last_status?.id === this.tweet!.id) ||
              convs.find(
                (c) =>
                  c.accounts.length === 1 &&
                  c.accounts[0].id === this.tweet!.account.id
              );
            if (conv) {
              router.navigate(`/messages/${conv.id}`, {
                state: { conversation: conv },
              });
              return;
            }
          } catch (err) {
            console.error('[PostDetail] Failed to find DM conversation:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load post:', err);
        this.error = 'Failed to load post';
      } finally {
        this.loading = false;
      }
      return;
    }

    // Legacy: full JSON in query string (/home/post?{...})
    const query = window.location.search.substring(1);
    if (query) {
      try {
        // Some legacy links may use '+' for spaces in query encoding.
        const normalizedQuery = query.replace(/\+/g, '%20');
        const decoded = JSON.parse(decodeURIComponent(normalizedQuery));
        console.log('decoded', decoded);

        this.tweet = decoded;
      } catch (err) {
        console.error('Failed to parse query string:', err);
        this.error = 'Failed to load post';
      }
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('passed_tweet')) {
      this.toggleAttribute('embedded', this.passed_tweet !== null);
      if (this.passed_tweet) {
        this.tweet = this.passed_tweet;
        this.replyTree = [];
        this.ancestors = [];
        this.quotes = [];
        // Ensure replies load even if passed_tweet is set after firstUpdated.
        void this.loadReplies();
      }
    }
  }

  async firstUpdated() {
    // Check guest mode
    const { isGuestMode } = await import('../services/auth-state');
    this.isGuestMode = isGuestMode();

    // get id from query string
    await this.loadReplies();
  }

  private async loadReplies() {
    if (this.tweet && this.tweet.id) {
      this.loadingThread = true;
      try {
        // get post replies
        const replies = await getReplies(this.tweet.id);
        console.log('replies', replies);

        // Build a tree structure for replies
        if (this.tweet) {
          this.replyTree = buildThreadTree(this.tweet.id, replies.descendants);
        }

        // If there are ancestors, we need to adjust scroll position
        // to keep the main post visually stable when ancestors render above it
        if (replies.ancestors.length > 0) {
          // Get current scroll position and main post position
          const scroller = this.shadowRoot?.querySelector('.scroller');
          const mainPost = this.shadowRoot?.querySelector('#main');

          if (scroller && mainPost) {
            const mainPostRect = mainPost.getBoundingClientRect();
            const scrollerRect = scroller.getBoundingClientRect();
            const mainPostOffsetFromTop = mainPostRect.top - scrollerRect.top;

            // Set ancestors (this will cause a re-render)
            this.ancestors = replies.ancestors;

            // After the update, adjust scroll to keep main post at same visual position
            await this.updateComplete;
            requestAnimationFrame(() => {
              const newMainPostRect = mainPost.getBoundingClientRect();
              const newMainPostOffsetFromTop =
                newMainPostRect.top - scrollerRect.top;
              const scrollAdjustment =
                newMainPostOffsetFromTop - mainPostOffsetFromTop;

              if (scrollAdjustment > 0) {
                scroller.scrollTop += scrollAdjustment;
              }
            });
          } else {
            this.ancestors = replies.ancestors;
          }
        } else {
          this.ancestors = replies.ancestors;
        }
      } finally {
        this.loadingThread = false;
      }

      // Load quotes for this post
      this.loadingQuotes = true;
      try {
        const quotesResult = await getQuotesOf(this.tweet.id);
        this.quotes = Array.isArray(quotesResult) ? quotesResult : [];
      } catch {
        this.quotes = [];
      } finally {
        this.loadingQuotes = false;
      }
    }
  }

  async shareStatus() {
    if (navigator.share) {
      // share the post
      await navigator.share({
        title: 'Coho',
        text: this.tweet?.content,
        url: this.tweet?.url,
      });
    } // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    else if (window.Capacitor) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Coho',
        text: this.tweet?.content,
        url: this.tweet?.url,
      });
    } else {
      // fallback to clipboard api
      await navigator.clipboard.writeText(this.tweet?.url || '');
    }
  }

  async handleReplyPublished() {
    // Reload replies after publishing
    await this.loadReplies();
    this.replyingTo = null;
  }

  handleReplyClick(e: CustomEvent) {
    e.preventDefault();
    this.replyingTo = e.detail.tweet;

    if (this.replyComposer) {
      this.replyComposer.replyTo = e.detail.tweet;
      this.replyComposer.focus();
    }
  }

  handleQuoteClick(e: CustomEvent<{ tweet: Post }>) {
    const post = e.detail.tweet;
    if (!post) return;

    this.dispatchEvent(
      new CustomEvent('quote-clicked', {
        detail: { tweet: post },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleOpenPost(e: CustomEvent<{ tweet: Post }>) {
    const tweet = e.detail.tweet;
    if (!tweet) return;

    // If we're embedded in a sheet/dialog, keep navigation "in-place"
    // by swapping the post and reloading replies.
    if (this.passed_tweet) {
      this.tweet = tweet;
      this.replyingTo = null;
      this.replyTree = [];
      this.ancestors = [];
      this.quotes = [];
      await this.loadReplies();

      const scroller = this.renderRoot?.querySelector(
        '.scroller'
      ) as HTMLElement | null;
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Full-page mode: pass post via Navigation API state for instant render.
    router.navigate(`/home/post/${tweet.id}`, { state: { post: tweet } });
  }

  async handleEditPost(tweet: Post) {
    if (!customElements.get('post-dialog')) {
      await import('../components/post-dialog.js');
      await this.updateComplete;
    }
    if (this.postDialog) {
      await this.postDialog.updateComplete;
      this.postDialog.openEditDialog(tweet);
    }
  }

  render() {
    const embedded = this.passed_tweet !== null;

    // Show skeleton while loading
    if (this.loading) {
      return html`
        ${!embedded
          ? html`<app-header ?enableBack="${true}"></app-header>`
          : null}
        <main>
          <div class="scroller">
            <section class="post-section">
              <md-skeleton-card count="1"></md-skeleton-card>
            </section>
          </div>
        </main>
      `;
    }

    // Show error state
    if (this.error) {
      return html`
        ${!embedded
          ? html`<app-header ?enableBack="${true}"></app-header>`
          : null}
        <main>
          <div class="scroller">
            <section class="post-section error-state">
              <md-icon name="error"></md-icon>
              <p>${this.error}</p>
            </section>
          </div>
        </main>
      `;
    }

    // No tweet to display
    if (!this.tweet) {
      return html`
        ${!embedded
          ? html`<app-header ?enableBack="${true}"></app-header>`
          : null}
        <main>
          <div class="scroller">
            <section class="post-section">
              <p>${msg('Post not found')}</p>
            </section>
          </div>
        </main>
      `;
    }

    return html`
      ${!embedded
        ? html`<app-header ?enableBack="${true}"></app-header>`
        : null}

      <main>
        <div class="scroller">
          <section class="ancestors-section">
            ${this.ancestors.map((ancestor, index) => {
              // Strip timeline thread grouping — detail view shows full thread
              const cleanAncestor = this.stripThreadFields(ancestor);
              return html`
                <timeline-item
                  .tweet="${cleanAncestor}"
                  ?guestMode="${this.isGuestMode}"
                  @open="${(e: CustomEvent<{ tweet: Post }>) =>
                    this.handleOpenPost(e)}"
                  @reply-clicked="${(e: CustomEvent) =>
                    this.handleReplyClick(e)}"
                  @quote-clicked="${(e: CustomEvent<{ tweet: Post }>) =>
                    this.handleQuoteClick(e)}"
                  @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                    this.handleEditPost(e.detail.tweet)}"
                ></timeline-item>
                ${index < this.ancestors.length - 1
                  ? html`<div class="ancestor-connector">
                      <div class="ancestor-connector-line"></div>
                    </div>`
                  : nothing}
              `;
            })}
          </section>

          <section class="post-section">
            <timeline-item
              id="main"
              .tweet="${this.cleanMainTweet || undefined}"
              ?guestMode="${this.isGuestMode}"
              @open="${(e: CustomEvent<{ tweet: Post }>) =>
                this.handleOpenPost(e)}"
              @reply-clicked="${(e: CustomEvent) => this.handleReplyClick(e)}"
              @quote-clicked="${(e: CustomEvent<{ tweet: Post }>) =>
                this.handleQuoteClick(e)}"
              @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                this.handleEditPost(e.detail.tweet)}"
            ></timeline-item>
          </section>

          ${this.quotes.length > 0
            ? html`
                <section class="replies-section">
                  <h2 class="replies-title">${msg('Quotes')}</h2>
                  ${this.quotes.map(
                    (quotePost) => html`
                      <timeline-item
                        .tweet=${quotePost}
                        ?guestMode=${this.isGuestMode}
                        @open=${(e: CustomEvent<{ tweet: Post }>) =>
                          this.handleOpenPost(e)}
                        @reply-clicked=${(e: CustomEvent) =>
                          this.handleReplyClick(e)}
                        @quote-clicked=${(e: CustomEvent<{ tweet: Post }>) =>
                          this.handleQuoteClick(e)}
                        @edit=${(e: CustomEvent<{ tweet: Post }>) =>
                          this.handleEditPost(e.detail.tweet)}
                      ></timeline-item>
                    `
                  )}
                </section>
              `
            : nothing}
          ${this.replyTree.length > 0
            ? html`
                <section class="replies-section">
                  <h2 class="replies-title">${msg('Replies')}</h2>
                  ${this.replyTree.map(
                    (node) => html`
                      <thread-branch
                        .node=${node}
                        ?guestMode=${this.isGuestMode}
                        @open=${(e: CustomEvent<{ tweet: Post }>) =>
                          this.handleOpenPost(e)}
                        @reply-clicked=${(e: CustomEvent) =>
                          this.handleReplyClick(e)}
                      ></thread-branch>
                    `
                  )}
                </section>
              `
            : nothing}
        </div>

        ${this.isGuestMode
          ? nothing
          : html`
              <footer class="composer">
                <div class="composer-shell">
                  <post-composer
                    compact
                    rows="1"
                    .replyTo=${this.replyingTo || this.tweet}
                    placeholder=${msg('Reply to this post...')}
                    @published=${() => this.handleReplyPublished()}
                    @reply-cleared=${() => {
                      this.replyingTo = null;
                      if (this.replyComposer && this.tweet) {
                        this.replyComposer.replyTo = this.tweet;
                      }
                    }}
                  ></post-composer>
                </div>
              </footer>
            `}

        <post-dialog
          @published=${() => this.handleReplyPublished()}
        ></post-dialog>
      </main>
    `;
  }
}
