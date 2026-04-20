import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-text-field';
import './md/md-divider';

import type { List, ListRepliesPolicy, Account } from '../mastodon/types';
import {
  updateList,
  getListAccounts,
  addAccountsToList,
  removeAccountsFromList,
} from '../services/lists';
import { searchAccounts } from '../services/account';

@localized()
@customElement('list-edit-dialog')
export class ListEditDialog extends LitElement {
  @property({ type: Object }) list: List | undefined;
  @property({ type: Boolean }) open = false;

  @state() private editingTitle = '';
  @state() private editingRepliesPolicy: ListRepliesPolicy = 'list';
  @state() private members: Account[] = [];
  @state() private loadingMembers = false;
  @state() private searchQuery = '';
  @state() private searchResults: Account[] = [];
  @state() private searching = false;
  @state() private submitting = false;
  @state() private errorMessage = '';

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  static styles = css`
    md-dialog::part(dialog) {
      max-width: 560px;
      width: 92vw;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .edit-form {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-large);
      background: color-mix(
        in srgb,
        var(--md-sys-color-surface-container, #f3edf7) 72%,
        transparent
      );
    }

    .save-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: end;
    }

    .policy-toggle {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .policy-chip {
      padding: 4px 10px;
      min-height: 30px;
      border-radius: var(--md-sys-shape-corner-full);
      border: 1px solid var(--md-sys-color-outline, #79747e);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      color: var(--md-sys-color-on-surface, #1d1b20);
      background: transparent;
    }

    .policy-chip[aria-pressed='true'] {
      background: var(--md-sys-color-primary-container, #eaddff);
      border-color: transparent;
      color: var(--md-sys-color-on-primary-container, #21005d);
    }

    .account-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .member-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      min-height: 32px;
      padding: 4px 6px 4px 4px;
      border-radius: var(--md-sys-shape-corner-full);
      background: color-mix(
        in srgb,
        var(--md-sys-color-secondary-container, #e8def8) 52%,
        transparent
      );
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .account-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: color-mix(
        in srgb,
        var(--md-sys-color-surface-container, #f3edf7) 78%,
        transparent
      );
    }

    .account-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
    }

    .member-pill .account-avatar {
      width: 24px;
      height: 24px;
    }

    .account-info {
      flex: 1;
      min-width: 0;
    }

    .account-display-name {
      font-weight: 600;
      font-size: 12px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-acct {
      font-size: 10px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty {
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container-low, #f7f2f8);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 184px;
      overflow-y: auto;
    }

    .error {
      color: var(--md-sys-color-error, #b3261e);
      font-size: 13px;
    }

    .member-pill-label {
      max-width: 168px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
    }

    .member-pill-remove {
      appearance: none;
      border: none;
      background: transparent;
      color: inherit;
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      font-size: 16px;
      line-height: 1;
    }

    .member-pill-remove:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 10%,
        transparent
      );
    }

    @media (max-width: 520px) {
      .save-row {
        grid-template-columns: 1fr;
      }

      .member-pill-label {
        max-width: 140px;
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open && this.list) {
      this.editingTitle = this.list.title;
      this.editingRepliesPolicy = this.list.replies_policy ?? 'list';
      this.searchQuery = '';
      this.searchResults = [];
      this.errorMessage = '';
      void this._loadMembers();
    }
  }

  public hide() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('md-dialog-hide', { bubbles: true, composed: true })
    );
  }

  private async _loadMembers() {
    if (!this.list) return;
    this.loadingMembers = true;
    try {
      this.members = await getListAccounts(this.list.id);
    } catch (error) {
      console.error('Failed to load list members', error);
      this.errorMessage = msg('Unable to load list members. Please try again.');
    } finally {
      this.loadingMembers = false;
    }
  }

  private _onSearchInput(e: InputEvent) {
    this.searchQuery = (e.target as HTMLInputElement).value;
    clearTimeout(this._searchDebounceTimer);
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    this._searchDebounceTimer = setTimeout(() => {
      void this._runSearch();
    }, 300);
  }

  private async _runSearch() {
    if (!this.searchQuery.trim()) return;
    this.searching = true;
    try {
      const results = await searchAccounts(this.searchQuery.trim());
      const memberIds = new Set(this.members.map((m) => m.id));
      this.searchResults = results.filter((a) => !memberIds.has(a.id));
    } catch (error) {
      console.error('Failed to search accounts', error);
    } finally {
      this.searching = false;
    }
  }

  private async _addAccount(account: Account) {
    if (!this.list) return;
    try {
      await addAccountsToList(this.list.id, [account.id]);
      this.members = [...this.members, account];
      this.searchResults = this.searchResults.filter(
        (a) => a.id !== account.id
      );
    } catch (error) {
      console.error('Failed to add account to list', error);
      this.errorMessage = msg('Unable to add account. Please try again.');
    }
  }

  private async _removeAccount(account: Account) {
    if (!this.list) return;
    try {
      await removeAccountsFromList(this.list.id, [account.id]);
      this.members = this.members.filter((m) => m.id !== account.id);
    } catch (error) {
      console.error('Failed to remove account from list', error);
      this.errorMessage = msg('Unable to remove account. Please try again.');
    }
  }

  private async _handleSave() {
    if (!this.list) return;
    if (!this.editingTitle.trim()) {
      this.errorMessage = msg('List name is required.');
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    try {
      const updated = await updateList(
        this.list.id,
        this.editingTitle.trim(),
        this.editingRepliesPolicy
      );
      this.dispatchEvent(
        new CustomEvent('list-updated', {
          detail: { list: updated },
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      console.error('Failed to update list', error);
      this.errorMessage = msg('Unable to update list. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private _renderPolicyToggle() {
    const options: Array<{ value: ListRepliesPolicy; label: string }> = [
      { value: 'list', label: msg('List replies') },
      { value: 'followed', label: msg('Followed replies') },
      { value: 'none', label: msg('No replies') },
    ];
    return html`
      <div
        class="policy-toggle"
        role="group"
        aria-label=${msg('Replies policy')}
      >
        ${options.map(
          (option) => html`
            <button
              class="policy-chip"
              type="button"
              aria-pressed=${this.editingRepliesPolicy === option.value}
              @click=${() => (this.editingRepliesPolicy = option.value)}
            >
              ${option.label}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderAccountRow(account: Account, action: 'add' | 'remove') {
    return html`
      <div class="account-row">
        <img
          class="account-avatar"
          src="${account.avatar_static}"
          alt=""
          loading="lazy"
        />
        <div class="account-info">
          <div class="account-display-name">
            ${account.display_name || account.username}
          </div>
          <div class="account-acct">@${account.acct}</div>
        </div>
        ${action === 'remove'
          ? html`
              <md-button
                variant="text"
                @click=${() => this._removeAccount(account)}
              >
                ${msg('Remove')}
              </md-button>
            `
          : html`
              <md-button
                variant="tonal"
                @click=${() => this._addAccount(account)}
              >
                ${msg('Add')}
              </md-button>
            `}
      </div>
    `;
  }

  render() {
    const listTitle = this.list?.title ?? '';
    return html`
      <md-dialog
        label=${msg('Edit list')}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        <div class="content">
          ${this.errorMessage
            ? html`<div class="error">${this.errorMessage}</div>`
            : nothing}

          <div>
            <div class="section-title">${listTitle}</div>
            <div class="edit-form">
              <div class="save-row">
                <md-text-field
                  .value=${this.editingTitle}
                  placeholder=${msg('List name')}
                  @input=${(e: InputEvent) =>
                    (this.editingTitle = (e.target as HTMLInputElement).value)}
                ></md-text-field>
                <md-button
                  variant="filled"
                  size="small"
                  @click=${this._handleSave}
                  ?disabled=${this.submitting || !this.editingTitle.trim()}
                >
                  ${this.submitting ? msg('Saving...') : msg('Save')}
                </md-button>
              </div>
              ${this._renderPolicyToggle()}
            </div>
          </div>

          <md-divider></md-divider>

          <div>
            <div class="section-title">${msg('Members')}</div>
            ${this.loadingMembers
              ? html`<div class="empty">${msg('Loading members...')}</div>`
              : this.members.length === 0
                ? html`<div class="empty">${msg('No members yet.')}</div>`
                : html`
                    <div class="account-list">
                      ${this.members.map(
                        (account) => html`
                          <div class="member-pill">
                            <img
                              class="account-avatar"
                              src="${account.avatar_static}"
                              alt=""
                              loading="lazy"
                            />
                            <span class="member-pill-label">
                              ${account.display_name || account.username}
                            </span>
                            <button
                              class="member-pill-remove"
                              type="button"
                              aria-label=${msg('Remove')}
                              @click=${() => this._removeAccount(account)}
                            >
                              ×
                            </button>
                          </div>
                        `
                      )}
                    </div>
                  `}
          </div>

          <md-divider></md-divider>

          <div>
            <div class="section-title">${msg('Add people')}</div>
            <md-text-field
              .value=${this.searchQuery}
              placeholder=${msg('Search for accounts')}
              @input=${this._onSearchInput}
            ></md-text-field>
            ${this.searching
              ? html`<div class="empty" style="margin-top:8px">
                  ${msg('Searching...')}
                </div>`
              : this.searchQuery.trim() &&
                  this.searchResults.length === 0 &&
                  !this.searching
                ? html`<div class="empty" style="margin-top:8px">
                    ${msg('No results found.')}
                  </div>`
                : nothing}
            ${this.searchResults.length > 0
              ? html`
                  <div class="search-results">
                    ${this.searchResults.map((account) =>
                      this._renderAccountRow(account, 'add')
                    )}
                  </div>
                `
              : nothing}
          </div>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'list-edit-dialog': ListEditDialog;
  }
}
