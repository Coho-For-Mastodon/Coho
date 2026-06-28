import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import {
  getFollowRequests,
  authorizeFollowRequest,
  rejectFollowRequest,
} from '../mastodon/api/follow-requests';
import { userListStyles } from '../styles/user-list-styles';

import '../components/md/md-skeleton';
import '../components/md/md-button';
import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-follow-requests')
export class AppFollowRequests extends LitElement {
  @state() accounts: Account[] = [];
  @state() loading = false;
  @state() private _processingIds = new Set<string>();

  static styles = [
    userListStyles,
    css`
      main {
        padding-left: 6em;
        padding-right: 6em;
        box-sizing: border-box;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 12px;
          padding-right: 12px;
        }
      }

      h2 {
        animation: slideInFromLeft 0.3s ease-in-out;
        padding-left: 0;
      }

      ul {
        padding-left: 0;
        padding-right: 0;
      }

      ul li {
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
    `,
  ];

  async firstUpdated() {
    await this._loadFollowRequests();
  }

  private async _loadFollowRequests() {
    this.loading = true;
    try {
      const data = await getFollowRequests();
      this.accounts = Array.isArray(data) ? [...data] : [];
    } catch (error) {
      console.error('Failed to load follow requests', error);
    } finally {
      this.loading = false;
    }
  }

  private async _authorize(account: Account) {
    const next = new Set(this._processingIds);
    next.add(account.id);
    this._processingIds = next;

    try {
      await authorizeFollowRequest(account.id);
      this.accounts = this.accounts.filter((a) => a.id !== account.id);
    } catch (error) {
      console.error('Failed to authorize follow request', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to authorize follow request.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._processingIds);
      updated.delete(account.id);
      this._processingIds = updated;
    }
  }

  private async _reject(account: Account) {
    const next = new Set(this._processingIds);
    next.add(account.id);
    this._processingIds = next;

    try {
      await rejectFollowRequest(account.id);
      this.accounts = this.accounts.filter((a) => a.id !== account.id);
    } catch (error) {
      console.error('Failed to reject follow request', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to reject follow request.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._processingIds);
      updated.delete(account.id);
      this._processingIds = updated;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Follow Requests')}</h2>
        <ul class="scrollbar-hidden">
          ${
            this.loading && this.accounts.length === 0
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
              : this.accounts.length === 0
                ? html`<li class="empty-state">
                    ${msg('No pending follow requests.')}
                  </li>`
                : this.accounts.map((account) => {
                    const processing = this._processingIds.has(account.id);
                    return html`
                      <li>
                        <user-profile
                          list-row
                          .account=${account}
                        ></user-profile>
                        <div class="actions">
                          <md-button
                            variant="filled"
                            size="small"
                            ?disabled=${processing}
                            @click=${() => this._authorize(account)}
                          >
                            ${processing ? msg('...') : msg('Accept')}
                          </md-button>
                          <md-button
                            variant="text"
                            size="small"
                            ?disabled=${processing}
                            @click=${() => this._reject(account)}
                          >
                            ${msg('Reject')}
                          </md-button>
                        </div>
                      </li>
                    `;
                  })
          }
        </ul>
      </main>
    `;
  }
}
