import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';
import './md/md-icon';
import './md/md-text-field';

import type { ScheduledStatus } from '../mastodon/types';
import {
  getScheduledStatuses,
  updateScheduledStatus,
  deleteScheduledStatus,
} from '../services/scheduled-statuses';

const SCHEDULE_MIN_LEAD_MS = 5 * 60 * 1000;

@localized()
@customElement('scheduled-statuses-dialog')
export class ScheduledStatusesDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _statuses: ScheduledStatus[] = [];
  @state() private _loading = false;
  @state() private _errorMessage = '';
  @state() private _expandedId: string | null = null;

  @state() private _editingId: string | null = null;
  @state() private _scheduleDate = '';
  @state() private _scheduleTime = '';

  @state() private _savingId: string | null = null;
  @state() private _cancelingId: string | null = null;

  static styles = css`
    md-dialog::part(dialog) {
      max-width: 620px;
      width: 92vw;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hint {
      margin: 0;
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .loading,
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
      margin: 0;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item {
      border-radius: var(--md-sys-shape-corner-medium);
      padding: 12px;
      background: var(--md-sys-color-surface-container, #f3edf7);
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: fadeInUp 0.2s ease;
    }

    .item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .item-time {
      font-size: 14px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 6px;
    }

    .status-text {
      margin: 0;
      font-size: 14px;
      line-height: 1.35;
      color: var(--md-sys-color-on-surface, #1d1b20);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: 12px;
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .edit-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px;
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-surface-container-high, #ece6f0);
    }

    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    @media (max-width: 640px) {
      .field-grid {
        grid-template-columns: 1fr;
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      void this._loadStatuses();
    }
  }

  public show() {
    this.open = true;
  }

  public hide() {
    this.open = false;
    this._errorMessage = '';
    this._editingId = null;
    this._savingId = null;
    this._cancelingId = null;
  }

  private _sortStatuses(statuses: ScheduledStatus[]): ScheduledStatus[] {
    return [...statuses].sort((a, b) => {
      const aTs = new Date(a.scheduled_at).getTime();
      const bTs = new Date(b.scheduled_at).getTime();
      return aTs - bTs;
    });
  }

  private async _loadStatuses() {
    if (this._loading) return;
    this._loading = true;
    this._errorMessage = '';
    try {
      const statuses = await getScheduledStatuses();
      this._statuses = this._sortStatuses(statuses);
    } catch (error) {
      console.error('Failed to load scheduled statuses', error);
      this._errorMessage = msg(
        'Unable to load scheduled posts. Please try again.'
      );
    } finally {
      this._loading = false;
    }
  }

  private _toggleDetails(id: string) {
    this._expandedId = this._expandedId === id ? null : id;
  }

  private _toInputDateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _toInputTimeValue(value: Date): string {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private _setScheduleDate(value: string) {
    this._scheduleDate = value;
    this._errorMessage = '';
  }

  private _setScheduleTime(value: string) {
    this._scheduleTime = value;
    this._errorMessage = '';
  }

  private _startEditing(status: ScheduledStatus) {
    const parsed = new Date(status.scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      this._errorMessage = msg('Choose a valid date and time.');
      return;
    }

    this._editingId = status.id;
    this._expandedId = status.id;
    this._scheduleDate = this._toInputDateValue(parsed);
    this._scheduleTime = this._toInputTimeValue(parsed);
    this._errorMessage = '';
  }

  private _stopEditing() {
    this._editingId = null;
    this._scheduleDate = '';
    this._scheduleTime = '';
    this._errorMessage = '';
  }

  private _getScheduleMinDate(): string {
    return this._toInputDateValue(new Date(Date.now() + SCHEDULE_MIN_LEAD_MS));
  }

  private _getScheduleMinTime(): string {
    if (!this._scheduleDate) return '';

    const minDate = new Date(Date.now() + SCHEDULE_MIN_LEAD_MS);
    if (this._scheduleDate !== this._toInputDateValue(minDate)) return '';

    return this._toInputTimeValue(minDate);
  }

  private _parseScheduleDateTime(): Date | null {
    if (!this._scheduleDate || !this._scheduleTime) return null;

    const hasSeconds = this._scheduleTime.split(':').length > 2;
    const timeValue = hasSeconds
      ? this._scheduleTime
      : `${this._scheduleTime}:00`;
    const parsed = new Date(`${this._scheduleDate}T${timeValue}`);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private async _saveSchedule() {
    if (!this._editingId) return;
    if (!this._scheduleDate || !this._scheduleTime) {
      this._errorMessage = msg('Choose a date and time.');
      return;
    }

    const parsed = this._parseScheduleDateTime();
    if (!parsed) {
      this._errorMessage = msg('Choose a valid date and time.');
      return;
    }

    if (parsed.getTime() < Date.now() + SCHEDULE_MIN_LEAD_MS) {
      this._errorMessage = msg(
        'Schedule your post at least 5 minutes in the future.'
      );
      return;
    }

    const id = this._editingId;
    this._savingId = id;
    this._errorMessage = '';

    try {
      const updated = await updateScheduledStatus(id, parsed.toISOString());
      this._statuses = this._sortStatuses(
        this._statuses.map((item) => (item.id === id ? updated : item))
      );
      this._stopEditing();
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Scheduled post updated.'),
            variant: 'success',
          },
        })
      );
    } catch (error) {
      console.error('Failed to update scheduled status', error);
      this._errorMessage = msg('Unable to update this scheduled post.');
    } finally {
      this._savingId = null;
    }
  }

  private async _cancelScheduledStatus(id: string) {
    const confirmed = window.confirm(msg('Cancel this scheduled post?'));
    if (!confirmed) return;

    this._cancelingId = id;
    this._errorMessage = '';

    try {
      await deleteScheduledStatus(id);
      this._statuses = this._statuses.filter((item) => item.id !== id);

      if (this._expandedId === id) {
        this._expandedId = null;
      }
      if (this._editingId === id) {
        this._stopEditing();
      }

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Scheduled post canceled.'),
            variant: 'success',
          },
        })
      );
    } catch (error) {
      console.error('Failed to cancel scheduled status', error);
      this._errorMessage = msg('Unable to cancel this scheduled post.');
    } finally {
      this._cancelingId = null;
    }
  }

  private _formatScheduledDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private _formatVisibility(value: string | undefined): string {
    switch (value) {
      case 'public':
        return msg('Public');
      case 'unlisted':
        return msg('Unlisted');
      case 'private':
        return msg('Followers only');
      case 'direct':
        return msg('Direct');
      case undefined:
        return msg('Unknown visibility');
      default:
        return msg('Unknown visibility');
    }
  }

  render() {
    return html`
      <md-dialog
        label=${msg('Scheduled posts')}
        .open=${this.open}
        @md-dialog-hide=${() => this.hide()}
      >
        <md-button
          slot="header-actions"
          variant="text"
          size="small"
          ?disabled=${this._loading}
          @click=${() => this._loadStatuses()}
        >
          <md-icon slot="prefix" src="/assets/refresh-circle-outline.svg">
          </md-icon>
          ${msg('Refresh')}
        </md-button>

        <div class="content">
          <p class="hint">
            ${msg('Review, reschedule, or cancel posts queued for publishing.')}
          </p>

          ${this._errorMessage
            ? html`<p class="error">${this._errorMessage}</p>`
            : nothing}
          ${this._loading
            ? html`
                <div class="loading">${msg('Loading scheduled posts...')}</div>
              `
            : this._statuses.length === 0
              ? html`
                  <div class="empty">
                    ${msg('No scheduled posts right now.')}
                  </div>
                `
              : html`
                  <div class="list">
                    ${this._statuses.map((status) => {
                      const isExpanded = this._expandedId === status.id;
                      const isEditing = this._editingId === status.id;
                      const isSaving = this._savingId === status.id;
                      const isCanceling = this._cancelingId === status.id;
                      const statusText =
                        status.params?.text?.trim() ||
                        msg('(No text in this scheduled post)');
                      const warningText = status.params?.warning_text?.trim();
                      const mediaCount = status.media_attachments?.length ?? 0;
                      const pollCount =
                        status.params?.poll?.options?.length ?? 0;

                      return html`
                        <div class="item">
                          <div class="item-top">
                            <div class="item-time">
                              ${this._formatScheduledDateTime(
                                status.scheduled_at
                              )}
                            </div>

                            <div class="item-actions">
                              <md-button
                                variant="text"
                                size="small"
                                ?disabled=${isSaving || isCanceling}
                                @click=${() => this._toggleDetails(status.id)}
                              >
                                ${isExpanded
                                  ? msg('Hide details')
                                  : msg('View details')}
                              </md-button>
                              <md-button
                                variant="text"
                                size="small"
                                ?disabled=${isSaving || isCanceling}
                                @click=${() => this._startEditing(status)}
                              >
                                ${msg('Reschedule')}
                              </md-button>
                              <md-button
                                variant="text"
                                size="small"
                                ?disabled=${isSaving || isCanceling}
                                @click=${() =>
                                  this._cancelScheduledStatus(status.id)}
                              >
                                ${isCanceling
                                  ? msg('Canceling...')
                                  : msg('Cancel post')}
                              </md-button>
                            </div>
                          </div>

                          ${isExpanded || isEditing
                            ? html`
                                <div class="details">
                                  <p class="status-text">${statusText}</p>

                                  <div class="meta">
                                    <span class="chip"
                                      >${this._formatVisibility(
                                        status.params?.visibility
                                      )}</span
                                    >
                                    ${warningText
                                      ? html`
                                          <span class="chip"
                                            >${msg('Content warning')}</span
                                          >
                                        `
                                      : nothing}
                                    ${mediaCount > 0
                                      ? html`
                                          <span class="chip"
                                            >${msg(
                                              str`${mediaCount} attachments`
                                            )}</span
                                          >
                                        `
                                      : nothing}
                                    ${pollCount > 0
                                      ? html`
                                          <span class="chip"
                                            >${msg(
                                              str`Poll (${pollCount} options)`
                                            )}</span
                                          >
                                        `
                                      : nothing}
                                  </div>

                                  ${isEditing
                                    ? html`
                                        <div class="edit-block">
                                          <div class="field-grid">
                                            <label class="field">
                                              <span class="field-label"
                                                >${msg('Date')}</span
                                              >
                                              <md-text-field
                                                type="date"
                                                .value=${this._scheduleDate}
                                                .min=${this._getScheduleMinDate()}
                                                @input=${(
                                                  event: CustomEvent<{
                                                    value: string;
                                                  }>
                                                ) =>
                                                  this._setScheduleDate(
                                                    event.detail.value
                                                  )}
                                              ></md-text-field>
                                            </label>
                                            <label class="field">
                                              <span class="field-label"
                                                >${msg('Time')}</span
                                              >
                                              <md-text-field
                                                type="time"
                                                .value=${this._scheduleTime}
                                                .min=${this._getScheduleMinTime()}
                                                step="60"
                                                @input=${(
                                                  event: CustomEvent<{
                                                    value: string;
                                                  }>
                                                ) =>
                                                  this._setScheduleTime(
                                                    event.detail.value
                                                  )}
                                              ></md-text-field>
                                            </label>
                                          </div>

                                          <div class="edit-actions">
                                            <md-button
                                              variant="text"
                                              size="small"
                                              ?disabled=${isSaving}
                                              @click=${() =>
                                                this._stopEditing()}
                                            >
                                              ${msg('Keep current time')}
                                            </md-button>
                                            <md-button
                                              variant="filled"
                                              size="small"
                                              ?disabled=${isSaving}
                                              @click=${() =>
                                                this._saveSchedule()}
                                            >
                                              ${isSaving
                                                ? msg('Saving...')
                                                : msg('Save')}
                                            </md-button>
                                          </div>
                                        </div>
                                      `
                                    : nothing}
                                </div>
                              `
                            : nothing}
                        </div>
                      `;
                    })}
                  </div>
                `}
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'scheduled-statuses-dialog': ScheduledStatusesDialog;
  }
}
