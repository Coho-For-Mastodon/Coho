import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import '../components/header';
import '../components/post-composer';
import '../components/md/md-button';
import '../components/md/md-icon';

import { router, type AppNavigationState } from '../router/routes';
import { getStatusContext } from '../mastodon/api/timelines';
import { markConversationRead, getConversations } from '../services/messages';
import type { Post } from '../interfaces/Post';
import type { PostComposer } from '../components/post-composer';
import type { Conversation, Account } from '../mastodon/types';

@localized()
@customElement('conversation-thread')
export class ConversationThread extends LitElement {
  @state() private conversation: Conversation | null = null;
  @state() private messages: Post[] = [];
  @state() private loading = true;
  @state() private loadingThread = false;
  @state() private error: string | null = null;
  @state() private participants: Account[] = [];
  @state() private isNewConversation = false;

  @query('post-composer') private replyComposer!: PostComposer;

  private conversationId: string = '';
  private currentUserId: string = '';
  private _scroller: HTMLElement | null = null;

  static styles = [
    css`
      :host {
        display: block;
        height: 100vh;
        max-height: 100vh;
      }

      main {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding-top: calc(46px + env(safe-area-inset-top, 0px));
      }

      .scroller {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 8px 16px 16px;
      }

      .messages-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 720px;
        margin: 0 auto;
        padding-bottom: 8px;
      }

      /* Message bubble */
      .message {
        display: flex;
        gap: 8px;
        max-width: 85%;
        animation: messageFadeIn 0.3s cubic-bezier(0.2, 0, 0, 1) both;
      }

      .message.theirs {
        align-self: flex-start;
      }

      .message.mine {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      .message-avatar {
        width: 32px;
        height: 32px;
        border-radius: var(--md-sys-shape-corner-circle);
        object-fit: cover;
        flex-shrink: 0;
        align-self: flex-end;
      }

      .message.mine .message-avatar {
        display: none;
      }

      .bubble {
        padding: 10px 14px;
        border-radius: var(--md-sys-shape-corner-large);
        font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
        line-height: 1.5;
        word-break: break-word;
        position: relative;
      }

      .message.theirs .bubble {
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #ffffff) 8%,
          transparent
        );
        border-bottom-left-radius: 4px;
      }

      .message.mine .bubble {
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #d0bcff) 20%,
          transparent
        );
        border-bottom-right-radius: 4px;
      }

      .bubble-content {
        overflow: hidden;
      }

      .bubble-content p {
        margin: 0;
      }

      .bubble-content a {
        color: var(--md-sys-color-primary, #d0bcff);
        text-decoration: none;
      }

      .bubble-content a:hover {
        text-decoration: underline;
      }

      .bubble-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
      }

      .bubble-sender {
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        font-weight: 600;
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .bubble-time {
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        opacity: 0.7;
      }

      /* Media in bubbles */
      .bubble-media {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
        border-radius: var(--md-sys-shape-corner-medium);
        overflow: hidden;
      }

      .bubble-media img,
      .bubble-media video {
        max-width: 100%;
        max-height: 300px;
        border-radius: var(--md-sys-shape-corner-small);
        object-fit: cover;
      }

      /* Composer footer */
      .composer-footer {
        flex-shrink: 0;
        border-top: 1px solid
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
        padding: 6px 12px;
        max-width: 720px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #ffffff) 3%,
          var(--md-sys-color-background, #1c1b1f)
        );
      }

      /* Empty / loading / error states */
      .state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center;
        gap: 12px;
      }

      .error-message {
        color: var(--md-sys-color-error, #ffb4ab);
      }

      /* Participant header bar */
      .participants-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        max-width: 720px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }

      .participants-avatars {
        display: flex;
      }

      .participants-avatars img {
        width: 28px;
        height: 28px;
        border-radius: var(--md-sys-shape-corner-circle);
        object-fit: cover;
        margin-left: -8px;
        border: 2px solid var(--md-sys-color-surface, #1c1b1f);
      }

      .participants-avatars img:first-child {
        margin-left: 0;
      }

      .participants-names {
        font-size: var(--md-sys-typescale-title-small-font-size, 14px);
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        flex: 1;
      }

      /* Date separator */
      .date-separator {
        text-align: center;
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        padding: 12px 0 4px;
        opacity: 0.7;
      }

      /* Skeleton loading bubbles */
      .skeleton-bubble {
        display: flex;
        gap: 8px;
        max-width: 65%;
      }

      .skeleton-bubble.left {
        align-self: flex-start;
      }

      .skeleton-bubble.right {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      .skeleton-avatar-sm {
        width: 32px;
        height: 32px;
        border-radius: var(--md-sys-shape-corner-circle);
        background: var(
          --md-sys-color-outline-variant,
          rgba(255, 255, 255, 0.08)
        );
        flex-shrink: 0;
        animation: skeletonPulse 1.5s ease-in-out infinite;
      }

      .skeleton-bubble.right .skeleton-avatar-sm {
        display: none;
      }

      .skeleton-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .skeleton-bar {
        height: 10px;
        border-radius: var(--md-sys-shape-corner-small);
        background: var(
          --md-sys-color-outline-variant,
          rgba(255, 255, 255, 0.08)
        );
        animation: skeletonPulse 1.5s ease-in-out infinite;
      }

      .skeleton-bar.w1 {
        width: 140px;
      }
      .skeleton-bar.w2 {
        width: 200px;
      }
      .skeleton-bar.w3 {
        width: 100px;
      }

      @keyframes skeletonPulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 1;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes messageFadeIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (prefers-color-scheme: light) {
        .message.theirs .bubble {
          background: color-mix(
            in srgb,
            var(--md-sys-color-on-surface, #000000) 8%,
            transparent
          );
        }

        .message.mine .bubble {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary, #6750a4) 15%,
            transparent
          );
        }
      }
    `,
  ];

