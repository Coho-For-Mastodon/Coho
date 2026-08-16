import { html, nothing, type TemplateResult } from 'lit';
import { msg, str } from '@lit/localize';
import type { LocalAttachment } from './types.js';
import type { DraftPost } from '../../services/drafts.js';
import {
  parseScheduledDateTime,
  formatScheduledDateTime,
  getScheduleMinDate,
  getScheduleMinTime,
} from './schedule.js';
import { SCHEDULE_MIN_LEAD_MS } from './types.js';

// --- Poll ---

export interface PollRenderProps {
  pollOptions: string[];
  pollDurationSeconds: number;
  pollMultiple: boolean;
  pollError: string | null;
  onSetOption: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onSetDuration: (seconds: number) => void;
  onSetMultiple: (checked: boolean) => void;
  readInputValue: (e: Event) => string;
}

export function renderPoll(p: PollRenderProps): TemplateResult {
  return html`
    <div class="poll-composer">
      <div class="poll-header">
        <div class="poll-title">${msg('Poll')}</div>
        <div class="poll-subtitle">${msg('Add 2–4 options')}</div>
      </div>

      <div class="poll-options">
        ${p.pollOptions.map(
          (opt, idx) => html`
            <div class="poll-option-row">
              <md-text-field
                class="poll-option-input"
                placeholder=${msg(str`Option ${idx + 1}`)}
                .value=${String(opt ?? '')}
                @input=${(e: Event) => p.onSetOption(idx, p.readInputValue(e))}
              ></md-text-field>

              <md-icon-button
                label=${msg('Remove option')}
                src="/assets/close-outline.svg"
                ?disabled=${p.pollOptions.length <= 2}
                @click=${() => p.onRemoveOption(idx)}
              ></md-icon-button>
            </div>
          `
        )}

        <div class="poll-actions-row">
          <md-button
            variant="text"
            size="small"
            pill
            ?disabled=${p.pollOptions.length >= 4}
            @click=${() => p.onAddOption()}
          >
            ${msg('Add option')}
          </md-button>
        </div>
      </div>

      <div class="poll-settings">
        <md-select
          .value=${String(p.pollDurationSeconds)}
          @change=${(e: CustomEvent<{ value: string }>) =>
            p.onSetDuration(parseInt(e.detail.value, 10))}
          pill
          style="width: 180px; min-width: 180px;"
        >
          <md-option value="${String(5 * 60)}">${msg('5 minutes')}</md-option>
          <md-option value="${String(30 * 60)}">${msg('30 minutes')}</md-option>
          <md-option value="${String(60 * 60)}">${msg('1 hour')}</md-option>
          <md-option value="${String(6 * 60 * 60)}"
            >${msg('6 hours')}</md-option
          >
          <md-option value="${String(24 * 60 * 60)}">${msg('1 day')}</md-option>
          <md-option value="${String(3 * 24 * 60 * 60)}"
            >${msg('3 days')}</md-option
          >
          <md-option value="${String(7 * 24 * 60 * 60)}"
            >${msg('7 days')}</md-option
          >
        </md-select>

        <md-checkbox
          .checked=${p.pollMultiple}
          @change=${(e: CustomEvent<{ checked: boolean }>) =>
            p.onSetMultiple(e.detail.checked)}
        >
          ${msg('Allow multiple choices')}
        </md-checkbox>
      </div>

      ${p.pollError ? html`<div class="poll-error">${p.pollError}</div>` : null}
    </div>
  `;
}

// --- Schedule ---

export interface ScheduleRenderProps {
  scheduleDate: string;
  scheduleTime: string;
  scheduleError: string | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onOpenScheduledStatuses: () => void;
  readInputValue: (e: Event) => string;
}

