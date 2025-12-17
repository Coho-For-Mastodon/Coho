import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';

import '../components/header';
import '../components/timeline-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-text-area';
import '../components/md/md-skeleton-card';
import { Post } from '../interfaces/Post';
import { getReplies } from '../services/timeline';

import { replyToPost, getPostDetail } from '../services/posts';
import type { MdTextArea } from '../components/md/md-text-area';
import { router } from '../utils/router';
import { getNotificationById } from '../mastodon/api/notifications';

@localized()
@customElement('post-detail')
export class PostDetail extends LitElement {
  @state() tweet: Post | null = null;
  @state() replies: Post[] = [];
  @state() replyingTo: Post | null = null;
  @state() loading = false;
  @state() error: string | null = null;
  @state() isGuestMode = false;

  @property({ type: Object }) passed_tweet: Post | null = null;

  @query('md-text-area') private replyTextArea!: MdTextArea;

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
        padding-top: 60px;
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
        padding-top: 10px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -12px 24px rgba(0, 0, 0, 0.18);
        border-radius: 12px;
      }

      .composer-shell {
        background: var(
          --md-sys-color-surface-container,
          rgba(255, 255, 255, 0.06)
        );
        border: 1px solid
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
        border-radius: 16px;
        padding: 10px;
      }

      .composer-inner {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .replying-to-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant);
        padding: 4px 8px;
        background: var(--md-sys-color-surface-container-high);
        border-radius: 8px;
      }

      md-text-area {
        width: 100%;
      }

      md-text-area.reply-input {
        --md-text-area-min-height: 56px;
        --md-text-area-resize: none;
        --md-text-area-radius: 14px;
        --md-text-area-padding: 10px 12px;
      }

      .composer-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
      }

      md-button::part(control) {
        border: none;
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

    // Check for ID-based route (/post/:id or /post/notification?notification_id=xxx)
    const pathMatch = window.location.pathname.match(/\/post\/(.+)/);
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
        const decoded = JSON.parse(decodeURIComponent(query));
        console.log('decoded', decoded);
        // remove + and - from decoded.content
        if (decoded.reblog) {
          decoded.reblog.content = decoded.reblog.content
            .replace(/\+/g, ' ')
            .replace(/-/g, '');
        }

        decoded.content = decoded.content.replace(/\+/g, ' ').replace(/-/g, '');

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
      // get post replies
      const replies = await getReplies(this.tweet.id);
      console.log('replies', replies);

      this.replies = replies.descendants;
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
    } else {
      // fallback to clipboard api
      await navigator.clipboard.writeText(this.tweet?.url || '');
    }
  }

  async handleReply() {
    const tweetToReplyTo = this.replyingTo || this.tweet;

    if (this.replyTextArea?.value && tweetToReplyTo && tweetToReplyTo.id) {
      await replyToPost(tweetToReplyTo.id, this.replyTextArea.value);

      await this.loadReplies();

      this.replies = [...this.replies];

      this.replyTextArea.value = '';
      this.replyingTo = null;
    }
  }

  handleReplyClick(e: CustomEvent) {
    e.preventDefault();
    this.replyingTo = e.detail.tweet;

    if (this.replyTextArea) {
      this.replyTextArea.focus();
    }
  }

  private async handleOpenPost(e: CustomEvent<{ tweet: Post }>) {
    const tweet = e.detail.tweet;
    if (!tweet) return;

    // If we're embedded in a sheet/dialog, keep navigation "in-place"
    // by swapping the post and reloading replies.
    if (this.passed_tweet) {
      this.tweet = tweet;
      this.replyingTo = null;
      await this.loadReplies();

      const scroller = this.renderRoot?.querySelector(
        '.scroller'
      ) as HTMLElement | null;
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Full-page mode: navigate to the new post route.
    router.navigate(`/home/post?${encodeURIComponent(JSON.stringify(tweet))}`);
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
          <section class="post-section">
            <timeline-item
              id="main"
              .tweet="${this.tweet!}"
              ?guestMode="${this.isGuestMode}"
              @open="${(e: CustomEvent<{ tweet: Post }>) =>
                this.handleOpenPost(e)}"
            ></timeline-item>
          </section>

          <section class="replies-section">
            ${this.replies.length > 0
              ? html`<h2 class="replies-title">${msg('Replies')}</h2>`
              : nothing}

            <ul class="replies-list">
              ${this.replies.map(
                (reply) => html`
                  <timeline-item
                    .tweet="${reply}"
                    ?show="${true}"
                    ?guestMode="${this.isGuestMode}"
                    @open="${(e: CustomEvent<{ tweet: Post }>) =>
                      this.handleOpenPost(e)}"
                    @reply-clicked="${(e: CustomEvent) =>
                      this.handleReplyClick(e)}"
                  ></timeline-item>
                `
              )}
            </ul>
          </section>
        </div>

        ${this.isGuestMode
          ? nothing
          : html`
              <footer class="composer">
                <div class="composer-shell">
                  <div class="composer-inner">
                    ${this.replyingTo
                      ? html`
                          <div class="replying-to-indicator">
                            <span
                              >${msg(
                                str`Replying to @${this.replyingTo.account.acct}`
                              )}</span
                            >
                            <md-icon-button
                              name="close"
                              @click=${() => (this.replyingTo = null)}
                            ></md-icon-button>
                          </div>
                        `
                      : nothing}

                    <md-text-area
                      class="reply-input"
                      variant="outlined"
                      rows="2"
                      .placeholder="${msg('Reply to this post...')}"
                    ></md-text-area>

                    <div class="composer-actions">
                      <md-button
                        @click="${() => this.handleReply()}"
                        id="reply-button"
                        variant="filled"
                        pill
                        size="small"
                      >
                        ${msg('Reply')}
                        <md-icon
                          slot="suffix"
                          src="/assets/add-outline.svg"
                        ></md-icon>
                      </md-button>
                    </div>
                  </div>
                </div>
              </footer>
            `}
      </main>
    `;
  }
}
