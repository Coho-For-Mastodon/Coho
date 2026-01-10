import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/search';
import '../components/media-timeline';
import { router } from '../utils/router';

import '../components/md/md-skeleton';

import '../components/md/md-segmented-button';
import type { Account } from '../mastodon/types';
import type { TrendingTag, TrendingLink } from '../mastodon/types/instance';
import type { Post } from '../interfaces/Post';

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
  @state() activeSegment: string = 'accounts';

  static styles = [
    css`
      :host {
        display: block;

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
      }

      #accountsList > li {
        display: flex !important;
        flex-direction: column !important;
        height: auto !important;
        min-height: 240px;
      }

      .account-card {
        position: relative;
        border-radius: 16px;
        overflow: visible;
        cursor: pointer;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
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
        border-radius: 16px 16px 0 0;
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

      .card-avatar-wrapper {
        position: relative;
        height: 0;
      }

      .card-avatar {
        position: absolute;
        top: -71px;
        left: -2px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 3px solid #1a1a1d;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 2;
        object-fit: cover;
        background: #2d2d33;
        background: #2d2d33;
      }

      .card-body {
        padding: 38px 16px 16px 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border-radius: 0 0 16px 16px;
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
      }

      .card-display-name .bot-badge {
        font-size: 9px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
        border: 1px solid rgba(102, 126, 234, 0.3);
      }

      .card-username {
        font-size: 13px;
        color: #888;
        margin: 0;
        font-weight: 400;
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
        border-radius: 16px;
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
        border-radius: 16px 16px 0 0;
      }

      .skeleton-body {
        padding: 16px;
        position: relative;
        background: linear-gradient(145deg, #1a1a1d 0%, #2d2d33 100%);
        border-radius: 0 0 16px 16px;
      }

      .skeleton-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
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
        border-radius: 4px;
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
        border-radius: 4px;
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
        border-radius: 6px;
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
        border-radius: 6px;
      }

      #newsList li img {
        width: 100%;
        border-radius: 4px;
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
          top: -58px;
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
          border-radius: 6px;
        }
      }
    `,
  ];

  async handleSearch(search: { searchData: SearchData }) {
    this.searchData = search.searchData;

    const [{ getTrendingStatuses }, { getTrendingLinks }] = await Promise.all([
      import('../services/timeline'),
      import('../services/timeline'),
    ]);

    const [trendingStatuses, trendingLinks] = await Promise.all([
      getTrendingStatuses(),
      getTrendingLinks(),
    ]);

    console.log('trendingStatuses', trendingStatuses);
    this.trending = trendingStatuses;

    console.log('trendingLinks', trendingLinks);
    this.trendingLinks = trendingLinks;
  }

  openAccount(id: string) {
    router.navigate(`/account?id=${id}`);
  }

  handleHashtagClick(hashtag: string) {
    router.navigate(`/hashtag?tag=${hashtag}`);
  }

  /**
   * Strip HTML tags from a string (for bio/note display)
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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

  render() {
    return html`
      <main>
        <app-search
          @search="${(e: CustomEvent<{ searchData: SearchData }>) =>
            this.handleSearch(e.detail)}"
        ></app-search>

        <md-segmented-button
          .value="${this.activeSegment}"
          @segment-change="${(e: CustomEvent) =>
            (this.activeSegment = e.detail.value)}"
        >
          <md-segment value="accounts">${msg('Accounts')}</md-segment>
          <md-segment value="trending">${msg('Trending')}</md-segment>
          <md-segment value="news">${msg('News')}</md-segment>
        </md-segmented-button>

        <div class="panel ${this.activeSegment === 'accounts' ? 'active' : ''}">
          ${this.searchData && this.searchData.accounts
            ? html`
                <ul id="accountsList">
                  ${this.searchData.accounts.map((account) => {
                    return html`
                      <li
                        class="account-card"
                        @click="${() => this.openAccount(account.id)}"
                      >
                        <div class="card-header">
                          ${account.header &&
                          !account.header.includes('missing')
                            ? html`<img
                                class="card-header-image"
                                src="${account.header}"
                                alt=""
                                loading="lazy"
                              />`
                            : null}
                        </div>
                        <div class="card-body">
                          <div class="card-avatar-wrapper">
                            <img
                              class="card-avatar"
                              src="${account.avatar}"
                              alt="${account.display_name || account.username}"
                              loading="lazy"
                            />
                          </div>
                          <div class="card-identity">
                            <p class="card-display-name">
                              ${account.display_name || account.username}
                              ${account.bot
                                ? html`<span class="bot-badge"
                                    >${msg('Bot')}</span
                                  >`
                                : null}
                            </p>
                            <p class="card-username">@${account.acct}</p>
                          </div>
                          <p class="card-bio">
                            ${this.stripHtml(account.note)}
                          </p>
                          <div class="card-stats">
                            <div class="stat">
                              <span class="stat-value"
                                >${this.formatNumber(
                                  account.followers_count
                                )}</span
                              >
                              <span class="stat-label"
                                >${msg('Followers')}</span
                              >
                            </div>
                            <div class="stat">
                              <span class="stat-value"
                                >${this.formatNumber(
                                  account.following_count
                                )}</span
                              >
                              <span class="stat-label"
                                >${msg('Following')}</span
                              >
                            </div>
                            <div class="stat">
                              <span class="stat-value"
                                >${this.formatNumber(
                                  account.statuses_count
                                )}</span
                              >
                              <span class="stat-label">${msg('Posts')}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    `;
                  })}
                </ul>
              `
            : html`
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
              `}
        </div>

        <div class="panel ${this.activeSegment === 'trending' ? 'active' : ''}">
          <ul>
            ${this.trending
              ? this.trending.map((status) => {
                  return html`<timeline-item
                    .tweet="${status}"
                  ></timeline-item>`;
                })
              : null}
          </ul>
        </div>

        <div class="panel ${this.activeSegment === 'news' ? 'active' : ''}">
          <ul id="newsList">
            ${this.trendingLinks
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
                <ul>
                  ${this.searchData && this.searchData.hashtags
                    ? this.searchData.hashtags.map((hashtag) => {
                        return html`<li
                          @click="${() =>
                            this.handleHashtagClick(hashtag.name)}"
                        >
                          <div class="account">#${hashtag.name}</div>
                        </li>`;
                      })
                    : null}
                </ul>
              `
            : null}
        </div>
      </main>
    `;
  }
}
