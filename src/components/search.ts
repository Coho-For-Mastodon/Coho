import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './md/md-text-field';

import { router } from '../utils/router';

interface SearchData {
  query?: string;
  accounts?: Array<{ id: string; avatar: string; display_name: string; acct: string }>;
  statuses?: unknown[];
  hashtags?: unknown[];
}

@customElement('app-search')
export class Search extends LitElement {
  @state() searchData: SearchData | undefined;
  static styles = [
    css`
      :host {
        display: block;

        contain: paint layout style;
        content-visibility: auto;
      }

      .avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }

      .account {
        display: flex;
        align-items: center;
        gap: 8px;
      }

            @media (max-width: 820px) {
        .search-container {
          padding: 0;

      @media (prefers-color-scheme: dark) {
        .account {
          color: white;
        }
      }
    `,
  ];

  public async connectedCallback() {
    super.connectedCallback();

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const { searchTimeline } = await import('../services/timeline');
          const searchData = await searchTimeline('Mastodon');
          console.log('searchData', searchData);

          this.searchData = searchData;

          // fire custom event
          const event = new CustomEvent('search', {
            detail: {
              searchData,
            },
          });
          this.dispatchEvent(event);

          observer.disconnect();
        }
      });
    }, options);

    observer.observe(this);
  }

  async handleSearch(value: string) {
    console.log(value);

    // const dropdown: any = this.shadowRoot?.querySelector('sl-dropdown');
    const { searchTimeline } = await import('../services/timeline');
    const searchData = await searchTimeline(value);
    console.log('searchData', searchData);

    this.searchData = searchData;

    // fire custom event
    const event = new CustomEvent('search', {
      detail: {
        searchData,
      },
    });
    this.dispatchEvent(event);

    // await dropdown?.show();
  }

  openAccount(id: string) {
    router.navigate(`/account?id=${id}`);
  }

  render() {
    return html`
      <md-text-field
        @change="${(e: Event) => this.handleSearch((e.target as HTMLInputElement).value)}"
        placeholder="Search"
        type="search"
        pill
        .value=${this.searchData?.query || ''}
      >
      </md-text-field>
    `;
  }
}
