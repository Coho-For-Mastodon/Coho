import { LitElement, html } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/search';
import '../components/media-timeline';
import '../components/post-detail-dialog';
import '../components/timeline-item';
import { router } from '../router/routes';
import { searchPageStyles } from '../styles/search-page-styles';

import '../components/md/md-skeleton';
import '../components/md/md-skeleton-card';

import '../components/md/md-segmented-button';
import { parseEmojis } from '../utils/emoji-parser';
import type { Account } from '../mastodon/types';
import type { Suggestion } from '../mastodon/types/suggestion';
import type { TrendingTag, TrendingLink } from '../mastodon/types/instance';
import type { Post } from '../interfaces/Post';
import type { PostDetailDialog } from '../components/post-detail-dialog';

interface SearchData {
  query?: string;
  accounts?: Account[];
  statuses?: Post[];
  hashtags?: TrendingTag[];
}

@localized()
@customElement('search-page')
export class SearchPage extends LitElement {
  @state() searchData: SearchData | undefined;
  @state() trending: Post[] | undefined;
  @state() trendingLinks: TrendingLink[] | undefined;
  @state() suggestions: Suggestion[] | undefined;
  @state() activeSegment: string = 'trending';
  @state() private trendingLoading = false;
  @state() private newsLoading = false;
  @state() private suggestionsLoading = false;
  @state() private trendingError: string | undefined;
  @state() private newsError: string | undefined;
  @state() private suggestionsError: string | undefined;
  @state() private userHasSearched = false;

  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;
  private trendingPromise: Promise<void> | null = null;
  private newsPromise: Promise<void> | null = null;
  private suggestionsPromise: Promise<void> | null = null;
  private prefetchScheduled = false;

  static styles = searchPageStyles;

  connectedCallback() {
    super.connectedCallback();
    void this.loadTrendingIfNeeded();
    void this.loadSuggestionsIfNeeded();
  }

  private async loadSuggestionsIfNeeded(): Promise<void> {
    if (this.suggestions || this.suggestionsPromise) {
      return this.suggestionsPromise ?? Promise.resolve();
    }

    this.suggestionsLoading = true;
    this.suggestionsError = undefined;
    this.suggestionsPromise = (async () => {
      const { getSuggestions } = await import('../mastodon/api/suggestions');
      this.suggestions = await getSuggestions(40);
    })()
      .catch((error: unknown) => {
        console.error('Error fetching suggestions', error);
        this.suggestionsError = msg('Unable to load suggestions right now.');
      })
      .finally(() => {
        this.suggestionsLoading = false;
        this.suggestionsPromise = null;
      });

    return this.suggestionsPromise;
  }

  private async loadTrendingIfNeeded(): Promise<void> {
    if (this.trending || this.trendingPromise) {
      return this.trendingPromise ?? Promise.resolve();
    }

    this.trendingLoading = true;
    this.trendingError = undefined;
    this.trendingPromise = (async () => {
      const { getTrendingStatuses } = await import('../services/timeline');
      this.trending = await getTrendingStatuses();
    })()
      .catch((error: unknown) => {
        console.error('Error fetching trending statuses', error);
        this.trendingError = msg('Unable to load trending posts right now.');
      })
      .finally(() => {
        this.trendingLoading = false;
        this.trendingPromise = null;
      });

    return this.trendingPromise;
  }

  private async loadNewsIfNeeded(): Promise<void> {
    if (this.trendingLinks || this.newsPromise) {
      return this.newsPromise ?? Promise.resolve();
    }

    this.newsLoading = true;
    this.newsError = undefined;
    this.newsPromise = (async () => {
      const { getTrendingLinks } = await import('../services/timeline');
      this.trendingLinks = await getTrendingLinks();
    })()
      .catch((error: unknown) => {
        console.error('Error fetching trending links', error);
        this.newsError = msg('Unable to load news right now.');
      })
      .finally(() => {
        this.newsLoading = false;
        this.newsPromise = null;
      });

    return this.newsPromise;
  }

