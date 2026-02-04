import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-text-field';
import './md/md-divider';

import type { List, ListRepliesPolicy } from '../mastodon/types';
import {
  getLists,
  createList,
  updateList,
  deleteList,
} from '../services/lists';

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

  @state() private editingId: string | null = null;
  @state() private editingTitle = '';
  @state() private editingRepliesPolicy: ListRepliesPolicy = 'list';

  static styles = css`
    md-dialog::part(dialog) {
      max-width: 520px;
      width: 92vw;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);

      margin-bottom: 10px;
    }

    .create-form {
      display: grid;
      gap: 12px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .list-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border-radius: 12px;
      background: var(--md-sys-color-surface-container, #f3edf7);
    }

    .list-title {
      font-weight: 600;
      font-size: 16px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .list-meta {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-top: 2px;
    }

    .list-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .empty {
      padding: 16px;
      border-radius: 12px;
      background: var(--md-sys-color-surface-container-low, #f7f2f8);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    .error {
      color: var(--md-sys-color-error, #b3261e);
      font-size: 13px;
    }

    .edit-form {
      display: grid;
      gap: 10px;
      margin-top: 8px;
    }

    .policy-toggle {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .policy-chip {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      font-size: 12px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface, #1d1b20);
      background: transparent;
    }

    .policy-chip[aria-pressed='true'] {
      background: var(--md-sys-color-primary-container, #eaddff);
      border-color: transparent;
      color: var(--md-sys-color-on-primary-container, #21005d);
    }

    @media (max-width: 520px) {
      .list-item {
        grid-template-columns: 1fr;
      }

      .list-actions {
        justify-content: flex-start;
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
    this.editingId = null;
    this.editingTitle = '';
    this.editingRepliesPolicy = 'list';
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

  private _setEditingPolicy(policy: ListRepliesPolicy) {
    this.editingRepliesPolicy = policy;
  }

  private _startEditing(list: List) {
    this.editingId = list.id;
    this.editingTitle = list.title;
    this.editingRepliesPolicy = list.replies_policy ?? 'list';
  }

  private _cancelEditing() {
    this.editingId = null;
    this.editingTitle = '';
    this.editingRepliesPolicy = 'list';
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
      this.lists = [created, ...this.lists];
      this._emitListsUpdated();
      this.newTitle = '';
      this.newRepliesPolicy = 'list';
    } catch (error) {
      console.error('Failed to create list', error);
      this.errorMessage = msg('Unable to create list. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private async _handleSaveEdit() {
    if (!this.editingId) return;
    if (!this.editingTitle.trim()) {
      this.errorMessage = msg('List name is required.');
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    try {
      const updated = await updateList(
        this.editingId,
        this.editingTitle.trim(),
        this.editingRepliesPolicy
      );
      this.lists = this.lists.map((list) =>
        list.id === updated.id ? updated : list
      );
      this._emitListsUpdated();
      this._cancelEditing();
    } catch (error) {
      console.error('Failed to update list', error);
      this.errorMessage = msg('Unable to update list. Please try again.');
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
      if (this.editingId === listId) {
        this._cancelEditing();
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
      <md-dialog
        label=${msg('Manage lists')}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        <div class="content">
          <div>
            <div class="section-title">${msg('Create a list')}</div>
            <div class="create-form">
              <md-text-field
                .value=${this.newTitle}
                placeholder=${msg('List name')}
                @input=${(e: InputEvent) =>
                  (this.newTitle = (e.target as HTMLInputElement).value)}
              ></md-text-field>
              ${this._renderPolicyToggle(
                this.newRepliesPolicy,
                this._setNewPolicy.bind(this)
              )}
              <div class="form-actions">
                <md-button
                  variant="filled"
                  @click=${this._handleCreate}
                  ?disabled=${this.submitting || !this.newTitle.trim()}
                >
                  ${this.submitting ? msg('Creating...') : msg('Create list')}
                </md-button>
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
                        const isEditing = this.editingId === list.id;
                        const repliesPolicy = list.replies_policy ?? 'list';
                        return html`
                          <div class="list-item">
                            <div>
                              <div class="list-title">${list.title}</div>
                              <div class="list-meta">
                                ${msg('Replies')}:
                                ${this._formatRepliesPolicy(repliesPolicy)}
                              </div>
                              ${isEditing
                                ? html`
                                    <div class="edit-form">
                                      <md-text-field
                                        .value=${this.editingTitle}
                                        placeholder=${msg('List name')}
                                        @input=${(e: InputEvent) =>
                                          (this.editingTitle = (
                                            e.target as HTMLInputElement
                                          ).value)}
                                      ></md-text-field>
                                      ${this._renderPolicyToggle(
                                        this.editingRepliesPolicy,
                                        this._setEditingPolicy.bind(this)
                                      )}
                                      <div class="form-actions">
                                        <md-button
                                          variant="text"
                                          @click=${this._cancelEditing}
                                          ?disabled=${this.submitting}
                                        >
                                          ${msg('Cancel')}
                                        </md-button>
                                        <md-button
                                          variant="filled"
                                          @click=${this._handleSaveEdit}
                                          ?disabled=${this.submitting ||
                                          !this.editingTitle.trim()}
                                        >
                                          ${this.submitting
                                            ? msg('Saving...')
                                            : msg('Save')}
                                        </md-button>
                                      </div>
                                    </div>
                                  `
                                : nothing}
                            </div>
                            <div class="list-actions">
                              ${!isEditing
                                ? html`
                                    <md-button
                                      variant="text"
                                      @click=${() => this._startEditing(list)}
                                      ?disabled=${this.submitting}
                                    >
                                      ${msg('Edit')}
                                    </md-button>
                                  `
                                : nothing}
                              <md-button
                                variant="text"
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