export function renderSchedule(p: ScheduleRenderProps): TemplateResult {
  const parsed = parseScheduledDateTime(p.scheduleDate, p.scheduleTime);
  const preview =
    parsed && parsed.getTime() >= Date.now() + SCHEDULE_MIN_LEAD_MS
      ? formatScheduledDateTime(parsed.toISOString())
      : '';

  return html`
    <div class="schedule-composer">
      <div class="schedule-header">
        <div class="schedule-title">${msg('Schedule post')}</div>
        <md-button
          variant="text"
          size="small"
          @click=${() => p.onOpenScheduledStatuses()}
        >
          ${msg('Manage scheduled posts')}
        </md-button>
      </div>

      <div class="schedule-inputs">
        <md-text-field
          type="date"
          .value=${p.scheduleDate}
          .min=${getScheduleMinDate()}
          @change=${(e: Event) => p.onDateChange(p.readInputValue(e))}
        ></md-text-field>
        <md-text-field
          type="time"
          .value=${p.scheduleTime}
          .min=${getScheduleMinTime(p.scheduleDate)}
          step="60"
          @change=${(e: Event) => p.onTimeChange(p.readInputValue(e))}
        ></md-text-field>
      </div>

      ${
        preview
          ? html`<div class="schedule-preview">
              ${msg(str`Will publish on ${preview}`)}
            </div>`
          : nothing
      }
      ${
        p.scheduleError
          ? html`<div class="schedule-error">${p.scheduleError}</div>`
          : nothing
      }
    </div>
  `;
}

// --- Proofread Result ---

export interface ProofreadRenderProps {
  proofreadResult: ProofreadResult;
  onApply: () => void;
  onDismiss: () => void;
}

export function renderProofreadResult(p: ProofreadRenderProps): TemplateResult {
  if (p.proofreadResult.corrections.length === 0) {
    return html`
      <span class="proofread-success">
        ✓ ${msg('Looks good!')}
        <md-icon-button
          class="proofread-button"
          label=${msg('Dismiss')}
          src="/assets/close-outline.svg"
          @click="${() => p.onDismiss()}"
        ></md-icon-button>
      </span>
    `;
  }

  return html`
    <div class="proofread-result-container">
      <div class="proofread-dropdown">
        <div class="proofread-dropdown-header">
          <span class="proofread-dropdown-label">
            ${msg('Suggested revision')}
            (${p.proofreadResult.corrections.length}
            change${p.proofreadResult.corrections.length > 1 ? 's' : ''})
          </span>
          <div class="proofread-dropdown-actions">
            <md-button
              size="small"
              variant="filled"
              pill
              @click="${() => p.onApply()}"
              >${msg('Apply')}</md-button
            >
            <md-button
              size="small"
              variant="text"
              @click="${() => p.onDismiss()}"
              >${msg('Dismiss')}</md-button
            >
          </div>
        </div>
        <div class="proofread-dropdown-content">
          <p>${p.proofreadResult.correctedInput}</p>
        </div>
      </div>
    </div>
  `;
}

// --- Attachments ---

export interface AttachmentsRenderProps {
  attaching: boolean;
  attachments: LocalAttachment[];
  onRemove: (id: string) => void;
  onEdit: (attachment: LocalAttachment) => void;
}

export function renderAttachments(p: AttachmentsRenderProps): TemplateResult {
  return html`
    <div class="attachments-reveal">
      ${
        p.attaching
          ? html`
              <div id="attachment-loading">
                <md-skeleton></md-skeleton>
              </div>
            `
          : p.attachments.length > 0
            ? html`
                <ul class="attachments-list">
                  ${p.attachments.map(
                    (attachment) => html`
                      <div class="img-preview">
                        <div class="preview-actions">
                          <md-icon-button
                            size="small"
                            label=${msg('Remove attachment')}
                            @click="${() => p.onRemove(attachment.id)}"
                          >
                            <md-icon src="/assets/close-outline.svg"></md-icon>
                          </md-icon-button>
                          <md-icon-button
                            size="small"
                            label=${msg('Edit attachment')}
                            @click="${() => p.onEdit(attachment)}"
                          >
                            <md-icon src="/assets/brush-outline.svg"></md-icon>
                          </md-icon-button>
                        </div>
                        ${
                          attachment.type === 'video' ||
                          attachment.type === 'gifv'
                            ? html`<video
                                muted
                                preload="metadata"
                                src="${attachment.preview_url}#t=0.5"
                                controls
                              ></video>`
                            : html`<img
                                src="${attachment.preview_url}"
                                alt="${attachment.description || ''}"
                              />`
                        }
                        ${
                          attachment.pending
                            ? html`<div class="upload-spinner-overlay">
                                <div class="upload-spinner"></div>
                              </div>`
                            : nothing
                        }
                      </div>
                    `
                  )}
                </ul>
              `
            : nothing
      }
    </div>
  `;
}