  private scheduleIdlePrefetch() {
    if (this.prefetchScheduled || !this.searchData) return;
    this.prefetchScheduled = true;

    const runPrefetch = async () => {
      try {
        await this.loadSuggestionsIfNeeded();
        await this.loadTrendingIfNeeded();
        await this.loadNewsIfNeeded();
      } finally {
        // Keep the scheduling guard active until the prefetch work finishes.
        this.prefetchScheduled = false;
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          void runPrefetch();
        },
        { timeout: 1000 }
      );
      return;
    }

    globalThis.setTimeout(() => {
      void runPrefetch();
    }, 250);
  }

  private handleSegmentChange(e: CustomEvent<{ value: string }>) {
    this.activeSegment = e.detail.value;

    if (this.activeSegment === 'for-you') {
      void this.loadSuggestionsIfNeeded();
    }

    if (this.activeSegment === 'trending') {
      void this.loadTrendingIfNeeded();
    }

    if (this.activeSegment === 'news') {
      void this.loadNewsIfNeeded();
    }
  }

  async handleSearch(search: {
    searchData: SearchData;
    isAutoSearch?: boolean;
  }) {
    this.searchData = search.searchData;

    if (!search.isAutoSearch) {
      this.userHasSearched = true;

      // Switch to For You tab so users see account search results immediately
      if (this.searchData.accounts && this.searchData.accounts.length > 0) {
        this.activeSegment = 'for-you';
      }
    }

    this.scheduleIdlePrefetch();
  }

  openAccount(id: string) {
    router.navigate(`/account?id=${id}`);
  }

  handleHashtagClick(hashtag: string) {
    router.navigate(`/hashtag?tag=${hashtag}`);
  }

  private handleOpenPost(tweet: Post) {
    this.postDetailDialog?.open(tweet);
  }

  /**
   * Strip HTML tags from a string (for bio/note display)
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    let processed = html.replace(/<br\s*\/?>/gi, ' ');
    processed = processed.replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ');
    const tmp = document.createElement('div');
    tmp.innerHTML = processed;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Format large numbers with K/M suffixes
   */
  private formatNumber(num: number): string {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  }

  private renderAccountSkeletons() {
    return html`
      <ul id="accountsList">
        ${[1, 2, 3, 4, 5, 6].map(
          () => html`
            <li class="account-card-skeleton">
              <div class="skeleton-header"></div>
              <div class="skeleton-body">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                  <div class="skeleton-line medium"></div>
                  <div class="skeleton-line short"></div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line medium"></div>
                  <div class="skeleton-stats">
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                  </div>
                </div>
              </div>
            </li>
          `
        )}
      </ul>
    `;
  }

  private renderAccountCards(accounts: Account[]) {
    return html`
      <ul id="accountsList">
        ${accounts.map((account) => {
          return html`
            <li
              class="account-card"
              @click="${() => this.openAccount(account.id)}"
            >
              <div class="card-header">
                ${
                  account.header && !account.header.includes('missing')
                    ? html`<img
                        class="card-header-image"
                        src="${account.header}"
                        alt=""
                        loading="lazy"
                      />`
                    : null
                }
              </div>
              <img
                class="card-avatar"
                src="${account.avatar}"
                alt="${account.display_name || account.username}"
                loading="lazy"
              />
              <div class="card-body">
                <div class="card-identity">
                  <p class="card-display-name">
                    <span
                      .innerHTML="${parseEmojis(
                        account.display_name || account.username,
                        account.emojis || [],
                        true
                      )}"
                    ></span>
                    ${
                      account.bot
                        ? html`<span class="bot-badge">${msg('Bot')}</span>`
                        : null
                    }
                  </p>
                  <p class="card-username">@${account.acct}</p>
                </div>
                <p class="card-bio">${this.stripHtml(account.note)}</p>
                <div class="card-stats">
                  <div class="stat">
                    <span class="stat-value"
                      >${this.formatNumber(account.followers_count)}</span
                    >
                    <span class="stat-label">${msg('Followers')}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value"
                      >${this.formatNumber(account.following_count)}</span
                    >
                    <span class="stat-label">${msg('Following')}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value"
                      >${this.formatNumber(account.statuses_count)}</span
                    >
                    <span class="stat-label">${msg('Posts')}</span>
                  </div>
                </div>
              </div>
            </li>
          `;
        })}
      </ul>
    `;
  }

  render() {
    return html`
      <section>
        <app-search
          @search="${(
            e: CustomEvent<{ searchData: SearchData; isAutoSearch?: boolean }>
          ) => this.handleSearch(e.detail)}"
          @search-cleared="${() => {
            this.userHasSearched = false;
          }}"
        ></app-search>

        <md-segmented-button
          .value="${this.activeSegment}"
          aria-label="${msg('Search categories')}"
          @segment-change="${this.handleSegmentChange}"
        >
          <md-segment value="trending">${msg('Trending')}</md-segment>
          <md-segment value="for-you">${msg('Accounts')}</md-segment>
          <md-segment value="statuses">${msg('Posts')}</md-segment>
          <md-segment value="hashtags">${msg('Hashtags')}</md-segment>
          <md-segment value="news">${msg('News')}</md-segment>
        </md-segmented-button>

        <div class="panel ${this.activeSegment === 'for-you' ? 'active' : ''}">
          ${
            this.userHasSearched &&
            this.searchData &&
            this.searchData.accounts &&
            this.searchData.accounts.length > 0
              ? this.renderAccountCards(this.searchData.accounts)
              : this.suggestionsLoading
                ? this.renderAccountSkeletons()
                : this.suggestionsError
                  ? html`<p>${this.suggestionsError}</p>`
                  : this.suggestions && this.suggestions.length > 0
                    ? this.renderAccountCards(
                        this.suggestions.map((s) => s.account)
                      )
                    : null
          }
        </div>

        <div class="panel ${this.activeSegment === 'statuses' ? 'active' : ''}">
          <ul>
            ${
              this.searchData && this.searchData.statuses
                ? this.searchData.statuses.map((status) => {
                    return html`<li>
                      <timeline-item
                        .tweet="${status}"
                        @open="${(e: CustomEvent<{ tweet: Post }>) =>
                          this.handleOpenPost(e.detail.tweet)}"
                      ></timeline-item>
                    </li>`;
                  })
                : null
            }
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'trending' ? 'active' : ''}">
          <ul>
            ${
              this.trendingLoading
                ? html`<li><md-skeleton-card count="5"></md-skeleton-card></li>`
                : this.trendingError
                  ? html`<li>${this.trendingError}</li>`
                  : this.trending
                    ? this.trending.map((status) => {
                        return html`<li>
                          <timeline-item
                            .tweet="${status}"
                            @open="${(e: CustomEvent<{ tweet: Post }>) =>
                              this.handleOpenPost(e.detail.tweet)}"
                          ></timeline-item>
                        </li>`;
                      })
                    : null
            }
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'news' ? 'active' : ''}">
          <ul id="newsList">
            ${
              this.newsLoading
                ? html`<li><md-skeleton></md-skeleton></li>`
                : this.newsError
                  ? html`<li>${this.newsError}</li>`
                  : this.trendingLinks
                    ? this.trendingLinks.map((link) => {
                        return html` <li>
                          <img src="${link.image}" alt="${link.description}" />

                          <h3>${link.title}</h3>
                          <a href="${link.url}" target="_blank">${link.url}</a>

                          <p>${link.description}</p>
                        </li>`;
                      })
                    : null
            }
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'hashtags' ? 'active' : ''}">
          ${
            this.searchData && this.searchData.hashtags
              ? html`
                  <ul id="hashtagsList" role="list">
                    ${this.searchData.hashtags.map((hashtag) => {
                      return html`<li
                        tabindex="0"
                        role="button"
                        @click="${() => this.handleHashtagClick(hashtag.name)}"
                        @keydown="${(e: KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.handleHashtagClick(hashtag.name);
                          }
                        }}"
                      >
                        <div class="account">#${hashtag.name}</div>
                      </li>`;
                    })}
                  </ul>
                `
              : null
          }
        </div>
      </section>

      <!-- Post Detail Dialog -->
      <post-detail-dialog></post-detail-dialog>
    `;
  }
}
