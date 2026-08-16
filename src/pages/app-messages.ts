import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { spinAnimation } from '../styles/animations';
import { appMessagesStyles } from '../styles/app-messages-styles';

import { getConversations, deleteConversation } from '../services/messages';
import { searchAccounts } from '../services/account';
import { router } from '../router/routes';
import type { Conversation, Account } from '../mastodon/types';

import '../components/header';
import '../components/md/md-icon-button';
import '../components/md/md-button';
import '../components/md/md-text-field';
import '../components/md/md-dialog';

@localized()
@customElement('app-messages')
export class AppMessages extends LitElement {
  @state() conversations: Conversation[] = [];
  @state() loading = true;
  @state() loadingMore = false;
  @state() hasMore = true;
  @state() error: string | null = null;

  // New message flow
  @state() showNewMessage = false;
  @state() searchQuery = '';
  @state() searchResults: Account[] = [];
  @state() searching = false;

  private _scrollContainer: HTMLElement | null = null;
  private _searchDebounce: ReturnType<typeof setTimeout> | null = null;

  static styles = [spinAnimation, appMessagesStyles];

  async connectedCallback() {
    super.connectedCallback();
    await this._loadConversations();
  }

  private async _loadConversations() {
    this.loading = true;
    this.error = null;

    try {
      const data = await getConversations();
      this.conversations = data;
      this.hasMore = data.length >= 20;
    } catch (err) {
      console.error('[AppMessages] Failed to load conversations:', err);
      this.error = msg('Failed to load conversations');
    } finally {
      this.loading = false;
    }
  }

  private async _loadMore() {
    if (this.loadingMore || !this.hasMore || this.conversations.length === 0)
      return;

    this.loadingMore = true;

    try {
      const lastId = this.conversations[this.conversations.length - 1].id;
      const more = await getConversations(lastId);

      const existingIds = new Set(this.conversations.map((c) => c.id));
      const newConvs = more.filter((c) => !existingIds.has(c.id));

      if (newConvs.length === 0) {
        this.hasMore = false;
      } else {
        this.conversations = [...this.conversations, ...newConvs];
        this.hasMore = more.length >= 20;
      }
    } catch (err) {
      console.error('[AppMessages] Failed to load more:', err);
    } finally {
      this.loadingMore = false;
    }
  }

