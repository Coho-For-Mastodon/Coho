import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import {
  downloadBlockedAccountsCsv,
  fetchAllBlockedAccounts,
  importBlocksOrMutesFromCsv,
  unblockUser,
} from '../services/account';
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
  @state() private _importing = false;
  @state() private _importProgress = '';
  @state() private _unblockingIds = new Set<string>();

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

      .list-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .import-hint {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant, #878792);
        margin: 0 0 12px;
        max-width: none;
      }

      ul li {
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      ul li md-button {
        flex-shrink: 0;
      }
    `,
  ];

  async firstUpdated() {
    await this._loadBlockedAccounts();
  }

  private async _loadBlockedAccounts() {
    this.loading = true;
    try {
      this.accounts = await fetchAllBlockedAccounts();
    } catch (error) {
      console.error('Failed to load blocked accounts', error);
    } finally {
      this.loading = false;
    }
  }

  private _exportCsv() {
    downloadBlockedAccountsCsv(this.accounts);
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          message: msg('Exported account list.'),
          variant: 'success',
        },
      })
    );
  }

  private _openImportPicker() {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>(
      'input[data-csv-import]'
    );
    input?.click();
  }

  private async _onImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this._importing = true;
    this._importProgress = '';
    try {
      const text = await file.text();
      const selfId = localStorage.getItem('currentUserID');
      const existing = new Set(this.accounts.map((a) => a.id));
      const result = await importBlocksOrMutesFromCsv('block', text, {
        existingAccountIds: existing,
        selfAccountId: selfId,
        onProgress: (current, total) => {
          this._importProgress = total > 0 ? `${current} / ${total}` : '';
          this.requestUpdate();
        },
      });
      if (result.newAccounts.length > 0) {
        this.accounts = [...this.accounts, ...result.newAccounts];
      }
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg(
              str`Import finished: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed.`
            ),
            variant:
              result.imported === 0 && result.failed > 0 ? 'error' : 'success',
          },
        })
      );
    } catch (error) {
      console.error('CSV import failed', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Import failed. Please try again.'),
            variant: 'error',
          },
        })
      );
    } finally {
      this._importing = false;
      this._importProgress = '';
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
        <p class="import-hint">
          ${msg(
            'Export or import a list of account addresses as CSV (one column: Account address). Import resolves each handle on your server and may take a while.'
          )}
        </p>
        <div class="list-actions">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            data-csv-import
            hidden
            @change=${this._onImportFile}
          />
          <md-button
            variant="outlined"
            size="small"
            ?disabled=${this._importing}
            @click=${this._exportCsv}
          >
            ${msg('Export CSV')}
          </md-button>
          <md-button
            variant="filled"
            size="small"
            ?disabled=${this._importing}
            @click=${this._openImportPicker}
          >
            ${
              this._importing
                ? this._importProgress
                  ? msg(str`Importing… ${this._importProgress}`)
                  : msg('Importing…')
                : msg('Import CSV')
            }
          </md-button>
        </div>
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
                    ${msg('No blocked accounts.')}
                  </li>`
                : this.accounts.map((account) => {
                    return html`
                      <li>
                        <user-profile
                          list-row
                          .account=${account}
                        ></user-profile>
                        <md-button
                          variant="text"
                          size="small"
                          ?disabled=${this._unblockingIds.has(account.id)}
                          @click=${() => this._unblock(account)}
                        >
                          ${
                            this._unblockingIds.has(account.id)
                              ? msg('Unblocking...')
                              : msg('Unblock')
                          }
                        </md-button>
                      </li>
                    `;
                  })
          }
        </ul>
      </main>
    `;
  }
}
