import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getUsersFollowers } from '../services/account';
import { router } from '../router/routes';
import { userListStyles } from '../styles/user-list-styles';

import '../components/md/md-skeleton';
import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-followers')
export class AppFollowers extends LitElement {
  @state() followers: Account[] = [];
  @state() loading = false;
  private _currentAccountId: string | null = null;
  private _boundRouteChanged = () => {
    void this.handleRouteChange();
  };

  static styles = [
    userListStyles,
    css`
      h2 {
        animation: slideInFromLeft 0.3s ease-in-out;
      }

      ul li {
        cursor: pointer;
        animation: slideUp 0.3s ease-in-out;
      }
    `,
  ];

  async firstUpdated() {
    router.addEventListener('route-changed', this._boundRouteChanged);
    await this.loadFollowersFromUrl();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    router.removeEventListener('route-changed', this._boundRouteChanged);
  }

  private async handleRouteChange() {
    if (window.location.pathname !== '/followers') return;
    await this.loadFollowersFromUrl();
  }

  private async loadFollowersFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id || id === this._currentAccountId) return;

    this._currentAccountId = id;
    this.loading = true;
    this.followers = [];

    try {
      const followersData = await getUsersFollowers(id);
      this.followers = Array.isArray(followersData) ? [...followersData] : [];
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Your Followers')}</h2>
        <ul class="scrollbar-hidden">
          ${
            this.loading && this.followers.length === 0
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
              : this.followers.length === 0
                ? html`<li class="empty-state">${msg('No followers yet.')}</li>`
                : this.followers.map((follower) => {
                    return html`
                      ${
                        follower && follower.id
                          ? html`<li>
                              <user-profile .account=${follower}></user-profile>
                            </li>`
                          : null
                      }
                    `;
                  })
          }
        </ul>
      </main>
    `;
  }
}