  private _onSWMessage = (event: MessageEvent) => {
    if (
      event.data?.type === 'push-notification' &&
      event.data.notificationType === 'mention'
    ) {
      // A mention push arrived (could be a DM reply) -- refresh the thread
      this._refreshThread();
    }
  };

  async connectedCallback() {
    super.connectedCallback();

    this.currentUserId = localStorage.getItem('currentUserID') || '';

    // Listen for push notifications forwarded from the service worker
    navigator.serviceWorker?.addEventListener('message', this._onSWMessage);

    // Extract conversation ID from URL
    const pathMatch = window.location.pathname.match(/\/messages\/(.+)/);
    if (pathMatch) {
      this.conversationId = pathMatch[1];
    }

    // Check for navigation state
    const navState = router.getNavigationState<AppNavigationState>();

    // New conversation with a specific recipient (no existing thread)
    if (navState?.newRecipient || this.conversationId === 'new') {
      this.isNewConversation = true;
      this.loading = false;
      if (navState?.newRecipient) {
        this.participants = [navState.newRecipient];
      }
      // Pre-fill the composer with the recipient mention after render
      this.updateComplete.then(() => {
        this._prefillMentions();
        this.replyComposer?.focus();
      });
      return;
    }

    if (navState?.conversation) {
      this.conversation = navState.conversation;
      this.participants = this.conversation.accounts;
    }

    if (!this.conversationId) {
      this.error = msg('Conversation not found');
      this.loading = false;
      return;
    }

    await this._loadThread();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    navigator.serviceWorker?.removeEventListener('message', this._onSWMessage);
  }

  protected firstUpdated() {
    this._scroller = this.renderRoot.querySelector('.scroller');
  }

  private async _loadThread() {
    this.loading = true;
    this.error = null;

    try {
      // If we have the conversation from nav state, use its last_status
      let lastStatus: Post | null =
        (this.conversation?.last_status as Post) ?? null;

      if (!lastStatus) {
        // Try to find the conversation to get its last status
        const convs = await getConversations();
        const conv = convs.find((c) => c.id === this.conversationId);
        if (conv) {
          this.conversation = conv;
          this.participants = conv.accounts;
          lastStatus = conv.last_status as Post | null;
        }
      }

      if (!lastStatus) {
        this.error = msg('No messages in this conversation');
        this.loading = false;
        return;
      }

      this.loading = false;
      this.loadingThread = true;

      // Fetch the full thread context
      const context = await getStatusContext(lastStatus.id);

      // Combine: ancestors + focal status + descendants
      const allMessages = [
        ...context.ancestors,
        lastStatus,
        ...context.descendants,
      ];

      // Filter to only direct messages (visibility === 'direct')
      this.messages = allMessages.filter((m) => m.visibility === 'direct');

      // If no messages after filtering, include all
      if (this.messages.length === 0) {
        this.messages = allMessages;
      }

      // Extract unique participants from messages
      if (this.participants.length === 0) {
        const seen = new Set<string>();
        for (const m of this.messages) {
          if (!seen.has(m.account.id) && m.account.id !== this.currentUserId) {
            seen.add(m.account.id);
            this.participants.push(m.account as Account);
          }
        }
      }

      // Mark as read
      if (this.conversation?.unread) {
        markConversationRead(this.conversationId).catch((err) =>
          console.warn('[ConversationThread] Failed to mark read:', err)
        );
      }

      this.loadingThread = false;

      // Scroll to bottom and pre-fill mentions after render
      await this.updateComplete;
      this._scrollToBottom();
      this._prefillMentions();
    } catch (err) {
      console.error('[ConversationThread] Failed to load thread:', err);
      this.error = msg('Failed to load conversation');
      this.loading = false;
      this.loadingThread = false;
    }
  }

