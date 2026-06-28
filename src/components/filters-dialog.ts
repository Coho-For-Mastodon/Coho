import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-text-field';
import './md/md-divider';
import './md/md-checkbox';
import './md/md-switch';
import './md/md-icon';

import type {
  Filter,
  FilterAction,
  FilterContext,
  KeywordAttribute,
} from '../mastodon/types';
import {
  getFilters,
  createFilter,
  updateFilter,
  deleteFilter,
} from '../services/filters';

interface KeywordEntry {
  id?: string;
  keyword: string;
  whole_word: boolean;
}

const FILTER_CONTEXTS: { value: FilterContext; label: () => string }[] = [
  { value: 'home', label: () => msg('Home & lists') },
  { value: 'notifications', label: () => msg('Notifications') },
  { value: 'public', label: () => msg('Public timelines') },
  { value: 'thread', label: () => msg('Threads') },
  { value: 'account', label: () => msg('Profiles') },
];

const EXPIRY_OPTIONS: { value: number | null; label: () => string }[] = [
  { value: null, label: () => msg('Never') },
  { value: 1800, label: () => msg('30 minutes') },
  { value: 3600, label: () => msg('1 hour') },
  { value: 21600, label: () => msg('6 hours') },
  { value: 43200, label: () => msg('12 hours') },
  { value: 86400, label: () => msg('1 day') },
  { value: 604800, label: () => msg('1 week') },
];

type DialogView = 'list' | 'create' | 'edit';

