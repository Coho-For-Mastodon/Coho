import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '../components/search';
import '../components/media-timeline';
import { router } from '../utils/router';

import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';

// import fluent tabs
import {
  fluentTabs,
  fluentTab,
  fluentTabPanel,
  provideFluentDesignSystem,
} from '@fluentui/web-components';
provideFluentDesignSystem().register(fluentTabs());
provideFluentDesignSystem().register(fluentTab());
provideFluentDesignSystem().register(fluentTabPanel());

@customElement('search-page')
export class SearchPage extends LitElement {
  @state() searchData: any | undefined;
  @state() trending: any[] | undefined;
  @state() trendingLinks: any[] | undefined;

  static styles = [
    css`
      :host {
        display: block;

        content-visibility: auto;
        contain: layout style paint;
      }

      @media (prefers-color-scheme: dark) {
        fluent-tab {
          color: white;
        }
      }

      fluent-tab-panel {
        margin-top: 16px;
        animation: slideFromLeft 0.3s ease-in-out;
      }

      main {
        padding-left: 10px;
        padding-right: 10px;
        padding-top: 10px;
      }

      .avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }

      sl-skeleton {
        height: 20px;
        width: 138px;
      }

      .account sl-skeleton {
        margin-bottom: 10px;
      }

      .account {
        display: flex;
        align-items: center;
        gap: 8px;
      }

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

      #newsList li {
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
      }

      @media (prefers-color-scheme: dark) {
        .account {
          color: white;
        }

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

  async handleSearch(search: any) {
    console.log(search);
    this.searchData = search.searchData;

    const { getTrendingStatuses, getTrendingLinks } =
      await import('../services/timeline');

    const trendingStatuses = await getTrendingStatuses();
    console.log('trendingStatuses', trendingStatuses);

    this.trending = trendingStatuses;

    const trendingLinks = await getTrendingLinks();
    console.log('trendingLinks', trendingLinks);

    this.trendingLinks = trendingLinks;
  }

  openAccount(id: string) {
    router.navigate(`/account?id=${id}`);
  }

  handleHashtagClick(hashtag: string) {
    router.navigate(`/hashtag?tag=${hashtag}`);
  }

  render() {
    return html`
      <main>
        <app-search
          @search="${($event: any) => this.handleSearch($event.detail)}"
        ></app-search>

        <fluent-tabs placement="top">
          <fluent-tab slot="nav" panel="accounts">Accounts</fluent-tab>
          <fluent-tab slot="nav" panel="trending">Trending</fluent-tab>
          <fluent-tab slot="nav" panel="news">News</fluent-tab>
          <fluent-tab slot="nav" panel="hashtags">Hashtags</fluent-tab>

          <fluent-tab-panel name="accounts">
            ${this.searchData && this.searchData.accounts
              ? html`
                  <ul>
                    ${this.searchData && this.searchData.accounts
                      ? this.searchData.accounts.map((account: any) => {
                          return html`<li
                            @click="${() => this.openAccount(account.id)}"
                          >
                            <div class="account">
                              <img class="avatar" src="${account.avatar}" />
                              ${account.username}
                            </div>
                          </li>`;
                        })
                      : null}
                  </ul>
                `
              : html`
                  <div class="account">
                    <sl-skeleton></sl-skeleton>
                  </div>

                  <div class="account">
                    <sl-skeleton></sl-skeleton>
                  </div>

                  <div class="account">
                    <sl-skeleton></sl-skeleton>
                  </div>

                  <div class="account">
                    <sl-skeleton></sl-skeleton>
                  </div>

                  <div class="account">
                    <sl-skeleton></sl-skeleton>
                  </div>
                `}
          </fluent-tab-panel>

          <fluent-tab-panel name="trending">
            <ul>
              ${this.trending
                ? this.trending.map((status: any) => {
                    return html`<timeline-item
                      .tweet="${status}"
                    ></timeline-item>`;
                  })
                : null}
            </ul>
          </fluent-tab-panel>

          <fluent-tab-panel name="news">
            <ul id="newsList">
              ${this.trendingLinks
                ? this.trendingLinks.map((status: any) => {
                    return html` <li>
                      <img src="${status.image}" alt="${status.description}" />

                      <h3>${status.title}</h3>
                      <a href="${status.url}" target="_blank">${status.url}</a>

                      <p>${status.description}</p>
                    </li>`;
                  })
                : null}
            </ul>
          </fluent-tab-panel>

          <fluent-tab-panel name="hashtags">
            ${this.searchData && this.searchData.hashtags
              ? html`
                  <ul>
                    ${this.searchData && this.searchData.hashtags
                      ? this.searchData.hashtags.map((hashtag: any) => {
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
          </fluent-tab-panel>
        </fluent-tabs>
      </main>
    `;
  }
}
