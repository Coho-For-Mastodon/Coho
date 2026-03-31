import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/search';
import '../components/media-timeline';
import '../components/post-detail-dialog';
import '../components/timeline-item';
import { router } from '../router/routes';

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

  static styles = [
    css`
      :host {
        display: block;
        max-width: 100%;
        overflow-x: hidden;

        content-visibility: auto;
        contain: layout style paint;
      }

      md-segmented-button {
        margin-bottom: 16px;
      }

      .panel {
        display: none;
        animation: slideFromLeft 0.3s ease-in-out;
      }

      .panel.active {
        display: block;
      }

      app-search {
        margin-bottom: 16px;
      }

      main {
        padding-left: 0px;
        padding-right: 0px;
        padding-top: 0px;
      }

      md-skeleton {
        height: 20px;
        width: 138px;
      }

      /* Account Cards Grid */
      #accountsList {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        grid-auto-rows: min-content;
        gap: 16px;
        margin: 0;
        padding: 4px;
        list-style: none;
        height: 74vh;
        overflow-y: auto;
        overflow-x: hidden;
        align-content: start;
        max-width: 100%;
        box-sizing: border-box;
      }

      #accountsList > li {
        display: flex !important;
        flex-direction: column !important;
        height: auto !important;
        min-height: 240px;
        min-width: 0;
      }

      .account-card {
        position: relative;
        border-radius: var(--md-sys-shape-corner-large);
        overflow: visible;
        cursor: pointer;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
        min-width: 0;
      }

      .account-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      }

      .account-card:active {
        transform: translateY(-2px);
      }

      .card-header {
        position: relative;
        height: 128px;
        min-height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        overflow: hidden;
        border-radius: var(--md-sys-shape-corner-large)
          var(--md-sys-shape-corner-large) 0 0;
      }

      .card-header-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.85;
      }

      .card-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: linear-gradient(
          to top,
          rgba(26, 26, 29, 1) 0%,
          transparent 100%
        );
        pointer-events: none;
      }

      .card-avatar {
        position: absolute;
        top: 95px;
        left: 14px;
        width: 56px;
        height: 56px;
        border-radius: var(--md-sys-shape-corner-circle);
        border: 3px solid #1a1a1d;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 2;
        object-fit: cover;
        background: #2d2d33;
      }

      .card-body {
        padding: 38px 16px 16px 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border-radius: 0 0 var(--md-sys-shape-corner-large)
          var(--md-sys-shape-corner-large);
        overflow: hidden;
        min-width: 0;
      }

      /* Hashtags List */
      #hashtagsList {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
        height: 74vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      #hashtagsList li {
        padding: 12px 14px;
        border-radius: var(--md-sys-shape-corner-medium);
        background: var(--md-sys-color-surface-container, #2d2d33);
        cursor: pointer;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
      }

      #hashtagsList li:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      }

      .card-identity {
        margin-bottom: 10px;
      }

      .card-display-name {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 2px 0;
        display: flex;
        align-items: center;
        gap: 6px;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .card-display-name .bot-badge {
        font-size: 9px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: var(--md-sys-shape-corner-extra-small);
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
        border: 1px solid rgba(102, 126, 234, 0.3);
      }

      .card-username {
        font-size: 13px;
        color: #888;
        margin: 0;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .card-bio {
        font-size: 13px;
        color: #b0b0b0;
        margin: 0 0 14px 0;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-height: 40px;
      }

      .card-bio:empty {
        min-height: 0;
      }

      .card-stats {
        display: flex;
        gap: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .stat {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      /* Skeleton loading cards */
      .account-card-skeleton {
        border-radius: var(--md-sys-shape-corner-large);
        overflow: hidden;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .skeleton-header {
        height: 80px;
        min-height: 80px;
        background: linear-gradient(
          90deg,
          #2d2d33 25%,
          #3d3d43 50%,
          #2d2d33 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: var(--md-sys-shape-corner-large)
          var(--md-sys-shape-corner-large) 0 0;
      }

      .skeleton-body {
        padding: 16px;
        position: relative;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border-radius: 0 0 var(--md-sys-shape-corner-large)
          var(--md-sys-shape-corner-large);
      }

      .skeleton-avatar {
        width: 56px;
        height: 56px;
        border-radius: var(--md-sys-shape-corner-circle);
        background: linear-gradient(
          90deg,
          #2d2d33 25%,
          #3d3d43 50%,
          #2d2d33 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        position: absolute;
        top: -28px;
        left: 16px;
        border: 3px solid #1a1a1d;
      }

      .skeleton-content {
        margin-top: 32px;
      }

      .skeleton-line {
        height: 14px;
        border-radius: var(--md-sys-shape-corner-extra-small);
        background: linear-gradient(
          90deg,
          #2d2d33 25%,
          #3d3d43 50%,
          #2d2d33 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        margin-bottom: 8px;
      }

      .skeleton-line.short {
        width: 60%;
      }

      .skeleton-line.medium {
        width: 80%;
      }

      .skeleton-stats {
        display: flex;
        gap: 16px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .skeleton-stat {
        width: 50px;
        height: 30px;
        border-radius: var(--md-sys-shape-corner-extra-small);
        background: linear-gradient(
          90deg,
          #2d2d33 25%,
          #3d3d43 50%,
          #2d2d33 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      /* Other lists */
      ul {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin: 0;
        padding: 0;
        list-style: none;

        height: 74vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }

      media-timeline {
        height: 70vh;
      }

      li {
        cursor: pointer;
      }

      #searchResults {
        display: flex;
        column-gap: 8px;
        padding-top: 8px;
      }

      #searchResults section {
        flex: 1;

        background: #242428;
        border-radius: var(--md-sys-shape-corner-small);
        padding: 8px;
        padding-top: 0;
      }

      @keyframes slideFromLeft {
        from {
          transform: translateX(-30%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      #newsList li {
        padding: 8px;
        background: #f3f3f3;
        border-radius: var(--md-sys-shape-corner-small);
      }

      #newsList li img {
        width: 100%;
        border-radius: var(--md-sys-shape-corner-extra-small);
        margin-bottom: 10px;
      }

      #newsList li h3 {
        margin-top: 0px;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 0;
          padding-right: 0;
        }

        #accountsList {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 600px) {
        .card-header {
          height: 70px;
        }

        .card-avatar {
          top: 40px;
          width: 48px;
          height: 48px;
        }

        .card-body {
          padding-top: 28px;
        }
      }

      @media (prefers-color-scheme: light) {
        .account-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f8fa 100%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .account-card:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }

        .card-header::after {
          background: linear-gradient(
            to top,
            rgba(255, 255, 255, 1) 0%,
            transparent 100%
          );
        }

        .card-body {
          background: linear-gradient(145deg, #ffffff 0%, #f8f8fa 100%);
        }

        .card-avatar {
          border-color: #ffffff;
        }

        .card-display-name {
          color: #1a1a1d;
        }

        .card-username {
          color: #666;
        }

        .card-bio {
          color: #555;
        }

        .card-stats {
          border-top-color: rgba(0, 0, 0, 0.06);
        }

        .stat-value {
          color: #1a1a1d;
        }

        .stat-label {
          color: #888;
        }

        .account-card-skeleton {
          background: linear-gradient(145deg, #ffffff 0%, #f8f8fa 100%);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .skeleton-header,
        .skeleton-avatar,
        .skeleton-line {
          background: linear-gradient(
            90deg,
            #e8e8e8 25%,
            #f4f4f4 50%,
            #e8e8e8 75%
          );
          background-size: 200% 100%;
        }

        .skeleton-avatar {
          border-color: #ffffff;
        }

        .skeleton-body {
          background: linear-gradient(145deg, #ffffff 0%, #f8f8fa 100%);
        }
      }

      @media (prefers-color-scheme: dark) {
        #newsList li h3,
        #newsList li p {
          color: white;
        }

        #newsList li p {
          color: #9a9999;
        }

        #newsList li a {
          color: white;
        }

        #newsList li {
          background: rgb(32 32 35);
          border-radius: var(--md-sys-shape-corner-small);
        }
      }
    `,
  ];

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
                ${account.header && !account.header.includes('missing')
                  ? html`<img
                      class="card-header-image"
                      src="${account.header}"
                      alt=""
                      loading="lazy"
                    />`
                  : null}
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
                    ${account.bot
                      ? html`<span class="bot-badge">${msg('Bot')}</span>`
                      : null}
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
          ${this.userHasSearched &&
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
                  : null}
        </div>

        <div class="panel ${this.activeSegment === 'statuses' ? 'active' : ''}">
          <ul>
            ${this.searchData && this.searchData.statuses
              ? this.searchData.statuses.map((status) => {
                  return html`<li>
                    <timeline-item
                      .tweet="${status}"
                      @open="${(e: CustomEvent<{ tweet: Post }>) =>
                        this.handleOpenPost(e.detail.tweet)}"
                    ></timeline-item>
                  </li>`;
                })
              : null}
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'trending' ? 'active' : ''}">
          <ul>
            ${this.trendingLoading
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
                  : null}
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'news' ? 'active' : ''}">
          <ul id="newsList">
            ${this.newsLoading
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
                  : null}
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'hashtags' ? 'active' : ''}">
          ${this.searchData && this.searchData.hashtags
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
            : null}
        </div>
      </section>

      <!-- Post Detail Dialog -->
      <post-detail-dialog></post-detail-dialog>
    `;
  }
}