@localized()
@customElement('filters-dialog')
export class FiltersDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _view: DialogView = 'list';
  @state() private _filters: Filter[] = [];
  @state() private _loading = false;
  @state() private _submitting = false;
  @state() private _errorMessage = '';

  // Form state
  @state() private _editingFilter: Filter | null = null;
  @state() private _formTitle = '';
  @state() private _formAction: FilterAction = 'warn';
  @state() private _formContexts: Set<FilterContext> = new Set(['home']);
  @state() private _formExpiresIn: number | null = null;
  @state() private _formKeywords: KeywordEntry[] = [
    { keyword: '', whole_word: true },
  ];

  static styles = css`
    md-dialog::part(dialog) {
      max-width: 560px;
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
      margin-bottom: 8px;
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container, #f3edf7);
    }

    .filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .filter-title {
      font-weight: 600;
      font-size: 16px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .filter-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: 12px;
      font-weight: 500;
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .chip.action-hide {
      background: var(--md-sys-color-error-container, #f9dedc);
      color: var(--md-sys-color-on-error-container, #410e0b);
    }

    .chip.action-warn {
      background: var(--md-sys-color-tertiary-container, #ffd8e4);
      color: var(--md-sys-color-on-tertiary-container, #31111d);
    }

    .chip.action-blur {
      background: var(--md-sys-color-secondary-container, #e8def8);
      color: var(--md-sys-color-on-secondary-container, #1d192b);
    }

    .filter-keywords {
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .filter-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
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

    /* Form styles */
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .action-toggle {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-chip {
      padding: 6px 14px;
      border-radius: var(--md-sys-shape-corner-full);
      border: 1px solid var(--md-sys-color-outline, #79747e);
      font-size: 13px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface, #1d1b20);
      background: transparent;
    }

    .action-chip[aria-pressed='true'] {
      background: var(--md-sys-color-primary-container, #eaddff);
      border-color: transparent;
      color: var(--md-sys-color-on-primary-container, #21005d);
    }

    .context-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .context-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .context-label {
      font-size: 14px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      cursor: pointer;
    }

    .expiry-toggle {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .expiry-chip {
      padding: 6px 12px;
      border-radius: var(--md-sys-shape-corner-full);
      border: 1px solid var(--md-sys-color-outline, #79747e);
      font-size: 12px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface, #1d1b20);
      background: transparent;
    }

    .expiry-chip[aria-pressed='true'] {
      background: var(--md-sys-color-primary-container, #eaddff);
      border-color: transparent;
      color: var(--md-sys-color-on-primary-container, #21005d);
    }

    .keyword-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .keyword-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .keyword-row md-text-field {
      flex: 1;
    }

    .keyword-whole-word {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      white-space: nowrap;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .create-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 4px;
    }

    .filter-expiry {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    @media (max-width: 520px) {
      .filter-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .filter-actions {
        width: 100%;
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      void this._loadFilters();
    }
  }

  public async show() {
    this.open = true;
  }

  public hide() {
    this.open = false;
    this._view = 'list';
    this._resetForm();
  }

  private async _loadFilters() {
    if (this._loading) return;
    this._loading = true;
    this._errorMessage = '';
    try {
      this._filters = await getFilters();
    } catch (error) {
      console.error('Failed to load filters', error);
      this._errorMessage = msg('Unable to load filters. Please try again.');
    } finally {
      this._loading = false;
    }
  }

  private _emitFiltersChanged() {
    this.dispatchEvent(
      new CustomEvent('filters-changed', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _resetForm() {
    this._editingFilter = null;
    this._formTitle = '';
    this._formAction = 'warn';
    this._formContexts = new Set(['home']);
    this._formExpiresIn = null;
    this._formKeywords = [{ keyword: '', whole_word: true }];
    this._submitting = false;
    this._errorMessage = '';
  }

  private _openCreateView() {
    this._resetForm();
    this._view = 'create';
  }

  private _openEditView(filter: Filter) {
    this._editingFilter = filter;
    this._formTitle = filter.title;
    this._formAction = filter.filter_action;
    this._formContexts = new Set(filter.context);
    this._formExpiresIn = null;
    this._formKeywords =
      filter.keywords.length > 0
        ? filter.keywords.map((kw) => ({
            id: kw.id,
            keyword: kw.keyword,
            whole_word: kw.whole_word,
          }))
        : [{ keyword: '', whole_word: true }];
    this._view = 'edit';
  }

  private _backToList() {
    this._view = 'list';
    this._resetForm();
  }

  private _setFormAction(action: FilterAction) {
    this._formAction = action;
  }

  private _toggleContext(ctx: FilterContext) {
    const next = new Set(this._formContexts);
    if (next.has(ctx)) {
      if (next.size > 1) next.delete(ctx);
    } else {
      next.add(ctx);
    }
    this._formContexts = next;
  }

  private _setExpiry(val: number | null) {
    this._formExpiresIn = val;
  }

  private _updateKeyword(index: number, value: string) {
    const updated = [...this._formKeywords];
    updated[index] = { ...updated[index], keyword: value };
    this._formKeywords = updated;
  }

  private _toggleWholeWord(index: number) {
    const updated = [...this._formKeywords];
    updated[index] = {
      ...updated[index],
      whole_word: !updated[index].whole_word,
    };
    this._formKeywords = updated;
  }

  private _addKeyword() {
    this._formKeywords = [
      ...this._formKeywords,
      { keyword: '', whole_word: true },
    ];
  }

  private _removeKeyword(index: number) {
    if (this._formKeywords.length <= 1) return;
    this._formKeywords = this._formKeywords.filter((_, i) => i !== index);
  }

  private _getKeywordAttributes(): KeywordAttribute[] {
    return this._formKeywords
      .filter((kw) => kw.keyword.trim())
      .map((kw) => ({
        keyword: kw.keyword.trim(),
        whole_word: kw.whole_word,
        ...(kw.id ? { id: kw.id } : {}),
      }));
  }

  private async _handleCreate() {
    if (!this._formTitle.trim()) {
      this._errorMessage = msg('Filter title is required.');
      return;
    }

    const kwAttrs = this._getKeywordAttributes();
    if (kwAttrs.length === 0) {
      this._errorMessage = msg('At least one keyword is required.');
      return;
    }

    this._submitting = true;
    this._errorMessage = '';
    try {
      await createFilter({
        title: this._formTitle.trim(),
        context: Array.from(this._formContexts),
        filter_action: this._formAction,
        expires_in: this._formExpiresIn,
        keywords_attributes: kwAttrs,
      });
      await this._loadFilters();
      this._emitFiltersChanged();
      this._backToList();
    } catch (error) {
      console.error('Failed to create filter', error);
      this._errorMessage = msg('Unable to create filter. Please try again.');
    } finally {
      this._submitting = false;
    }
  }

  private async _handleUpdate() {
    if (!this._editingFilter) return;
    if (!this._formTitle.trim()) {
      this._errorMessage = msg('Filter title is required.');
      return;
    }

    const kwAttrs = this._getKeywordAttributes();
    if (kwAttrs.length === 0) {
      this._errorMessage = msg('At least one keyword is required.');
      return;
    }

    // Mark removed keywords with _destroy
    const existingIds = new Set(
      this._editingFilter.keywords.map((kw) => kw.id)
    );
    const keptIds = new Set(kwAttrs.filter((kw) => kw.id).map((kw) => kw.id));
    const destroyedKeywords: KeywordAttribute[] = [];
    for (const id of existingIds) {
      if (!keptIds.has(id)) {
        const original = this._editingFilter.keywords.find(
          (kw) => kw.id === id
        );
        if (original) {
          destroyedKeywords.push({
            id: original.id,
            keyword: original.keyword,
            whole_word: original.whole_word,
            _destroy: true,
          });
        }
      }
    }

    this._submitting = true;
    this._errorMessage = '';
    try {
      await updateFilter(this._editingFilter.id, {
        title: this._formTitle.trim(),
        context: Array.from(this._formContexts),
        filter_action: this._formAction,
        expires_in: this._formExpiresIn,
        keywords_attributes: [...kwAttrs, ...destroyedKeywords],
      });
      await this._loadFilters();
      this._emitFiltersChanged();
      this._backToList();
    } catch (error) {
      console.error('Failed to update filter', error);
      this._errorMessage = msg('Unable to update filter. Please try again.');
    } finally {
      this._submitting = false;
    }
  }

  private async _handleDelete(filterId: string) {
    this._submitting = true;
    this._errorMessage = '';
    try {
      await deleteFilter(filterId);
      this._filters = this._filters.filter((f) => f.id !== filterId);
      this._emitFiltersChanged();
    } catch (error) {
      console.error('Failed to delete filter', error);
      this._errorMessage = msg('Unable to delete filter. Please try again.');
    } finally {
      this._submitting = false;
    }
  }

  private _formatAction(action: FilterAction): string {
    switch (action) {
      case 'hide':
        return msg('Hide');
      case 'warn':
        return msg('Warn');
      case 'blur':
        return msg('Blur media');
      default:
        return msg('Warn');
    }
  }

  private _formatContext(ctx: FilterContext): string {
    const entry = FILTER_CONTEXTS.find((c) => c.value === ctx);
    return entry ? entry.label() : ctx;
  }

  private _formatExpiry(expiresAt: string | null): string {
    if (!expiresAt) return msg('Never expires');
    const date = new Date(expiresAt);
    if (date.getTime() < Date.now()) return msg('Expired');
    return msg(str`Expires ${date.toLocaleDateString()}`);
  }

  private _renderListView() {
    return html`
      <div class="content">
        <div class="create-header">
          <md-button variant="filled" @click=${this._openCreateView}>
            ${msg('Create filter')}
          </md-button>
        </div>

        ${
          this._errorMessage
            ? html`<div class="error">${this._errorMessage}</div>`
            : nothing
        }
        ${
          this._loading
            ? html`<div class="empty">${msg('Loading filters...')}</div>`
            : this._filters.length === 0
              ? html`<div class="empty">
                  ${msg('No filters yet. Create one to curate your timeline.')}
                </div>`
              : html`
                  <div class="filter-list">
                    ${this._filters.map((filter) =>
                      this._renderFilterItem(filter)
                    )}
                  </div>
                `
        }
      </div>
    `;
  }

  private _renderFilterItem(filter: Filter) {
    const actionClass = `action-${filter.filter_action}`;
    return html`
      <div class="filter-item">
        <div class="filter-header">
          <span class="filter-title">${filter.title}</span>
          <div class="filter-actions">
            <md-button
              variant="text"
              size="small"
              @click=${() => this._openEditView(filter)}
              ?disabled=${this._submitting}
            >
              ${msg('Edit')}
            </md-button>
            <md-button
              variant="text"
              size="small"
              @click=${() => this._handleDelete(filter.id)}
              ?disabled=${this._submitting}
            >
              ${msg('Delete')}
            </md-button>
          </div>
        </div>
        <div class="filter-meta">
          <span class="chip ${actionClass}">
            ${this._formatAction(filter.filter_action)}
          </span>
          ${filter.context.map(
            (ctx) => html`<span class="chip">${this._formatContext(ctx)}</span>`
          )}
        </div>
        ${
          filter.keywords.length > 0
            ? html`<div class="filter-keywords">
                ${filter.keywords.map((kw) => kw.keyword).join(', ')}
              </div>`
            : nothing
        }
        <div class="filter-expiry">
          ${this._formatExpiry(filter.expires_at)}
        </div>
      </div>
    `;
  }

  private _renderFormView() {
    const isEdit = this._view === 'edit';

    return html`
      <div class="content">
        <div class="form">
          <div class="form-field">
            <span class="form-label">${msg('Title')}</span>
            <md-text-field
              .value=${this._formTitle}
              placeholder=${msg('Filter name')}
              @input=${(e: InputEvent) =>
                (this._formTitle = (e.target as HTMLInputElement).value)}
            ></md-text-field>
          </div>

          <div class="form-field">
            <span class="form-label">${msg('Filter action')}</span>
            <div
              class="action-toggle"
              role="group"
              aria-label=${msg('Filter action')}
            >
              ${(
                [
                  { value: 'warn', label: msg('Show warning') },
                  { value: 'hide', label: msg('Hide completely') },
                  { value: 'blur', label: msg('Blur media') },
                ] as { value: FilterAction; label: string }[]
              ).map(
                (opt) => html`
                  <button
                    class="action-chip"
                    type="button"
                    aria-pressed=${this._formAction === opt.value}
                    @click=${() => this._setFormAction(opt.value)}
                  >
                    ${opt.label}
                  </button>
                `
              )}
            </div>
          </div>

          <div class="form-field">
            <span class="form-label">${msg('Apply to')}</span>
            <div class="context-grid">
              ${FILTER_CONTEXTS.map(
                (ctx) => html`
                  <label class="context-row">
                    <md-checkbox
                      ?checked=${this._formContexts.has(ctx.value)}
                      @change=${() => this._toggleContext(ctx.value)}
                    ></md-checkbox>
                    <span class="context-label">${ctx.label()}</span>
                  </label>
                `
              )}
            </div>
          </div>

          <div class="form-field">
            <span class="form-label">${msg('Expiry')}</span>
            <div class="expiry-toggle">
              ${EXPIRY_OPTIONS.map(
                (opt) => html`
                  <button
                    class="expiry-chip"
                    type="button"
                    aria-pressed=${this._formExpiresIn === opt.value}
                    @click=${() => this._setExpiry(opt.value)}
                  >
                    ${opt.label()}
                  </button>
                `
              )}
            </div>
          </div>

          <md-divider></md-divider>

          <div class="form-field">
            <span class="form-label">${msg('Keywords')}</span>
            <div class="keyword-list">
              ${this._formKeywords.map(
                (kw, i) => html`
                  <div class="keyword-row">
                    <md-text-field
                      .value=${kw.keyword}
                      placeholder=${msg('Keyword or phrase')}
                      @input=${(e: InputEvent) =>
                        this._updateKeyword(
                          i,
                          (e.target as HTMLInputElement).value
                        )}
                    ></md-text-field>
                    <label class="keyword-whole-word">
                      <md-checkbox
                        ?checked=${kw.whole_word}
                        @change=${() => this._toggleWholeWord(i)}
                      ></md-checkbox>
                      ${msg('Whole word')}
                    </label>
                    ${
                      this._formKeywords.length > 1
                        ? html`<md-button
                            variant="text"
                            size="small"
                            @click=${() => this._removeKeyword(i)}
                          >
                            ${msg('Remove')}
                          </md-button>`
                        : nothing
                    }
                  </div>
                `
              )}
            </div>
            <md-button variant="text" size="small" @click=${this._addKeyword}>
              ${msg('Add keyword')}
            </md-button>
          </div>

          ${
            this._errorMessage
              ? html`<div class="error">${this._errorMessage}</div>`
              : nothing
          }

          <div class="form-actions">
            <md-button
              variant="text"
              @click=${this._backToList}
              ?disabled=${this._submitting}
            >
              ${msg('Cancel')}
            </md-button>
            <md-button
              variant="filled"
              @click=${isEdit ? this._handleUpdate : this._handleCreate}
              ?disabled=${this._submitting || !this._formTitle.trim()}
            >
              ${
                this._submitting
                  ? msg('Saving...')
                  : isEdit
                    ? msg('Save changes')
                    : msg('Create filter')
              }
            </md-button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const label =
      this._view === 'list'
        ? msg('Content filters')
        : this._view === 'create'
          ? msg('Create filter')
          : msg('Edit filter');

    return html`
      <md-dialog
        label=${label}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        ${
          this._view === 'list'
            ? this._renderListView()
            : this._renderFormView()
        }
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'filters-dialog': FiltersDialog;
  }
}
