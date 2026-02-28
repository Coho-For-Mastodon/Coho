import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getMutedAccounts, unmuteUser } from '../services/account';
import { userListStyles } from '../styles/user-list-styles';

import '../components/md/md-skeleton';
import '../components/md/md-button';
import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-muted')
export class AppMuted extends LitElement {
  @state() accounts: Account[] = [];
  @state() loading = false;
  @state() private _unmutingIds = new Set<string>();

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
    await this._loadMutedAccounts();
  }

  private async _loadMutedAccounts() {
    this.loading = true;
    try {
      const data = await getMutedAccounts();
      this.accounts = Array.isArray(data) ? [...data] : [];
    } catch (error) {
      console.error('Failed to load muted accounts', error);
    } finally {
      this.loading = false;
    }
  }

  private async _unmute(account: Account) {
    const next = new Set(this._unmutingIds);
    next.add(account.id);
    this._unmutingIds = next;

    try {
      await unmuteUser(account.id);
      this.accounts = this.accounts.filter((a) => a.id !== account.id);
    } catch (error) {
      console.error('Failed to unmute account', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to unmute account. Please try again.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._unmutingIds);
      updated.delete(account.id);
      this._unmutingIds = updated;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Muted Accounts')}</h2>
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
              ? html`<li class="empty-state">${msg('No muted accounts.')}</li>`
              : this.accounts.map((account) => {
                  return html`
                    <li>
                      <user-profile .account=${account}></user-profile>
                      <md-button
                        variant="text"
                        size="small"
                        ?disabled=${this._unmutingIds.has(account.id)}
                        @click=${() => this._unmute(account)}
                      >
                        ${this._unmutingIds.has(account.id)
                          ? msg('Unmuting...')
                          : msg('Unmute')}
                      </md-button>
                    </li>
                  `;
                })}
        </ul>
      </main>
    `;
  }
}
