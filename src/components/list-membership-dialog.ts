import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-divider';
import './md/md-checkbox';

import type { Account, List } from '../mastodon/types';
import {
  getLists,
  getListAccounts,
  addAccountsToList,
  removeAccountsFromList,
} from '../services/lists';

@localized()
@customElement('list-membership-dialog')
export class ListMembershipDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Object }) account: Account | null = null;

  @state() private lists: List[] = [];
  @state() private membership: Record<string, boolean> = {};
  @state() private loading = false;
  @state() private saving = false;
  @state() private errorMessage = '';

  private initialMembership = new Set<string>();

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

    .intro {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 13px;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container, #f3edf7);
    }

    .list-title {
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .empty {
      padding: 16px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container-low, #f7f2f8);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 14px;
    }

    .error {
      color: var(--md-sys-color-error, #b3261e);
      font-size: 13px;
    }

    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .footer-actions .right {
      display: flex;
      gap: 8px;
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      void this.loadData();
    }
  }

  public show(account?: Account) {
    if (account) {
      this.account = account;
    }
    this.open = true;
  }

  public hide() {
    this.open = false;
    this.errorMessage = '';
  }

  private async loadData() {
    if (!this.account || this.loading) return;
    this.loading = true;
    this.errorMessage = '';

    try {
      const lists = await getLists();
      const membershipEntries = await Promise.all(
        lists.map(async (list) => {
          const accounts = await getListAccounts(list.id);
          const isMember = accounts.some(
            (acct) => acct.id === this.account?.id
          );
          return { listId: list.id, isMember };
        })
      );

      const membership: Record<string, boolean> = {};
      for (const entry of membershipEntries) {
        membership[entry.listId] = entry.isMember;
      }

      this.lists = lists;
      this.membership = membership;
      this.initialMembership = new Set(
        membershipEntries
          .filter((entry) => entry.isMember)
          .map((entry) => entry.listId)
      );
    } catch (error) {
      console.error('Failed to load list membership', error);
      this.errorMessage = msg('Unable to load lists. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private _toggleMembership(listId: string) {
    this.membership = {
      ...this.membership,
      [listId]: !this.membership[listId],
    };
  }

  private async _handleSave() {
    if (!this.account) return;

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const list of this.lists) {
      const current = this.membership[list.id] ?? false;
      const initial = this.initialMembership.has(list.id);
      if (current && !initial) {
        toAdd.push(list.id);
      }
      if (!current && initial) {
        toRemove.push(list.id);
      }
    }

    if (toAdd.length === 0 && toRemove.length === 0) {
      this.hide();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    try {
      await Promise.all([
        ...toAdd.map((listId) => addAccountsToList(listId, [this.account!.id])),
        ...toRemove.map((listId) =>
          removeAccountsFromList(listId, [this.account!.id])
        ),
      ]);

      this.initialMembership = new Set(
        Object.entries(this.membership)
          .filter(([, isMember]) => isMember)
          .map(([listId]) => listId)
      );

      this.hide();
    } catch (error) {
      console.error('Failed to update list membership', error);
      this.errorMessage = msg(
        'Unable to update lists for this account. Please try again.'
      );
    } finally {
      this.saving = false;
    }
  }

  private _openManageLists() {
    this.dispatchEvent(
      new CustomEvent('open-manage-lists', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const displayName =
      this.account?.display_name || this.account?.username || '';

    return html`
      <md-dialog
        label=${msg('Add to lists')}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        <div class="content">
          <div class="intro">
            ${
              displayName
                ? msg(str`Choose lists for ${displayName}`)
                : msg('Choose lists for this account')
            }
          </div>

          ${
            this.errorMessage
              ? html`<div class="error">${this.errorMessage}</div>`
              : nothing
          }
          ${
            this.loading
              ? html`<div class="empty">${msg('Loading lists...')}</div>`
              : this.lists.length === 0
                ? html` <div class="empty">${msg('No lists yet.')}</div> `
                : html`
                    <div class="list">
                      ${this.lists.map(
                        (list) => html`
                          <div class="list-item">
                            <div class="list-title">${list.title}</div>
                            <md-checkbox
                              .checked=${this.membership[list.id] ?? false}
                              @change=${() => this._toggleMembership(list.id)}
                            ></md-checkbox>
                          </div>
                        `
                      )}
                    </div>
                  `
          }
        </div>

        <div slot="footer" class="footer-actions">
          <md-button variant="text" @click=${this._openManageLists}>
            ${msg('Manage lists')}
          </md-button>
          <div class="right">
            <md-button variant="text" @click=${() => this.hide()}>
              ${msg('Cancel')}
            </md-button>
            <md-button
              variant="filled"
              @click=${this._handleSave}
              ?disabled=${this.saving || this.loading}
            >
              ${this.saving ? msg('Saving...') : msg('Save')}
            </md-button>
          </div>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'list-membership-dialog': ListMembershipDialog;
  }
}