// --- Draft Picker Dialog ---

export interface DraftPickerRenderProps {
  draftPickerOpen: boolean;
  selectedDraftId: string;
  availableDrafts: DraftPost[];
  onClose: () => void;
  onSelectionChange: (
    e: CustomEvent<{ value: string; oldValue: string }>
  ) => void;
  onLoad: () => void;
  formatLabel: (draft: DraftPost) => string;
}

export function renderDraftPickerDialog(
  p: DraftPickerRenderProps
): TemplateResult {
  return html`
    <md-dialog
      label=${msg('Load draft')}
      .open=${p.draftPickerOpen}
      @md-dialog-hide=${() => p.onClose()}
    >
      <div class="draft-picker">
        <p class="draft-picker-copy">
          ${msg('Choose one of your saved drafts.')}
        </p>
        <md-select
          .value=${p.selectedDraftId}
          placeholder=${msg('Select a draft')}
          @change=${p.onSelectionChange}
        >
          ${p.availableDrafts.map(
            (draft) => html`
              <md-option value="${draft.id}">
                ${p.formatLabel(draft)}
              </md-option>
            `
          )}
        </md-select>
      </div>

      <div slot="footer" class="draft-picker-actions">
        <md-button variant="text" @click=${() => p.onClose()}>
          ${msg('Cancel')}
        </md-button>
        <md-button
          variant="filled"
          ?disabled=${!p.selectedDraftId}
          @click=${() => p.onLoad()}
        >
          ${msg('Load draft')}
        </md-button>
      </div>
    </md-dialog>
  `;
}

// --- Actions Toolbar ---

export interface ActionsToolbarRenderProps {
  compact: boolean;
  visibility: string;
  visibilityIconSrc: string;
  visibilityDisplayLabel: string;
  sensitive: boolean;
  emojiPickerOpen: boolean;
  emojiAnchorElement: HTMLElement | null;
  pollEnabled: boolean;
  scheduleEnabled: boolean;
  proofreaderAvailable: boolean;
  proofreading: boolean;
  speechToTextAvailable: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  hasStatus: boolean;
  hasAttachments: boolean;
  hasQuotedPost: boolean;
  maxAttachmentsReached: boolean;
  onVisibilityChange: (value: string) => void;
  onToggleSensitive: () => void;
  onToggleEmojiPicker: () => void;
  onEmojiSelect: (e: CustomEvent<{ shortcode: string; url: string }>) => void;
  onEmojiPickerClose: () => void;
  onAttachFile: () => void;
  onToggleSchedule: () => void;
  onTogglePoll: () => void;
  onDoProofread: () => void;
  onToggleRecording: () => void;
}

