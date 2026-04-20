import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-text-field';
import './md/md-divider';
import './list-edit-dialog';

import type { List, ListRepliesPolicy, Account } from '../mastodon/types';
import {
  getLists,
  createList,
  deleteList,
  addAccountsToList,
} from '../services/lists';
import { searchAccounts } from '../services/account';

@localized()
@customElement('lists-dialog')
export class ListsDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private lists: List[] = [];
  @state() private loading = false;
  @state() private submitting = false;
  @state() private errorMessage = '';

  @state() private newTitle = '';
  @state() private newRepliesPolicy: ListRepliesPolicy = 'list';
  @state() private newMembers: Account[] = [];
  @state() private newMemberSearch = '';
  @state() private newMemberResults: Account[] = [];
  @state() private newMemberSearching = false;

  private _newMemberDebounce: ReturnType<typeof setTimeout> | undefined;

  @state() private editingList: List | null = null;
  @state() private editDialogOpen = false;

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

    .create-form {
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

    .create-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: end;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: min(38vh, 360px);
      overflow-y: auto;
      padding-right: 2px;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      border: 1px solid
        color-mix(
          in srgb,
          var(
              --md-sys-color-outline-variant,
              var(--md-sys-color-outline, #79747e)
            )
            55%,
          transparent
        );
      background: color-mix(
        in srgb,
        var(--md-sys-color-surface-container-low, #f7f2f8) 88%,
        transparent
      );
    }

    .list-main {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .list-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      min-width: 0;
    }

    .list-meta {
      font-size: 11px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      padding: 3px 8px;
      border-radius: var(--md-sys-shape-corner-full);
      background: color-mix(
        in srgb,
        var(--md-sys-color-secondary-container, #e8def8) 36%,
        transparent
      );
    }

    .list-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .empty {
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container-low, #f7f2f8);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    .error {
      color: var(--md-sys-color-error, #b3261e);
      font-size: 13px;
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

    .member-search-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 184px;
      overflow-y: auto;
    }

    .selected-members {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
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

    .search-hint {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      padding: 2px 0 0;
    }

    .member-picker {
      display: grid;
      gap: 8px;
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

    .member-pill img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
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
      .create-row {
        grid-template-columns: 1fr;
      }

      .list-item {
        align-items: flex-start;
        flex-direction: column;
      }

      .list-actions {
        justify-content: flex-start;
      }

      .member-pill-label {
        max-width: 140px;
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      void this.loadLists();
    }
  }

  public async show() {
    this.open = true;
  }

  public hide() {
    this.open = false;
    this._resetForm();
  }

  private async loadLists() {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      this.lists = await getLists();
      this._emitListsUpdated();
    } catch (error) {
      console.error('Failed to load lists', error);
      this.errorMessage = msg('Unable to load lists. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private _resetForm() {
    this.newTitle = '';
    this.newRepliesPolicy = 'list';
    this.newMembers = [];
    this.newMemberSearch = '';
    this.newMemberResults = [];
    this.newMemberSearching = false;
    clearTimeout(this._newMemberDebounce);
    this.editingList = null;
    this.editDialogOpen = false;
    this.submitting = false;
    this.errorMessage = '';
  }

  private _emitListsUpdated() {
    this.dispatchEvent(
      new CustomEvent('lists-updated', {
        detail: { lists: this.lists },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _formatRepliesPolicy(policy: ListRepliesPolicy): string {
    switch (policy) {
      case 'followed':
        return msg('Followed replies');
      case 'none':
        return msg('No replies');
      case 'list':
      default:
        return msg('List replies');
    }
  }

  private _setNewPolicy(policy: ListRepliesPolicy) {
    this.newRepliesPolicy = policy;
  }

  private _onNewMemberSearchInput(e: InputEvent) {
    this.newMemberSearch = (e.target as HTMLInputElement).value;
    clearTimeout(this._newMemberDebounce);
    if (!this.newMemberSearch.trim()) {
      this.newMemberResults = [];
      return;
    }
    this._newMemberDebounce = setTimeout(() => {
      void this._runNewMemberSearch();
    }, 300);
  }

  private async _runNewMemberSearch() {
    if (!this.newMemberSearch.trim()) return;
    this.newMemberSearching = true;
    try {
      const results = await searchAccounts(this.newMemberSearch.trim());
      const stagedIds = new Set(this.newMembers.map((m) => m.id));
      this.newMemberResults = results.filter((a) => !stagedIds.has(a.id));
    } catch (error) {
      console.error('Failed to search accounts', error);
    } finally {
      this.newMemberSearching = false;
    }
  }

  private _stageNewMember(account: Account) {
    this.newMembers = [...this.newMembers, account];
    this.newMemberResults = this.newMemberResults.filter(
      (a) => a.id !== account.id
    );
  }

  private _unstageNewMember(account: Account) {
    this.newMembers = this.newMembers.filter((m) => m.id !== account.id);
  }

  private _openEditDialog(list: List) {
    this.editingList = list;
    this.editDialogOpen = true;
  }

  private _onListUpdated(e: CustomEvent<{ list: List }>) {
    this.lists = this.lists.map((l) =>
      l.id === e.detail.list.id ? e.detail.list : l
    );
    this._emitListsUpdated();
  }

  private async _handleCreate() {
    if (!this.newTitle.trim()) {
      this.errorMessage = msg('List name is required.');
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    try {
      const created = await createList(
        this.newTitle.trim(),
        this.newRepliesPolicy
      );
      if (this.newMembers.length > 0) {
        await addAccountsToList(
          created.id,
          this.newMembers.map((m) => m.id)
        );
      }
      this.lists = [created, ...this.lists];
      this._emitListsUpdated();
      this.newTitle = '';
      this.newRepliesPolicy = 'list';
      this.newMembers = [];
      this.newMemberSearch = '';
      this.newMemberResults = [];
    } catch (error) {
      console.error('Failed to create list', error);
      this.errorMessage = msg('Unable to create list. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private async _handleDelete(listId: string) {
    this.submitting = true;
    this.errorMessage = '';
    try {
      await deleteList(listId);
      this.lists = this.lists.filter((list) => list.id !== listId);
      this._emitListsUpdated();
      if (this.editingList?.id === listId) {
        this.editingList = null;
        this.editDialogOpen = false;
      }
    } catch (error) {
      console.error('Failed to delete list', error);
      this.errorMessage = msg('Unable to delete list. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private _renderPolicyToggle(
    current: ListRepliesPolicy,
    onChange: (policy: ListRepliesPolicy) => void
  ) {
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
              aria-pressed=${current === option.value}
              @click=${() => onChange(option.value)}
            >
              ${option.label}
            </button>
          `
        )}
      </div>
    `;
  }

  render() {
    return html`
      <list-edit-dialog
        .list=${this.editingList}
        .open=${this.editDialogOpen}
        @list-updated=${this._onListUpdated}
        @md-dialog-hide=${() => (this.editDialogOpen = false)}
      ></list-edit-dialog>
      <md-dialog
        label=${msg('Manage lists')}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        <div class="content">
          <div>
            <div class="section-title">${msg('Create a list')}</div>
            <div class="create-form">
              <div class="create-row">
                <md-text-field
                  .value=${this.newTitle}
                  placeholder=${msg('List name')}
                  @input=${(e: InputEvent) =>
                    (this.newTitle = (e.target as HTMLInputElement).value)}
                ></md-text-field>
                <md-button
                  variant="filled"
                  size="small"
                  @click=${this._handleCreate}
                  ?disabled=${this.submitting || !this.newTitle.trim()}
                >
                  ${this.submitting ? msg('Creating...') : msg('Create list')}
                </md-button>
              </div>
              ${this._renderPolicyToggle(
                this.newRepliesPolicy,
                this._setNewPolicy.bind(this)
              )}
              <div class="member-picker">
                <md-text-field
                  .value=${this.newMemberSearch}
                  placeholder=${msg('Search to add people (optional)')}
                  @input=${this._onNewMemberSearchInput}
                ></md-text-field>
                ${this.newMembers.length > 0
                  ? html`
                      <div class="selected-members">
                        ${this.newMembers.map(
                          (account) => html`
                            <div class="member-pill">
                              <img
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
                                @click=${() => this._unstageNewMember(account)}
                              >
                                ×
                              </button>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : nothing}
                ${this.newMemberSearching
                  ? html`<div class="search-hint">${msg('Searching...')}</div>`
                  : this.newMemberSearch.trim() &&
                      this.newMemberResults.length === 0 &&
                      !this.newMemberSearching
                    ? html`<div class="search-hint">
                        ${msg('No results found.')}
                      </div>`
                    : nothing}
                ${this.newMemberResults.length > 0
                  ? html`
                      <div class="member-search-results">
                        ${this.newMemberResults.map(
                          (account) => html`
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
                              <md-button
                                size="small"
                                variant="tonal"
                                @click=${() => this._stageNewMember(account)}
                              >
                                ${msg('Add')}
                              </md-button>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : nothing}
              </div>
            </div>
          </div>

          <md-divider></md-divider>

          <div>
            <div class="section-title">${msg('Your lists')}</div>
            ${this.errorMessage
              ? html`<div class="error">${this.errorMessage}</div>`
              : nothing}
            ${this.loading
              ? html`<div class="empty">${msg('Loading lists...')}</div>`
              : this.lists.length === 0
                ? html`<div class="empty">
                    ${msg('No lists yet. Create one above.')}
                  </div>`
                : html`
                    <div class="list">
                      ${this.lists.map((list) => {
                        const repliesPolicy = list.replies_policy ?? 'list';
                        return html`
                          <div class="list-item">
                            <div class="list-main">
                              <div class="list-title">${list.title}</div>
                              <div class="list-meta">
                                ${this._formatRepliesPolicy(repliesPolicy)}
                              </div>
                            </div>
                            <div class="list-actions">
                              <md-button
                                variant="text"
                                size="small"
                                @click=${() => this._openEditDialog(list)}
                                ?disabled=${this.submitting}
                              >
                                ${msg('Edit')}
                              </md-button>
                              <md-button
                                variant="text"
                                size="small"
                                @click=${() => this._handleDelete(list.id)}
                                ?disabled=${this.submitting}
                              >
                                ${msg('Delete')}
                              </md-button>
                            </div>
                          </div>
                        `;
                      })}
                    </div>
                  `}
          </div>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lists-dialog': ListsDialog;
  }
}
