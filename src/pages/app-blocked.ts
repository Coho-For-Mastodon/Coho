import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getBlockedAccounts, unblockUser } from '../services/account';
import { userListStyles } from '../styles/user-list-styles';

import '../components/md/md-skeleton';
import '../components/md/md-button';
import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-blocked')
export class AppBlocked extends LitElement {
  @state() accounts: Account[] = [];
  @state() loading = false;
  @state() private _unblockingIds = new Set<string>();

  static styles = [
    userListStyles,
    css`
      h2 {
        animation: slideInFromLeft 0.3s ease-in-out;
      }

      ul li {
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
    `,
  ];

  async firstUpdated() {
    await this._loadBlockedAccounts();
  }

  private async _loadBlockedAccounts() {
    this.loading = true;
    try {
      const data = await getBlockedAccounts();
      this.accounts = Array.isArray(data) ? [...data] : [];
    } catch (error) {
      console.error('Failed to load blocked accounts', error);
    } finally {
      this.loading = false;
    }
  }

  private async _unblock(account: Account) {
    const next = new Set(this._unblockingIds);
    next.add(account.id);
    this._unblockingIds = next;

    try {
      await unblockUser(account.id);
      this.accounts = this.accounts.filter((a) => a.id !== account.id);
    } catch (error) {
      console.error('Failed to unblock account', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to unblock account. Please try again.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._unblockingIds);
      updated.delete(account.id);
      this._unblockingIds = updated;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Blocked Accounts')}</h2>
        <ul class="scrollbar-hidden">
          ${this.loading && this.accounts.length === 0
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
                  ${msg('No blocked accounts.')}
                </li>`
              : this.accounts.map((account) => {
                  return html`
                    <li>
                      <user-profile .account=${account}></user-profile>
                      <md-button
                        variant="text"
                        size="small"
                        ?disabled=${this._unblockingIds.has(account.id)}
                        @click=${() => this._unblock(account)}
                      >
                        ${this._unblockingIds.has(account.id)
                          ? msg('Unblocking...')
                          : msg('Unblock')}
                      </md-button>
                    </li>
                  `;
                })}
        </ul>
      </main>
    `;
  }
}
