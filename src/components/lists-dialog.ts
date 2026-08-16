import { LitElement, html, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { listsDialogStyles } from '../styles/lists-dialog-styles';

import './md/md-dialog';
import './md/md-button';
import './md/md-icon-button';
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

  static styles = listsDialogStyles;

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
        .list=${this.editingList!}
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
          <div class="section">
            <div class="section-title">${msg('Create a list')}</div>
            <div class="create-form">
              <div class="create-row">
                <md-text-field
                  .value=${this.newTitle}
                  pill
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
              <div class="field-group">
                <div class="field-label">${msg('Replies policy')}</div>
                ${this._renderPolicyToggle(
                  this.newRepliesPolicy,
                  this._setNewPolicy.bind(this)
                )}
              </div>
              <details class="member-disclosure">
                <summary>
                  ${
                    this.newMembers.length > 0
                      ? msg('Add people') + ` (${this.newMembers.length})`
                      : msg('Add people')
                  }
                </summary>
                <div class="member-picker">
                  <md-text-field
                    .value=${this.newMemberSearch}
                    placeholder=${msg('Search for accounts')}
                    @input=${this._onNewMemberSearchInput}
                  ></md-text-field>
                  ${
                    this.newMembers.length > 0
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
                                    @click=${() =>
                                      this._unstageNewMember(account)}
                                  >
                                    ×
                                  </button>
                                </div>
                              `
                            )}
                          </div>
                        `
                      : nothing
                  }
                  ${
                    this.newMemberSearching
                      ? html`<div class="search-hint">
                          ${msg('Searching...')}
                        </div>`
                      : this.newMemberSearch.trim() &&
                          this.newMemberResults.length === 0 &&
                          !this.newMemberSearching
                        ? html`<div class="search-hint">
                            ${msg('No results found.')}
                          </div>`
                        : nothing
                  }
                  ${
                    this.newMemberResults.length > 0
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
                                    <div class="account-acct">
                                      @${account.acct}
                                    </div>
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
                      : nothing
                  }
                </div>
              </details>
            </div>
          </div>

          <md-divider></md-divider>

          <div class="section">
            <div class="section-title">${msg('Your lists')}</div>
            ${
              this.errorMessage
                ? html`<div class="error">${this.errorMessage}</div>`
                : nothing
            }
            ${
              this.loading
                ? html`<div class="list-item list-placeholder">
                      <div class="empty list-title">
                        ${msg('Loading lists...')}
                      </div>
                    </div>
                    <div class="list-item list-placeholder">
                      <div class="empty list-title">
                        ${msg('Loading lists...')}
                      </div>
                    </div> `
                : this.lists.length === 0
                  ? html`<div class="list list-placeholder">
                      <div class="empty">
                        ${msg('No lists yet. Create one above.')}
                      </div>
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
                                <md-icon-button
                                  src="/assets/create-outline.svg"
                                  label=${msg('Edit')}
                                  title=${msg('Edit')}
                                  @click=${() => this._openEditDialog(list)}
                                  ?disabled=${this.submitting}
                                ></md-icon-button>
                                <md-icon-button
                                  src="/assets/trash-outline.svg"
                                  label=${msg('Delete')}
                                  title=${msg('Delete')}
                                  @click=${() => this._handleDelete(list.id)}
                                  ?disabled=${this.submitting}
                                ></md-icon-button>
                              </div>
                            </div>
                          `;
                        })}
                      </div>
                    `
            }
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
