import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getMutedAccounts, unmuteUser } from '../services/account';

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
        animation: slideInFromLeft 0.3s ease-in-out;
        margin-bottom: 0;
      }

      ul li {
        background: var(--sl-color-gray-50);
        border-radius: var(--md-sys-shape-corner-small);
        padding: 10px;
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      ul li.empty-state {
        background: transparent;
        text-align: center;
        cursor: default;
        color: var(--md-sys-color-on-surface-variant, var(--sl-color-gray-500));
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

      @media (max-width: 820px) {
        ul {
          padding: 12px;
        }

        h2 {
          padding: 12px;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(30%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideInFromLeft {
        from {
          transform: translateX(-30%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
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