  private _handleScroll = () => {
    if (!this._scrollContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = this._scrollContainer;

    if (scrollHeight - scrollTop - clientHeight < 300) {
      this._loadMore();
    }
  };

  protected firstUpdated() {
    this._scrollContainer = this.renderRoot.querySelector('.scroller');
    if (this._scrollContainer) {
      this._scrollContainer.addEventListener('scroll', this._handleScroll, {
        passive: true,
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener('scroll', this._handleScroll);
    }
    if (this._searchDebounce) {
      clearTimeout(this._searchDebounce);
    }
  }

  private _openConversation(conv: Conversation) {
    const lastStatusId = conv.last_status?.id;
    if (!lastStatusId) return;

    router.navigate(`/messages/${conv.id}`, {
      state: { conversation: conv },
    });
  }

  private async _deleteConversation(e: Event, conv: Conversation) {
    e.stopPropagation();
    try {
      await deleteConversation(conv.id);
      this.conversations = this.conversations.filter((c) => c.id !== conv.id);
    } catch (err) {
      console.error('[AppMessages] Failed to delete conversation:', err);
    }
  }

  // New message flow
  private _openNewMessage() {
    this.showNewMessage = true;
    this.searchQuery = '';
    this.searchResults = [];
    // Focus the search input after render
    this.updateComplete.then(() => {
      const input = this.renderRoot.querySelector(
        '#recipient-search'
      ) as HTMLElement | null;
      input?.focus();
    });
  }

  private _closeNewMessage() {
    this.showNewMessage = false;
    this.searchQuery = '';
    this.searchResults = [];
    if (this._searchDebounce) {
      clearTimeout(this._searchDebounce);
    }
  }

  private _handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.searchQuery = value;

    if (this._searchDebounce) {
      clearTimeout(this._searchDebounce);
    }

    if (!value || value.trim().length < 2) {
      this.searchResults = [];
      this.searching = false;
      return;
    }

    this.searching = true;
    this._searchDebounce = setTimeout(async () => {
      try {
        const results = await searchAccounts(value.trim(), 8);
        // Only update if the query hasn't changed since we started
        if (this.searchQuery === value) {
          this.searchResults = results;
        }
      } catch (err) {
        console.error('[AppMessages] Search failed:', err);
      } finally {
        this.searching = false;
      }
    }, 300);
  }

  private _selectRecipient(account: Account) {
    // Check if there's already a conversation with this account
    const existing = this.conversations.find((conv) =>
      conv.accounts.some((a) => a.id === account.id)
    );

    if (existing) {
      // Navigate to the existing conversation
      this._closeNewMessage();
      this._openConversation(existing);
    } else {
      // Navigate to a new conversation thread with this account
      this._closeNewMessage();
      router.navigate(`/messages/new`, {
        state: { newRecipient: account },
      });
    }
  }

  private _stripHtml(htmlStr: string): string {
    const div = document.createElement('div');
    div.innerHTML = htmlStr;
    return div.textContent || div.innerText || '';
  }

  private _formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return msg('now');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  private _getParticipantNames(conv: Conversation): string {
    if (conv.accounts.length === 0) return msg('Unknown');
    return conv.accounts.map((a) => a.display_name || a.username).join(', ');
  }

  render() {
    return html`
      <app-header .enableBack=${true}></app-header>
      <section>
        <div class="title-bar">
          <h1>${msg('Messages')}</h1>
        </div>

        <div class="scroller scrollbar-hidden">
          ${
            this.loading
              ? html`
                  <div class="conversation-list">
                    ${[1, 2, 3, 4, 5, 6].map(
                      () => html`
                        <div class="skeleton-row">
                          <div class="skeleton-avatar"></div>
                          <div class="skeleton-lines">
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line"></div>
                          </div>
                        </div>
                      `
                    )}
                  </div>
                `
              : this.error
                ? html`
                    <div class="error-state">
                      <span class="error-message">${this.error}</span>
                      <md-button @click=${this._loadConversations}>
                        ${msg('Retry')}
                      </md-button>
                    </div>
                  `
                : this.conversations.length === 0
                  ? html`
                      <div class="empty-state">
                        <svg
                          class="empty-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="32"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            d="M408 64H104a56.16 56.16 0 00-56 56v192a56.16 56.16 0 0056 56h40v80l93.72-78.14a8 8 0 015.13-1.86H408a56.16 56.16 0 0056-56V120a56.16 56.16 0 00-56-56z"
                          />
                        </svg>
                        <span class="empty-title"
                          >${msg('No messages yet')}</span
                        >
                        <span class="empty-subtitle"
                          >${msg(
                            'Direct messages will appear here. Tap the compose icon to start a conversation.'
                          )}</span
                        >
                        <md-button
                          variant="filled"
                          @click=${this._openNewMessage}
                        >
                          ${msg('Start a conversation')}
                        </md-button>
                      </div>
                    `
                  : html`
                      <div class="conversation-list">
                        ${this.conversations.map((conv) =>
                          this._renderConversationCard(conv)
                        )}
                        ${
                          this.loadingMore
                            ? html`
                                <div class="loading-more">
                                  <div class="loading-spinner"></div>
                                </div>
                              `
                            : nothing
                        }
                      </div>
                    `
          }

          <div class="fab">
            <md-button
              variant="fab"
              @click=${this._openNewMessage}
              title=${msg('New message')}
            >
              <md-icon src="/assets/create-outline.svg"></md-icon>
            </md-button>
          </div>
        </div>

        ${this._renderNewMessageDialog()}
      </section>
    `;
  }

  private _renderNewMessageDialog() {
    return html`
      <md-dialog
        label=${msg('New message')}
        .open=${this.showNewMessage}
        ?fullscreen=${window.innerWidth <= 820}
        @md-dialog-hide=${this._closeNewMessage}
      >
        <div class="new-message-body">
          <div class="search-row">
            <label>${msg('To:')}</label>
            <md-text-field
              id="recipient-search"
              placeholder=${msg('Search people')}
              .value=${this.searchQuery}
              @input=${this._handleSearchInput}
              type="search"
            ></md-text-field>
          </div>

          <div class="search-results scrollbar-hidden">
            ${
              this.searching
                ? html`<div class="search-hint">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                  </div>`
                : this.searchQuery.trim().length < 2
                  ? html`<div class="search-hint">
                      ${msg('Search for a user to message')}
                    </div>`
                  : this.searchResults.length === 0
                    ? html`<div class="search-hint">
                        ${msg('No users found')}
                      </div>`
                    : this.searchResults.map(
                        (account) => html`
                          <div
                            class="account-row"
                            @click=${() => this._selectRecipient(account)}
                            role="button"
                            tabindex="0"
                            @keydown=${(e: KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                this._selectRecipient(account);
                              }
                            }}
                          >
                            <img
                              class="account-avatar"
                              src="${account.avatar}"
                              alt=""
                              loading="lazy"
                            />
                            <div class="account-info">
                              <div class="account-display-name">
                                ${account.display_name || account.username}
                              </div>
                              <div class="account-handle">@${account.acct}</div>
                            </div>
                          </div>
                        `
                      )
            }
          </div>
        </div>
      </md-dialog>
    `;
  }

  private _renderConversationCard(conv: Conversation) {
    const isMulti = conv.accounts.length > 1;
    const preview = conv.last_status
      ? this._stripHtml(conv.last_status.content)
      : '';
    const time = conv.last_status?.created_at
      ? this._formatTimeAgo(conv.last_status.created_at)
      : '';
    const names = this._getParticipantNames(conv);

    return html`
      <div
        class="conversation-card ${conv.unread ? 'unread' : ''}"
        @click=${() => this._openConversation(conv)}
        role="button"
        tabindex="0"
        aria-label="${names}: ${preview}"
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._openConversation(conv);
          }
        }}
      >
        <div class="avatar-stack ${isMulti ? 'multi' : ''}">
          ${conv.accounts
            .slice(0, 2)
            .map(
              (account) => html`
                <img
                  src="${account.avatar}"
                  alt="${account.display_name || account.username}"
                  loading="lazy"
                />
              `
            )}
          ${conv.unread ? html`<span class="unread-dot"></span>` : nothing}
          ${time ? html`<span class="timestamp">${time}</span>` : nothing}
        </div>

        <div class="conversation-content">
          <span class="display-names">${names}</span>
          ${preview ? html`<span class="preview">${preview}</span>` : nothing}
        </div>

        <md-icon-button
          class="delete-btn"
          src="/assets/close-outline.svg"
          label=${msg('Remove conversation')}
          @click=${(e: Event) => this._deleteConversation(e, conv)}
        ></md-icon-button>
      </div>
    `;
  }
}
