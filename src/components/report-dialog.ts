import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { msg, str, localized } from '@lit/localize';

import './md/md-dialog';
import './md/md-select';
import './md/md-option';
import './md/md-text-area';
import './md/md-checkbox';
import './md/md-button';

export interface ReportSubmitDetail {
  accountId: string;
  statusId?: string;
  category: 'spam' | 'legal' | 'violation' | 'other';
  comment: string;
  forward: boolean;
}

/**
 * Report Dialog Component
 * A dialog for reporting users to moderators with category selection,
 * comment field, and option to forward to remote instance.
 */
@localized()
@customElement('report-dialog')
export class ReportDialog extends LitElement {
  @property({ type: String }) accountId = '';
  @property({ type: String }) statusId?: string;
  @property({ type: String }) accountAcct = '';
  @property({ type: Boolean }) open = false;

  @state() private _category: 'spam' | 'legal' | 'violation' | 'other' =
    'other';
  @state() private _comment = '';
  @state() private _forward = false;
  @state() private _submitting = false;

  static styles = css`
    :host {
      display: contents;
    }

    .report-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 280px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-field label {
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .report-info {
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .forward-option {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 0;
    }

    .forward-label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .forward-label span {
      font-size: 14px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .forward-label small {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .footer-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    md-select {
      width: 100%;
    }

    md-text-area {
      width: 100%;
    }
  `;

  private get _isRemoteAccount(): boolean {
    return this.accountAcct.includes('@');
  }

  private _handleCategoryChange(e: CustomEvent) {
    this._category = e.detail.value;
  }

  private _handleCommentInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this._comment = target.value;
  }

  private _handleForwardChange() {
    this._forward = !this._forward;
  }

  private _handleCancel() {
    this._resetForm();
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('report-cancel', { bubbles: true, composed: true })
    );
  }

  private async _handleSubmit() {
    if (!this.accountId) return;

    this._submitting = true;

    const detail: ReportSubmitDetail = {
      accountId: this.accountId,
      statusId: this.statusId,
      category: this._category,
      comment: this._comment,
      forward: this._forward,
    };

    this.dispatchEvent(
      new CustomEvent('report-submit', {
        detail,
        bubbles: true,
        composed: true,
      })
    );

    // Parent component will handle the actual API call and close the dialog
  }

  private _resetForm() {
    this._category = 'other';
    this._comment = '';
    this._forward = false;
    this._submitting = false;
  }

  public show() {
    this.open = true;
  }

  public hide() {
    this._resetForm();
    this.open = false;
  }

  public setSubmitting(value: boolean) {
    this._submitting = value;
  }

  render() {
    return html`
      <md-dialog
        label=${msg(str`Report @${this.accountAcct}`)}
        .open=${this.open}
        @md-dialog-hide=${this._handleCancel}
      >
        <div class="report-form">
          <p class="report-info">
            ${msg(
              "Reports are sent to your server's moderators. If this user is from another server, a copy of the report can be forwarded to their server's moderators as well."
            )}
          </p>

          <div class="form-field">
            <label>${msg('Category')}</label>
            <md-select
              .value=${this._category}
              @change=${this._handleCategoryChange}
            >
              <md-option value="spam">${msg('Spam')}</md-option>
              <md-option value="legal">${msg('Illegal Content')}</md-option>
              <md-option value="violation">${msg('Rule Violation')}</md-option>
              <md-option value="other">${msg('Other')}</md-option>
            </md-select>
          </div>

          <div class="form-field">
            <label>${msg('Additional comments (optional)')}</label>
            <md-text-area
              .value=${this._comment}
              placeholder=${msg(
                'Provide any additional context for moderators...'
              )}
              rows="4"
              maxlength="1000"
              @input=${this._handleCommentInput}
            ></md-text-area>
          </div>

          ${this._isRemoteAccount
            ? html`
                <div class="forward-option">
                  <md-checkbox
                    .checked=${this._forward}
                    @change=${this._handleForwardChange}
                  ></md-checkbox>
                  <div class="forward-label">
                    <span>${msg('Forward to remote server')}</span>
                    <small
                      >${msg(
                        'This user is from another server. Forward a copy of this report to their moderators.'
                      )}</small
                    >
                  </div>
                </div>
              `
            : null}
        </div>

        <div slot="footer" class="footer-actions">
          <md-button
            variant="text"
            @click=${this._handleCancel}
            ?disabled=${this._submitting}
          >
            ${msg('Cancel')}
          </md-button>
          <md-button
            variant="filled"
            @click=${this._handleSubmit}
            ?disabled=${this._submitting}
          >
            ${this._submitting ? msg('Submitting...') : msg('Submit Report')}
          </md-button>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'report-dialog': ReportDialog;
  }
}