  private _scrollToBottom() {
    if (this._scroller) {
      this._scroller.scrollTop = this._scroller.scrollHeight;
    }
  }

  private async _handleReplyPublished() {
    // If this was a brand-new conversation, reload conversations to find it
    if (this.isNewConversation) {
      this.isNewConversation = false;
      try {
        const convs = await getConversations();
        // Find the conversation with our recipient
        const recipientId = this.participants[0]?.id;
        const newConv = recipientId
          ? convs.find((c) => c.accounts.some((a) => a.id === recipientId))
          : convs[0];
        if (newConv) {
          this.conversation = newConv;
          this.conversationId = newConv.id;
          await this._loadThread();
        }
      } catch (err) {
        console.error('[ConversationThread] Failed to load new conv:', err);
      }
      return;
    }

    // Re-fetch the thread to show the new message
    const lastStatus = this.conversation?.last_status as Post | null;
    if (!lastStatus) return;

    try {
      const context = await getStatusContext(lastStatus.id);
      const allMessages = [
        ...context.ancestors,
        lastStatus,
        ...context.descendants,
      ];
      this.messages = allMessages.filter((m) => m.visibility === 'direct');
      if (this.messages.length === 0) {
        this.messages = allMessages;
      }

      // Update reply target and pre-fill mentions for the next message
      await this.updateComplete;
      if (this.replyComposer && this.messages.length > 0) {
        this.replyComposer.replyTo = this.messages[this.messages.length - 1];
      }
      this._prefillMentions();
      this._scrollToBottom();
    } catch (err) {
      console.error('[ConversationThread] Failed to refresh thread:', err);
    }
  }

  /**
   * Get the last message in the thread to use as in_reply_to_id for proper threading.
   */
  private _getReplyTarget(): Post | null {
    if (this.messages.length > 0) {
      return this.messages[this.messages.length - 1];
    }
    return (this.conversation?.last_status as Post) ?? null;
  }

  private _prefillMentions() {
    if (!this.replyComposer || this.participants.length === 0) return;

    const mentions = this.participants
      .filter((p) => p.id !== this.currentUserId)
      .map((p) => `@${p.acct}`)
      .join(' ');

    if (mentions && this.replyComposer.value === '') {
      this.replyComposer.value = mentions + ' ';
    }
  }

  private _getParticipantNames(): string {
    if (this.participants.length === 0) return msg('Conversation');
    return this.participants
      .map((a) => a.display_name || a.username)
      .join(', ');
  }

