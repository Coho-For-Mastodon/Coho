import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getFollowing } from '../services/account';
import { router } from '../router/routes';

import '../components/md/md-skeleton';
import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-following')
export class Appfollowing extends LitElement {
  @state() following: Account[] = [];
  @state() loading = false;
  private _currentAccountId: string | null = null;
  private _boundRouteChanged = () => {
    void this.handleRouteChange();
  };

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
        height: 100vh;
      }

      main {
        padding-top: 50px;
        max-width: var(--layout-max-width, 1200px);
        margin: 0 auto;
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin: 0;
        padding: 0;
        list-style: none;

        height: 81vh;
        overflow-y: scroll;
        overflow-x: hidden;

        padding-left: 6em;
        padding-right: 6em;
      }

      h2 {
        padding-left: 4em;
        margin-bottom: 0;
      }

      ul li {
        background: var(--sl-color-gray-50);
        border-radius: var(--md-sys-shape-corner-small);
        padding: 10px;
        cursor: pointer;
      }

      .skeleton-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .skeleton-lines {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      ul li.empty-state {
        background: transparent;
        text-align: center;
        cursor: default;
        color: var(--md-sys-color-on-surface-variant, var(--sl-color-gray-500));
      }

      @media (max-width: 820px) {
        ul {
          padding: 12px;
        }

        h2 {
          padding: 12px;
        }
      }

      @media (prefers-color-scheme: light) {
        ul li {
          color: black;
        }
      }
    `,
  ];

  async firstUpdated() {
    router.addEventListener('route-changed', this._boundRouteChanged);
    await this.loadFollowingFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    router.removeEventListener('route-changed', this._boundRouteChanged);
  }

  private async handleRouteChange() {
    if (window.location.pathname !== '/following') return;
    await this.loadFollowingFromUrl();
  }

  private async loadFollowingFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id || id === this._currentAccountId) return;

    this._currentAccountId = id;
    this.loading = true;
    this.following = [];

    try {
      const followingData = await getFollowing(id);
      this.following = Array.isArray(followingData) ? [...followingData] : [];
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('You are Following')}</h2>
        <ul class="scrollbar-hidden">
          ${this.loading && this.following.length === 0
            ? Array.from({ length: 6 }, () => {
                return html`
                  <li class="skeleton-row">
                    <md-skeleton
                      shape="circle"
                      width="50px"
                      height="50px"
                    ></md-skeleton>
                    <div class="skeleton-lines">
                      <md-skeleton width="160px" height="16px"></md-skeleton>
                      <md-skeleton
                        width="120px"
                        height="12px"
                        style="margin-top: 6px;"
                      ></md-skeleton>
                    </div>
                  </li>
                `;
              })
            : this.following.length === 0
              ? html`<li class="empty-state">
                  ${msg('Not following anyone yet.')}
                </li>`
              : this.following.map((follower) => {
                  return html`
                    ${follower && follower.id
                      ? html`<li>
                          <user-profile .account=${follower}></user-profile>
                        </li>`
                      : null}
                  `;
                })}
        </ul>
      </main>
    `;
  }
}
