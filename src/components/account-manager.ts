import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-autocomplete';
import './md/md-badge';
import './md/md-button';
import './md/md-card';
import './md/md-divider';

import type { AutocompleteOption } from './md/md-autocomplete';
import {
  getActiveAccount,
  listAccounts,
  removeAccount,
  switchAccount,
  type AuthAccountRecord,
} from '../services/auth-session';
import { initAuth } from '../services/account';
import {
  POPULAR_INSTANCES,
  searchInstances,
} from '../services/instance-search';
import { router } from '../router/routes';
import { setAuthRedirect } from '../utils/auth-redirect';
import { reloadWindow } from '../utils/reload-window';

@localized()
@customElement('account-manager')
export class AccountManager extends LitElement {
  @state() private accounts: AuthAccountRecord[] = [];
  @state() private activeAccountKey: string | null = null;
  @state() private chosenServer = '';
  @state() private serverOptions: AutocompleteOption[] = [];
  @state() private loadingServers = false;
  @state() private mutating = false;
  @state() private addingAccount = false;

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .accounts {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .account-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
    }

    .account-row img,
    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      object-fit: cover;
      background: var(--md-sys-color-surface-container-high);
    }

    .avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-label-large-font-size);
      font-weight: 600;
      text-transform: uppercase;
    }

    .account-meta {
      min-width: 0;
    }

    .account-name,
    .account-acct,
    .account-server {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .account-name {
      font-size: var(--md-sys-typescale-body-large-font-size);
      color: var(--md-sys-color-on-surface);
    }

    .account-acct,
    .account-server,
    .section-description {
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .account-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .section-description {
      margin: 8px 0 0;
    }

    .add-account {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .add-actions {
      display: flex;
      justify-content: flex-end;
    }

    .empty-state {
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-medium-font-size);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.refreshAccounts();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  private async refreshAccounts(): Promise<void> {
    this.accounts = listAccounts();
    this.activeAccountKey = getActiveAccount()?.accountKey || null;
  }

  private getInitials(account: AuthAccountRecord): string {
    const source = account.displayName || account.acct || account.server;
    return source.trim().slice(0, 1) || '?';
  }

  private async handleServerInput(
    event: Event | CustomEvent<{ value: string }>
  ): Promise<void> {
    const value =
      (event as CustomEvent<{ value: string }>).detail?.value ||
      (event.target as HTMLInputElement)?.value ||
      '';
    this.chosenServer = value;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (value.length < 2) {
      this.serverOptions = POPULAR_INSTANCES;
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.searchServers(value);
    }, 300);
  }

  private handleServerSelect(event: CustomEvent<{ value: string }>): void {
    this.chosenServer = event.detail.value;
  }

  private async handleServerFocus(): Promise<void> {
    if (this.serverOptions.length > 0) {
      return;
    }

    this.serverOptions = POPULAR_INSTANCES;
  }

  private async searchServers(query: string): Promise<void> {
    this.loadingServers = true;
    try {
      this.serverOptions = [
        ...(await searchInstances(query)),
        ...POPULAR_INSTANCES,
      ];
    } catch (error) {
      console.error('[account-manager] Failed to search instances', error);
      this.serverOptions = POPULAR_INSTANCES;
    } finally {
      this.loadingServers = false;
    }
  }

  private async addAccount(): Promise<void> {
    if (this.addingAccount || !this.chosenServer.trim()) {
      return;
    }

    this.addingAccount = true;
    try {
      setAuthRedirect(
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      );
      await initAuth(this.chosenServer.trim());
    } finally {
      this.addingAccount = false;
    }
  }

  private async switchToAccount(accountKey: string): Promise<void> {
    if (this.mutating || accountKey === this.activeAccountKey) {
      return;
    }

    this.mutating = true;
    try {
      await switchAccount(accountKey);
      reloadWindow();
    } finally {
      this.mutating = false;
    }
  }

  private async removeSavedAccount(accountKey: string): Promise<void> {
    if (this.mutating) {
      return;
    }

    this.mutating = true;
    try {
      const result = await removeAccount(accountKey);
      await this.refreshAccounts();

      if (result.activeAccountKey) {
        reloadWindow();
        return;
      }

      await router.navigate('/');
    } finally {
      this.mutating = false;
    }
  }

  private renderAccount(account: AuthAccountRecord) {
    const isActive = account.accountKey === this.activeAccountKey;
    return html`
      <div class="account-row">
        ${account.avatar
          ? html`<img src="${account.avatar}" alt="${account.displayName}" />`
          : html`<div class="avatar-placeholder">
              ${this.getInitials(account)}
            </div>`}

        <div class="account-meta">
          <div class="account-name">${account.displayName}</div>
          <div class="account-acct">@${account.acct}</div>
          <div class="account-server">${account.server}</div>
          ${isActive
            ? html`<md-badge variant="filled">${msg('Active')}</md-badge>`
            : nothing}
        </div>

        <div class="account-actions">
          ${isActive
            ? nothing
            : html`
                <md-button
                  variant="text"
                  ?disabled=${this.mutating}
                  @click=${() => this.switchToAccount(account.accountKey)}
                >
                  ${msg('Switch')}
                </md-button>
              `}
          <md-button
            variant="text"
            ?disabled=${this.mutating}
            @click=${() => this.removeSavedAccount(account.accountKey)}
          >
            ${msg('Remove')}
          </md-button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <md-card variant="filled">
        <h3 slot="header">${msg('Accounts')}</h3>
        <p class="section-description">
          ${msg(
            'Switch the active account, add another one, or remove a saved account.'
          )}
        </p>

        <div class="accounts">
          ${this.accounts.length > 0
            ? this.accounts.map(
                (account, index) => html`
                  ${index > 0 ? html`<md-divider></md-divider>` : nothing}
                  ${this.renderAccount(account)}
                `
              )
            : html`
                <p class="empty-state">
                  ${msg('No saved accounts yet. Add one below to sign in.')}
                </p>
              `}
        </div>

        <md-divider></md-divider>

        <div class="add-account">
          <h4>${msg('Add account')}</h4>
          <md-autocomplete
            .placeholder=${msg('Search for a Mastodon server')}
            .value=${this.chosenServer}
            .options=${this.serverOptions}
            .loading=${this.loadingServers}
            @focus=${this.handleServerFocus}
            @input=${this.handleServerInput}
            @select=${this.handleServerSelect}
          ></md-autocomplete>

          <div class="add-actions">
            <md-button
              variant="filled"
              ?disabled=${this.addingAccount || !this.chosenServer.trim()}
              @click=${this.addAccount}
            >
              ${this.addingAccount
                ? msg('Starting OAuth...')
                : msg('Add account')}
            </md-button>
          </div>
        </div>
      </md-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'account-manager': AccountManager;
  }
}