  private _formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private _formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return msg('Today');
    if (diffDays === 1) return msg('Yesterday');
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined,
    });
  }

  private _shouldShowDateSeparator(
    current: Post,
    previous: Post | null
  ): boolean {
    if (!previous) return true;
    const currentDate = new Date(current.created_at).toDateString();
    const prevDate = new Date(previous.created_at).toDateString();
    return currentDate !== prevDate;
  }

  render() {
    return html`
      <app-header .enableBack=${true}></app-header>
      <main>
        ${this._renderParticipantsBar()}

        <div class="scroller scrollbar-hidden">
          ${this.loading
            ? html`
                <div class="messages-container">
                  ${this._renderSkeletonBubbles()}
                </div>
              `
            : this.error
              ? html`
                  <div class="state-container">
                    <span class="error-message">${this.error}</span>
                    <md-button @click=${this._loadThread}>
                      ${msg('Retry')}
                    </md-button>
                  </div>
                `
              : html`
                  <div class="messages-container">
                    ${this.loadingThread
                      ? this._renderSkeletonBubbles()
                      : nothing}
                    ${this.messages.map((message, index) =>
                      this._renderMessage(
                        message,
                        index > 0 ? this.messages[index - 1] : null
                      )
                    )}
                  </div>
                `}
        </div>

        ${!this.loading && !this.error
          ? html`
              <div class="composer-footer">
                <post-composer
                  compact
                  hideReplyIndicator
                  hideDrafts
                  rows="1"
                  .replyTo=${this._getReplyTarget()}
                  .visibility=${'direct'}
                  placeholder=${msg('Write a message...')}
                  @published=${() => this._handleReplyPublished()}
                ></post-composer>
              </div>
            `
          : nothing}
      </main>
    `;
  }

  private async _refreshThread() {
    if (this.loadingThread || this.isNewConversation) return;

    const lastStatus = this.conversation?.last_status as Post | null;
    if (!lastStatus) return;

    this.loadingThread = true;
    try {
      const context = await getStatusContext(lastStatus.id);
      const allMessages = [
        ...context.ancestors,
        lastStatus,
        ...context.descendants,
      ];
      let filtered = allMessages.filter((m) => m.visibility === 'direct');
      if (filtered.length === 0) filtered = allMessages;

      this.messages = filtered;
      this.loadingThread = false;

      await this.updateComplete;
      this._scrollToBottom();
    } catch (err) {
      console.error('[ConversationThread] Refresh failed:', err);
      this.loadingThread = false;
    }
  }

  private _renderSkeletonBubbles() {
    return html`
      <div class="skeleton-bubble left">
        <div class="skeleton-avatar-sm"></div>
        <div class="skeleton-content">
          <div class="skeleton-bar w2"></div>
          <div class="skeleton-bar w3"></div>
        </div>
      </div>
      <div class="skeleton-bubble right">
        <div class="skeleton-content">
          <div class="skeleton-bar w1"></div>
        </div>
      </div>
      <div class="skeleton-bubble left">
        <div class="skeleton-avatar-sm"></div>
        <div class="skeleton-content">
          <div class="skeleton-bar w1"></div>
          <div class="skeleton-bar w2"></div>
        </div>
      </div>
      <div class="skeleton-bubble right">
        <div class="skeleton-content">
          <div class="skeleton-bar w2"></div>
        </div>
      </div>
    `;
  }

  private _renderParticipantsBar() {
    if (this.participants.length === 0) return nothing;

    return html`
      <div class="participants-bar">
        <div class="participants-avatars">
          ${this.participants
            .slice(0, 4)
            .map(
              (p) => html`
                <img
                  src="${p.avatar}"
                  alt="${p.display_name || p.username}"
                  loading="lazy"
                />
              `
            )}
        </div>
        <span class="participants-names">${this._getParticipantNames()}</span>
        <md-icon-button
          src="/assets/refresh-circle-outline.svg"
          label=${msg('Refresh')}
          @click=${() => this._refreshThread()}
        ></md-icon-button>
      </div>
    `;
  }

  private _renderMessage(message: Post, previousMessage: Post | null) {
    const isMine = message.account.id === this.currentUserId;
    const showDate = this._shouldShowDateSeparator(message, previousMessage);

    return html`
      ${showDate
        ? html`<div class="date-separator">
            ${this._formatDate(message.created_at)}
          </div>`
        : nothing}
      <div class="message ${isMine ? 'mine' : 'theirs'}">
        <img
          class="message-avatar"
          src="${message.account.avatar}"
          alt="${message.account.display_name || message.account.username}"
          loading="lazy"
        />
        <div class="bubble">
          ${!isMine && this.participants.length > 1
            ? html`<span class="bubble-sender"
                >${message.account.display_name ||
                message.account.username}</span
              >`
            : nothing}
          <div class="bubble-content">${unsafeHTML(message.content)}</div>
          ${message.media_attachments && message.media_attachments.length > 0
            ? html`
                <div class="bubble-media">
                  ${message.media_attachments.map((media) =>
                    media.type === 'video'
                      ? html`<video
                          src="${media.url}"
                          controls
                          preload="metadata"
                        ></video>`
                      : media.type === 'audio'
                        ? html`<audio
                            controls
                            src="${media.url}"
                            preload="metadata"
                            style="width: 100%;"
                            aria-label=${media.description || msg('Audio')}
                          ></audio>`
                        : html`<img
                            src="${media.preview_url || media.url}"
                            alt="${media.description || ''}"
                            loading="lazy"
                          />`
                  )}
                </div>
              `
            : nothing}
          <div class="bubble-meta">
            <span class="bubble-time"
              >${this._formatTime(message.created_at)}</span
            >
          </div>
        </div>
      </div>
    `;
  }
}
