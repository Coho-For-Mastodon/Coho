import { LitElement, html, css } from 'lit';
import { customElement, state, property, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import { router } from '../router/routes';

interface SearchData {
  query?: string;
  accounts?: Array<{
    id: string;
    avatar: string;
    display_name: string;
    acct: string;
  }>;
  statuses?: unknown[];
  hashtags?: unknown[];
}

@localized()
@customElement('app-search')
export class Search extends LitElement {
  @state() searchData: SearchData | undefined;
  @state() private _inputValue: string = '';

  /** Optional avatar URL to display on the right side of the search bar */
  @property({ type: String }) avatar: string = '';

  @query('input') private _input!: HTMLInputElement;

  static styles = [
    css`
      :host {
        display: block;
        contain: paint layout style;
        content-visibility: auto;
      }

      .search-bar {
        display: flex;
        align-items: center;
        height: 56px;
        min-width: 360px;
        max-width: 720px;
        background-color: var(--md-sys-color-surface-container-high, #e6e0e9);
        border-radius: 28px;
        padding: 0 16px;
        gap: 16px;
        cursor: text;
        transition: box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      .search-bar:focus-within {
        box-shadow:
          0 1px 3px 0 rgba(0, 0, 0, 0.3),
          0 4px 8px 3px rgba(0, 0, 0, 0.15);
      }

      .leading-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        flex-shrink: 0;
      }

      .leading-icon svg {
        width: 24px;
        height: 24px;
      }

      input {
        flex: 1;
        border: none;
        background: transparent;
        font-family:
          'Roboto',
          system-ui,
          -apple-system,
          sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.5px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        outline: none;
        min-width: 0;
      }

      input::placeholder {
        color: var(--md-sys-color-on-surface-variant, #49454f);
      }

      input::-webkit-search-cancel-button {
        display: none;
      }

      .trailing-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        flex-shrink: 0;
        object-fit: cover;
      }

      .trailing-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        flex-shrink: 0;
        cursor: pointer;
        border-radius: 50%;
        padding: 8px;
        margin: -8px;
        transition: background-color 0.2s;
      }

      .trailing-icon:hover {
        background-color: var(--md-sys-color-on-surface-variant, #49454f);
        opacity: 0.08;
      }

      .trailing-icon svg {
        width: 24px;
        height: 24px;
      }

      @media (max-width: 820px) {
        .search-bar {
          min-width: unset;
        }
      }

      @media (prefers-color-scheme: dark) {
        .search-bar {
          background-color: var(--md-sys-color-surface-container-high, #2b2930);
        }

        input {
          color: var(--md-sys-color-on-surface, #e6e1e5);
        }

        input::placeholder {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
        }

        .leading-icon,
        .trailing-icon {
          color: var(--md-sys-color-on-surface-variant, #cac4d0);
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

  private _handleContainerClick() {
    this._input?.focus();
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.handleSearch(this._inputValue);
    }
  }

  private _handleInput(e: Event) {
    this._inputValue = (e.target as HTMLInputElement).value;
  }

  async handleSearch(value: string) {
    console.log(value);

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
  }

  openAccount(id: string) {
    router.navigate(`/account?id=${id}`);
  }

  render() {
    return html`
      <div class="search-bar" @click="${this._handleContainerClick}">
        <span class="leading-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            viewBox="0 -960 960 960"
            width="24"
            fill="currentColor"
          >
            <path
              d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"
            />
          </svg>
        </span>
        <input
          type="search"
          placeholder=${msg('Search')}
          .value="${this._inputValue}"
          @input="${this._handleInput}"
          @keydown="${this._handleKeyDown}"
        />
        ${this.avatar
          ? html`<img
              class="trailing-avatar"
              src="${this.avatar}"
              alt="Profile"
            />`
          : html``}
      </div>
    `;
  }
}