export function renderActionsToolbar(
  p: ActionsToolbarRenderProps
): TemplateResult {
  return html`
    <div class="actions-row">
      <!-- Visibility selector -->
      ${
        !p.compact
          ? html`
              <md-select
                .value=${p.visibility}
                .placeholder=${msg('Post visibility')}
                .iconSrc=${p.visibilityIconSrc}
                .iconLabel=${msg('Post visibility')}
                @change=${(e: CustomEvent<{ value: string }>) =>
                  p.onVisibilityChange(e.detail.value)}
                title=${p.visibilityDisplayLabel}
                variant="filled"
                icon-only
              >
                <md-option value="public">${msg('Public')}</md-option>
                <md-option value="unlisted">${msg('Unlisted')}</md-option>
                <md-option value="private">${msg('Followers Only')}</md-option>
                <md-option value="direct">${msg('Direct')}</md-option>
              </md-select>
            `
          : nothing
      }

      <md-icon-button
        class="mobile-icon-button"
        label=${msg('Content Warning')}
        src="/assets/eye-outline.svg"
        .variant=${p.sensitive ? 'filled-tonal' : 'standard'}
        @click="${() => p.onToggleSensitive()}"
      ></md-icon-button>

      <md-icon-button
        id="emoji-trigger"
        class="mobile-icon-button"
        label=${msg('Emoji')}
        src="/assets/happy-outline.svg"
        .variant=${p.emojiPickerOpen ? 'filled-tonal' : 'standard'}
        @click="${() => p.onToggleEmojiPicker()}"
      ></md-icon-button>
      <emoji-picker
        .open=${p.emojiPickerOpen}
        .anchorElement=${p.emojiAnchorElement}
        @emoji-select=${(e: CustomEvent<{ shortcode: string; url: string }>) =>
          p.onEmojiSelect(e)}
        @emoji-picker-close=${() => p.onEmojiPickerClose()}
      ></emoji-picker>

      <md-icon-button
        class="mobile-icon-button"
        label=${msg('Attach Media')}
        src="/assets/attach-outline.svg"
        @click="${() => p.onAttachFile()}"
        ?disabled=${p.pollEnabled || p.hasQuotedPost || p.maxAttachmentsReached}
      ></md-icon-button>

      <!-- Overflow menu -->
      <md-dropdown id="more-options-dropdown" placement="bottom-end">
        <md-icon-button
          slot="trigger"
          name="ellipsis-vertical"
          .label=${msg('More options')}
        ></md-icon-button>
        <md-menu>
          ${
            !p.compact
              ? html`
                  <md-menu-item
                    .selected=${p.scheduleEnabled}
                    @click=${() => p.onToggleSchedule()}
                  >
                    <md-icon
                      slot="prefix"
                      src="/assets/calendar-outline.svg"
                    ></md-icon>
                    ${
                      p.scheduleEnabled
                        ? msg('Edit scheduled time')
                        : msg('Schedule post')
                    }
                  </md-menu-item>
                `
              : nothing
          }

          <md-menu-item
            .selected=${p.pollEnabled}
            ?disabled=${p.hasAttachments || p.hasQuotedPost}
            @click=${() => p.onTogglePoll()}
          >
            <md-icon slot="prefix" src="/assets/chatbox-outline.svg"></md-icon>
            ${p.pollEnabled ? msg('Remove Poll') : msg('Add Poll')}
          </md-menu-item>

          ${
            p.proofreaderAvailable
              ? html`
                  <md-menu-item
                    ?disabled=${!p.hasStatus || p.proofreading}
                    @click=${() => p.onDoProofread()}
                    title=${p.proofreading ? '' : 'On-device AI'}
                  >
                    <md-icon
                      slot="prefix"
                      src="/assets/sparkles-outline.svg"
                    ></md-icon>
                    ${p.proofreading ? msg('Checking...') : msg('Proofread')}
                  </md-menu-item>
                `
              : nothing
          }
          ${
            p.speechToTextAvailable
              ? html`
                  <md-menu-item
                    ?disabled=${p.isTranscribing}
                    @click=${() => p.onToggleRecording()}
                    title=${
                      p.isRecording || p.isTranscribing ? '' : 'On-device AI'
                    }
                  >
                    <md-icon
                      slot="prefix"
                      src="${
                        p.isRecording
                          ? '/assets/stop-circle-outline.svg'
                          : '/assets/mic-outline.svg'
                      }"
                    ></md-icon>
                    ${
                      p.isRecording
                        ? msg('Stop recording')
                        : p.isTranscribing
                          ? msg('Transcribing...')
                          : msg('Voice input')
                    }
                  </md-menu-item>
                `
              : nothing
          }
        </md-menu>
      </md-dropdown>
    </div>
  `;
}
