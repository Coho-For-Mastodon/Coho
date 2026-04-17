import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { msg, str, localized } from '@lit/localize';
import { spinAnimation } from '../styles/animations';

import './md/md-button.js';
import './md/md-text-field.js';
import './md/md-text-area.js';
import './md/md-icon.js';
import './md/md-icon-button.js';
import './md/md-dialog.js';
import './md/md-select.js';
import './md/md-option.js';
import './md/md-checkbox.js';
import './md/md-dropdown.js';
import './md/md-menu.js';
import './md/md-menu-item.js';
import './media-edit-dialog.js';
import './md/md-skeleton.js';
import './handwriting-dialog.js';
import './quoted-post.js';

import type { MdTextArea } from './md/md-text-area.js';
import type { MdDropdown } from './md/md-dropdown.js';

import {
  publishPost,
  publishPollPost,
  replyToPost,
  editPost,
  getStatusSource,
  uploadMediaBlob,
  updateMedia,
  pickMedia,
} from '../services/posts';
import { getInstanceInfo, searchAccounts } from '../services/account';
import {
  proofread,
  isProofreaderAvailable,
  isAudioTranscriptionAvailable,
  transcribeAudio,
  isHandwritingRecognitionAvailable,
} from '../services/ai';
import { showInfoToast, showErrorToast } from '../utils/optimistic-updates';
import {
  estimateMentionDropdownHeight,
  findMentionMatch,
  getCaretCoordinates,
} from '../utils/mention-utils';
import {
  buildDraftKey,
  listDraftsForContext,
  saveDraftForContext,
  type DraftPost,
} from '../services/drafts';

import type { Post } from '../interfaces/Post';
import type { Account as MastodonAccount } from '../mastodon/types/account';

import MarkdownWorker from '../utils/markdown-worker?worker';

const SCHEDULE_MIN_LEAD_MS = 5 * 60 * 1000;

export interface LocalAttachment {
  id: string;
  preview_url: string;
  description: string | null;
  pending?: boolean;
  file?: File;
  type?: 'image' | 'video' | 'gifv' | 'audio' | 'unknown';
}

export interface ComposerSubmitEvent {
  status: string;
  attachments: LocalAttachment[];
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  poll: {
    options: string[];
    expiresIn: number;
    multiple: boolean;
  } | null;
  scheduledAt: string | null;
  replyToId: string | null;
  quotedStatusId: string | null;
}

/**
 * A reusable post composer component that can be used for both new posts and replies.
 * Supports media attachments, polls, AI features (proofreading, speech-to-text, handwriting),
 * content warnings, and visibility settings.
 *
 * @fires submit - Dispatched when the user submits the post
 * @fires published - Dispatched after the post is successfully published (when autoPublish is true)
 * @fires draft-saved - Dispatched after a draft is successfully saved
 */
@localized()
@customElement('post-composer')
export class PostComposer extends LitElement {
  /**
   * The post being replied to, if any. When set, the composer shows a "replying to" indicator.
   */
  @property({ type: Object }) replyTo: Post | null = null;

  /**
   * The post being quoted. When set, a quote preview is shown and media/poll are disabled.
   */
  @property({ type: Object }) quotedPost: Post | null = null;

  /**
   * Whether this composer is in compact mode (for inline replies).
   * Compact mode shows fewer action buttons.
   */
  @property({ type: Boolean }) compact = false;

  /**
   * Placeholder text for the textarea.
   */
  @property({ type: String }) placeholder = '';

  /**
   * Whether to automatically publish the post when submitted.
   * If false, the component will dispatch a 'submit' event with the post data.
   */
  @property({ type: Boolean }) autoPublish = true;

  /**
   * Hide the "Replying to @..." indicator while still using replyTo for the API.
   * Useful for DM thread views where the reply context is implicit.
   */
  @property({ type: Boolean }) hideReplyIndicator = false;

  /**
   * Hide draft save/load UI. Useful for ephemeral contexts like DM threads.
   */
  @property({ type: Boolean }) hideDrafts = false;

  /**
   * Hide the actions toolbar (attach, poll, CW, visibility, etc).
   * Useful for minimal composer contexts like DM chat input.
   */
  @property({ type: Boolean }) hideActions = false;

  /**
   * Number of rows for the textarea.
   */
  @property({ type: Number }) rows = 6;

  /**
   * The post being edited, if any. When set, the composer enters edit mode,
   * fetches the source text, and pre-populates all fields.
   */
  @property({ type: Object }) editingPost: Post | null = null;

  @state() attachments: Array<LocalAttachment> = [];
  @state() editDialogOpen = false;
  @state() activeAttachment: LocalAttachment | null = null;
  @state() activeAttachmentImageSrc: string = '';
  @state() attaching: boolean = false;

  @state() statusText: string = '';
  @state() hasStatus: boolean = false;
  @state() sensitive: boolean = false;
  @state() spoilerText: string = '';
  @state() visibility: string = 'public';
  @state() scheduleEnabled: boolean = false;
  @state() scheduleDate: string = '';
  @state() scheduleTime: string = '';
  @state() scheduleError: string | null = null;

  @state() maxChars: number = 500;
  @state() maxMediaAttachments: number = 4;
  @state() charCount: number = 0;

  // Instance media limits (fetched in firstUpdated)
  @state() imageSizeLimit: number = 10 * 1024 * 1024; // 10 MB default
  @state() videoSizeLimit: number = 40 * 1024 * 1024; // 40 MB default

  // Mention picker state
  @state() mentionOpen: boolean = false;
  @state() mentionQuery: string = '';
  @state() mentionResults: MastodonAccount[] = [];
  @state() mentionLoading: boolean = false;
  @state() mentionActiveIndex: number = -1;
  @state() mentionAnchorLeft: number = 0;
  @state() mentionAnchorTop: number = 0;
  @state() mentionDropdownWidth: number = 280;
  @state() mentionAnchorReady: boolean = false;

  // Poll composer state
  @state() pollEnabled: boolean = false;
  @state() pollOptions: string[] = ['', ''];
  @state() pollDurationSeconds: number = 60 * 60; // 1h default
  @state() pollMultiple: boolean = false;
  @state() pollError: string | null = null;

  @state() proofreading: boolean = false;
  @state() proofreadResult: ProofreadResult | null = null;
  @state() proofreaderAvailable: boolean = false;

  // Speech-to-text state
  @state() isRecording: boolean = false;
  @state() isTranscribing: boolean = false;
  @state() speechToTextAvailable: boolean = false;

  // Handwriting recognition state
  @state() handwritingAvailable: boolean = false;
  @state() handwritingDialogOpen: boolean = false;

  // Emoji picker state
  @state() emojiPickerOpen: boolean = false;

  // Drag and drop state
  @state() isDraggingOver: boolean = false;

  // Publishing state
  @state() isPublishing: boolean = false;
  @state() publishSuccess: boolean = false;

  // Draft state
  @state() draftStatus: 'idle' | 'saving' | 'saved' = 'idle';
  @state() availableDrafts: DraftPost[] = [];
  @state() draftPickerOpen: boolean = false;
  @state() selectedDraftId: string = '';
  @state() draftDirty: boolean = false;

  // Draft loaded highlight state
  @state() private draftLoaded: boolean = false;

  // Snapshot of status text at the time a draft was loaded/saved, used to detect changes
  private lastSavedStatusText: string = '';

  // Draft saved fade timer
  private draftSavedTimer: ReturnType<typeof setTimeout> | null = null;

  // MediaRecorder for speech-to-text
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private activeAttachmentBlobUrl: string | null = null;

  private draftKey: string | null = null;

  private mentionQueryRange: { start: number; end: number } | null = null;
  private mentionSearchTimer: number | null = null;
  private mentionRequestId = 0;

  @query('md-text-area') private textArea!: MdTextArea;
  @query('media-edit-dialog')
  private mediaEditDialog!: import('./media-edit-dialog').MediaEditDialog;
  @query('#emoji-trigger') private _emojiButton!: HTMLElement;
  @query('#more-options-dropdown') private _moreOptionsDropdown?: MdDropdown;

  static styles = [
    spinAnimation,
    css`
      :host {
        display: block;
      }

      .composer-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .text-area-wrapper {
        position: relative;
        anchor-name: --composer-text-area;
      }

      .mention-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: auto;
        z-index: 20;
        max-height: 240px;
        overflow-y: auto;
        border-radius: var(--md-sys-shape-corner-medium);
        background: var(--md-sys-color-surface-container, #f3edf7);
        border: 1px solid
          var(--md-sys-color-outline-variant, rgba(0, 0, 0, 0.12));
        box-shadow:
          0 8px 20px rgba(0, 0, 0, 0.2),
          0 2px 6px rgba(0, 0, 0, 0.15);
        width: min(320px, 100%);
      }

      @supports (position-anchor: --composer-text-area) {
        .mention-dropdown {
          position-anchor: --composer-text-area;
          top: anchor(bottom);
          left: anchor(left);
          right: auto;
          margin-top: 6px;
        }
      }

      .mention-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s cubic-bezier(0.2, 0, 0, 1);
      }

      .mention-item:hover,
      .mention-item.active {
        background-color: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #1d1b20) 10%,
          transparent
        );
      }

      .mention-avatar {
        width: 28px;
        height: 28px;
        border-radius: var(--md-sys-shape-corner-full);
        object-fit: cover;
        flex-shrink: 0;
        background: var(--md-sys-color-surface-container-high, #e6e0e9);
      }

      .mention-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 2px;
      }

      .mention-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface, #1d1b20);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mention-acct {
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mention-state {
        padding: 12px;
        text-align: center;
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
      }

      .replying-to-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant);
        padding: 4px 8px;
        background: var(--md-sys-color-surface-container-high);
        border-radius: var(--md-sys-shape-corner-small);
      }

      .poll-composer {
        animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
        margin-top: 12px;
        padding: 12px;
        border-radius: var(--md-sys-shape-corner-medium);
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #ffffff) 6%,
          transparent
        );
        border: 1px solid
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
      }

      .poll-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 10px;
      }

      .poll-title {
        font-weight: 700;
        font-size: var(--md-sys-typescale-title-small-font-size, 14px);
      }

      .poll-subtitle {
        color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      }

      .poll-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .poll-option-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .poll-option-input {
        flex: 1;
      }

      .poll-actions-row {
        display: flex;
        justify-content: flex-end;
      }

      .poll-settings {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        margin-top: 12px;
        flex-wrap: wrap;
      }

      .poll-error {
        margin-top: 10px;
        color: var(--md-sys-color-error, #ffb4ab);
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      }

      .schedule-composer {
        animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
        margin-top: 12px;
        padding: 12px;
        border-radius: var(--md-sys-shape-corner-medium);
        background: color-mix(
          in srgb,
          var(--md-sys-color-on-surface, #ffffff) 6%,
          transparent
        );
        border: 1px solid
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .schedule-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .schedule-title {
        font-weight: 700;
        font-size: var(--md-sys-typescale-title-small-font-size, 14px);
      }

      .schedule-subtitle {
        color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      }

      .schedule-inputs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .schedule-preview {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      }

      .schedule-error {
        color: var(--md-sys-color-error, #ffb4ab);
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      }

      md-text-area {
        width: 100%;
      }

      .actions-row {
        display: flex;
        justify-content: flex-start;
        gap: 8px;
        flex-wrap: wrap;
      }

      .mobile-icon-button {
        display: inline-flex;
      }

      .desktop-button {
        display: none;
      }

      .footer-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .footer-actions > div {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        flex: 1;
        min-width: 0;
      }

      .footer-meta {
        justify-content: flex-start;
      }

      .footer-primary {
        justify-content: flex-end;
      }

      .draft-action {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .footer-actions > div:nth-child(2) {
        flex: 2;
        align-items: center;
        justify-content: end;
      }

      /* char-count and draft-status styles are defined above with animations */

      .draft-picker {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: min(440px, calc(100vw - 64px));
      }

      .draft-picker-copy {
        margin: 0;
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
      }

      .draft-picker-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      /* Attachment previews */
      .attachments-list {
        padding: 0;
        margin: 0;
        display: flex;
        gap: 6px;
        list-style: none;
        margin-top: 8px;
        overflow: hidden;
        overflow-x: scroll;
      }

      .attachments-list::-webkit-scrollbar {
        display: none;
      }

      .img-preview {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 8em;
        background: #00000040;
        padding: 6px;
        gap: 6px;
        border-radius: var(--md-sys-shape-corner-small);
        animation: fadeSlideIn 0.2s cubic-bezier(0.2, 0, 0, 1) both;
        position: relative;
      }

      .img-preview img,
      .img-preview video {
        width: 8em;
        height: 8em;
        border-radius: var(--md-sys-shape-corner-small);
        object-fit: cover;
      }

      .upload-spinner-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        border-radius: var(--md-sys-shape-corner-small);
        pointer-events: none;
      }

      .upload-spinner {
        width: 28px;
        height: 28px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .preview-actions {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      md-skeleton {
        height: 8em;
        width: 8em;
      }

      #attachment-loading {
        margin-top: 8px;
      }

      #sensitive-warning {
        animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
        margin-top: 8px;
      }

      #sensitive-warning md-text-field {
        width: 100%;
      }

      .attachments-reveal {
        animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
      }

      .replying-to-indicator {
        animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
      }

      /* Proofread styles */
      .proofread-result-container {
        width: 100%;
      }

      .proofread-dropdown {
        width: 100%;
        box-sizing: border-box;
        margin-top: 4px;
        padding: 8px 0;
        background-color: var(--md-sys-color-surface-container, #2b2930);
        color: var(--md-sys-color-on-surface, #e6e1e5);
        border-radius: var(--md-sys-shape-corner-extra-small);
        box-shadow:
          0 1px 2px 0 rgba(0, 0, 0, 0.3),
          0 2px 6px 2px rgba(0, 0, 0, 0.15);
        z-index: 100;
        animation: dropdownFadeIn 0.15s cubic-bezier(0.2, 0, 0, 1);
      }

      @keyframes dropdownFadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .proofread-dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        gap: 8px;
      }

      .proofread-dropdown-label {
        font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        font-weight: 500;
      }

      .proofread-dropdown-actions {
        display: flex;
        gap: 4px;
      }

      .proofread-dropdown-content {
        max-height: 100px;
        overflow-y: auto;
        padding: 0 12px 8px;
      }

      .proofread-dropdown-content p {
        margin: 0;
        font-size: var(--md-sys-typescale-body-small-font-size, 13px);
        line-height: 1.5;
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .proofread-success {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        background: var(--md-sys-color-surface-container, #2b2930);
        border-radius: var(--md-sys-shape-corner-extra-small);
        white-space: nowrap;
      }

      @media (prefers-color-scheme: light) {
        .proofread-dropdown,
        .proofread-success {
          background-color: var(--md-sys-color-surface-container, #f3edf7);
          color: var(--md-sys-color-on-surface, #1d1b20);
        }

        .proofread-dropdown-label {
          color: var(--md-sys-color-on-surface-variant, #49454f);
        }

        .proofread-dropdown-content p {
          color: var(--md-sys-color-on-surface, #1d1b20);
        }
      }

      .proofread-button {
        --md-icon-button-icon-size: 18px;
        transition: opacity 0.2s ease;
      }

      .proofread-button:hover {
        opacity: 1;
      }

      .proofread-button[disabled] {
        opacity: 0.3;
      }

      .pen-button {
        --md-icon-button-icon-size: 18px;
        transition: opacity 0.2s ease;
      }

      .pen-button:hover {
        opacity: 1;
      }

      @keyframes recording-pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
        }
      }

      @keyframes ai-glow {
        0%,
        100% {
          box-shadow: 0 0 2px 1px rgba(232, 121, 249, 0.5);
          transform: scale(1);
        }
        50% {
          box-shadow:
            0 0 6px 2px rgba(232, 121, 249, 0.7),
            0 0 12px 4px rgba(217, 70, 239, 0.4);
          transform: scale(1.05);
        }
      }

      /* Attachment entrance animation */
      @keyframes composerReveal {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeSlideIn {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Publish button states */
      .publish-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.15s cubic-bezier(0.2, 0, 0, 1);
      }

      .publish-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: var(--md-sys-shape-corner-circle);
        animation: spin 0.8s linear infinite;
      }

      .publish-success-icon {
        display: inline-flex;
        animation: successPop 0.3s cubic-bezier(0.2, 0, 0, 1);
      }

      @keyframes successPop {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        60% {
          transform: scale(1.15);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      /* Character count smooth color transition */
      .char-count {
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        transition: color 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      .char-count.near-limit {
        color: #f59e0b;
      }

      .char-count.over-limit {
        color: var(--md-sys-color-error, #ffb4ab);
      }

      /* Draft status animations */
      .draft-status {
        font-size: var(--md-sys-typescale-label-small-font-size, 11px);
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
        animation: draftStatusFadeIn 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      .draft-status.saved {
        animation: draftSavedFade 3s cubic-bezier(0.2, 0, 0, 1) forwards;
      }

      @keyframes draftStatusFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes draftSavedFade {
        0%,
        70% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      /* Load draft button – primary color when drafts exist */
      .draft-action.has-drafts {
        color: var(--md-sys-color-primary, #d0bcff);
      }

      /* Draft apply text area highlight pulse */
      .text-area-wrapper.draft-loaded md-text-area {
        animation: draftHighlight 0.6s cubic-bezier(0.2, 0, 0, 1);
      }

      @keyframes draftHighlight {
        0% {
          box-shadow: 0 0 0 0
            color-mix(
              in srgb,
              var(--md-sys-color-primary, #d0bcff) 40%,
              transparent
            );
        }
        40% {
          box-shadow: 0 0 0 3px
            color-mix(
              in srgb,
              var(--md-sys-color-primary, #d0bcff) 30%,
              transparent
            );
        }
        100% {
          box-shadow: 0 0 0 0 transparent;
        }
      }

      /* Drag and drop styles */
      :host([dragging-over]) .composer-wrapper {
        outline: 2px dashed var(--md-sys-color-primary, #d0bcff);
        outline-offset: -4px;
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #d0bcff) 8%,
          transparent
        );
        border-radius: var(--md-sys-shape-corner-medium);
      }

      @media (max-width: 820px) {
        .actions-row {
          flex-wrap: nowrap;
          overflow-x: visible;
          gap: 6px;
          justify-content: flex-end;
        }

        .actions-row > * {
          flex: 0 0 auto;
        }

        .schedule-inputs {
          grid-template-columns: 1fr;
        }

        .footer-actions {
          position: fixed;
          bottom: 16px;
          left: 12px;
          right: 12px;
        }
      }

      /* In compact mode (inline reply), footer stays in normal flow */
      :host([compact]) .footer-actions {
        position: static;
      }
    `,
  ];

  protected async firstUpdated() {
    // Get instance limits
    const instance = await getInstanceInfo();
    if (instance.configuration?.statuses?.max_characters) {
      this.maxChars = instance.configuration.statuses.max_characters;
    } else if (instance.max_toot_chars) {
      this.maxChars = instance.max_toot_chars;
    }
    if (instance.configuration?.statuses?.max_media_attachments) {
      this.maxMediaAttachments =
        instance.configuration.statuses.max_media_attachments;
    }
    if (instance.configuration?.media_attachments?.image_size_limit) {
      this.imageSizeLimit =
        instance.configuration.media_attachments.image_size_limit;
    }
    if (instance.configuration?.media_attachments?.video_size_limit) {
      this.videoSizeLimit =
        instance.configuration.media_attachments.video_size_limit;
    }

    // Apply server-side posting defaults (async from IndexedDB)
    if (!this.editingPost && !this.replyTo) {
      const { get } = await import('idb-keyval');
      const prefs = await get('server-preferences');
      if (prefs) {
        if (prefs['posting:default:visibility']) {
          this.visibility = prefs['posting:default:visibility'];
        }
        if (prefs['posting:default:sensitive']) {
          this.sensitive = prefs['posting:default:sensitive'];
        }
      }
    }

    // Check if AI features are available
    this.proofreaderAvailable = await isProofreaderAvailable();
    this.speechToTextAvailable = isAudioTranscriptionAvailable();
    this.handwritingAvailable = await isHandwritingRecognitionAvailable();

    // Add event listeners
    this.addEventListener('keydown', this._handleKeydown);
    this.addEventListener('paste', this._handlePaste);
    this.addEventListener('dragover', this._handleDragOver);
    this.addEventListener('dragleave', this._handleDragLeave);
    this.addEventListener('drop', this._handleDrop);

    const nativeTextArea = this._getNativeTextArea();
    if (nativeTextArea) {
      nativeTextArea.addEventListener('keyup', this._handleCaretMove);
      nativeTextArea.addEventListener('click', this._handleCaretMove);
      nativeTextArea.addEventListener('scroll', this._handleCaretMove);
    }

    this._loadDraftForContext();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // Sync compact attribute for CSS
    if (changedProperties.has('compact')) {
      this.toggleAttribute('compact', this.compact);
    }

    if (changedProperties.has('replyTo')) {
      this._loadDraftForContext();
    }

    if (changedProperties.has('editingPost') && this.editingPost) {
      this._initEditMode();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('paste', this._handlePaste);
    this.removeEventListener('dragover', this._handleDragOver);
    this.removeEventListener('dragleave', this._handleDragLeave);
    this.removeEventListener('drop', this._handleDrop);
    this._closeMentionPicker();

    const nativeTextArea = this._getNativeTextArea();
    if (nativeTextArea) {
      nativeTextArea.removeEventListener('keyup', this._handleCaretMove);
      nativeTextArea.removeEventListener('click', this._handleCaretMove);
      nativeTextArea.removeEventListener('scroll', this._handleCaretMove);
    }

    // Clean up any blob URLs to prevent memory leaks
    this.attachments.forEach((att) => {
      if (att.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(att.preview_url);
      }
    });
    this._setActiveAttachment(null);

    // Stop any active recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Clear draft saved timer
    if (this.draftSavedTimer) {
      clearTimeout(this.draftSavedTimer);
      this.draftSavedTimer = null;
    }
  }

  // Public API methods

  /**
   * Get the current text value of the composer.
   */
  get value(): string {
    return this.statusText || this.textArea?.value || '';
  }

  /**
   * Set the text value of the composer.
   */
  set value(val: string) {
    const next = String(val ?? '');
    this._setStatusText(next);
    if (this.textArea) {
      this.textArea.value = next;
    }
  }

  /**
   * Focus the text area.
   */
  focus() {
    this.textArea?.focus();
  }

  /**
   * Reset the composer to its initial state.
   */
  reset() {
    this._resetState();
  }

  /**
   * Initialize edit mode: fetch source text and pre-populate the composer.
   */
  private async _initEditMode() {
    if (!this.editingPost) return;

    this.visibility = this.editingPost.visibility;

    // Pre-populate media attachments (or clear stale ones)
    if (this.editingPost.media_attachments?.length > 0) {
      this.attachments = this.editingPost.media_attachments.map((att) => ({
        id: att.id,
        preview_url: att.preview_url,
        description: att.description,
        type: att.type as LocalAttachment['type'],
      }));
    } else {
      this.attachments = [];
    }

    try {
      const source = await getStatusSource(this.editingPost.id);
      this.value = source.text;

      if (source.spoiler_text) {
        this.sensitive = true;
        this.spoilerText = source.spoiler_text;
      } else {
        this.sensitive = this.editingPost.sensitive;
        this.spoilerText = '';
      }
    } catch (error) {
      console.error('[PostComposer] Failed to fetch status source:', error);
      // Fallback: strip HTML tags from content
      const div = document.createElement('div');
      div.innerHTML = this.editingPost.content;
      this.value = div.textContent || '';
      this.sensitive = this.editingPost.sensitive;
      this.spoilerText = this.editingPost.spoiler_text;
    }
  }

  /**
   * Clear the reply context.
   */
  clearReplyTo() {
    this.replyTo = null;
    this.dispatchEvent(
      new CustomEvent('reply-cleared', { bubbles: true, composed: true })
    );
  }

  /**
   * Add an attachment (e.g., from AI image generation).
   * The attachment should already be uploaded to the server.
   */
  addAttachment(attachment: LocalAttachment) {
    if (this.attachments.length >= this.maxMediaAttachments) {
      showInfoToast(
        msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
      );
      return false;
    }

    if (this.pollEnabled) {
      showInfoToast(msg('Disable the poll to attach media.'));
      return false;
    }

    this.attachments = [...this.attachments, attachment];
    return true;
  }

  /**
   * Get the current attachments.
   */
  getAttachments(): LocalAttachment[] {
    return [...this.attachments];
  }

  // Event handlers

  private _handleKeydown = (event: KeyboardEvent) => {
    // Ctrl/Cmd+Enter to submit
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this._handleSubmit();
      return;
    }

    if (!this.mentionOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._moveMentionSelection(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._moveMentionSelection(-1);
        break;
      case 'Enter':
      case 'Tab':
        if (this.mentionActiveIndex >= 0) {
          event.preventDefault();
          this._applyMention(this.mentionResults[this.mentionActiveIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this._closeMentionPicker();
        break;
    }
  };

  private _handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    if (this.pollEnabled) {
      for (const item of items) {
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          event.preventDefault();
          showInfoToast(msg('Disable the poll to attach media.'));
          return;
        }
      }
      return;
    }

    for (const item of items) {
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        event.preventDefault();

        if (this.attachments.length >= this.maxMediaAttachments) {
          showInfoToast(
            msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
          );
          return;
        }

        const file = item.getAsFile();
        if (!file) continue;

        this._addFileAttachment(file);
      }
    }
  };

  private _handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy';
      if (!this.isDraggingOver) {
        this.isDraggingOver = true;
        this.setAttribute('dragging-over', '');
      }
    }
  };

  private _handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const relatedTarget = event.relatedTarget as Node | null;
    if (!relatedTarget || !this.contains(relatedTarget)) {
      this.isDraggingOver = false;
      this.removeAttribute('dragging-over');
    }
  };

  private _handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingOver = false;
    this.removeAttribute('dragging-over');

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (this.pollEnabled) {
      showInfoToast(msg('Disable the poll to attach media.'));
      return;
    }

    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (this.attachments.length >= this.maxMediaAttachments) {
          showInfoToast(
            msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
          );
          return;
        }
        this._addFileAttachment(file);
      }
    }
  };

  private _handleCaretMove = () => {
    const nativeTextArea = this._getNativeTextArea();
    if (!nativeTextArea) return;

    const cursor = nativeTextArea.selectionStart ?? nativeTextArea.value.length;

    // Only recompute mention suggestions when the mention picker is open.
    // This ensures that moving the caret away from a mention token will
    // close the picker and prevent unintended mention insertion.
    if (!this.mentionOpen) {
      return;
    }

    this._updateMentionSuggestions(
      nativeTextArea.value,
      cursor,
      nativeTextArea
    );
  };

  private _handleStatusChange(ev: Event) {
    const target = ev.target as MdTextArea | HTMLTextAreaElement;
    const value = target.value ?? '';
    this._setStatusText(value);

    const nativeTextArea = this._getNativeTextArea();
    const cursor =
      nativeTextArea?.selectionStart ??
      nativeTextArea?.value.length ??
      value.length;

    this._updateMentionSuggestions(value, cursor, nativeTextArea);
  }

  private _setStatusText(value: string) {
    this.statusText = value;
    this.charCount = value.length;
    this.hasStatus = value.length > 0;
    this.draftDirty = value !== this.lastSavedStatusText;
  }

  private _setSpoilerText(value: string) {
    this.spoilerText = value;
  }

  private _getNativeTextArea(): HTMLTextAreaElement | null {
    return this.textArea?.shadowRoot?.querySelector('textarea') ?? null;
  }

  private _updateMentionSuggestions(
    value: string,
    cursor: number,
    nativeTextArea: HTMLTextAreaElement | null
  ) {
    const mentionMatch = findMentionMatch(value, cursor);
    if (!mentionMatch) {
      this._closeMentionPicker();
      return;
    }

    const query = mentionMatch.query;
    this.mentionQueryRange = {
      start: mentionMatch.start,
      end: mentionMatch.end,
    };

    if (query.length === 0) {
      this._closeMentionPicker();
      return;
    }

    const isSameQuery = query === this.mentionQuery && this.mentionOpen;

    if (nativeTextArea) {
      this._updateMentionCaretPosition(nativeTextArea, cursor);
    }

    this.mentionOpen = true;

    if (isSameQuery) {
      return;
    }

    this.mentionQuery = query;
    this._fetchMentionResults(query);
  }

  private _updateMentionCaretPosition(
    textarea: HTMLTextAreaElement,
    cursor: number
  ) {
    const wrapper = this.renderRoot.querySelector(
      '.text-area-wrapper'
    ) as HTMLElement | null;
    if (!wrapper) return;

    const coords = getCaretCoordinates(textarea, cursor);
    const wrapperRect = wrapper.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const width = Math.min(320, Math.max(220, wrapperRect.width - 16));

    let left = textareaRect.left - wrapperRect.left + coords.left;
    left = Math.max(8, Math.min(left, wrapperRect.width - width - 8));

    const estimatedHeight = estimateMentionDropdownHeight(
      this.mentionResults.length,
      this.mentionLoading
    );
    const belowTop =
      textareaRect.top - wrapperRect.top + coords.top + coords.lineHeight + 6;
    const aboveTop =
      textareaRect.top - wrapperRect.top + coords.top - estimatedHeight - 6;
    const spaceBelow = wrapperRect.height - belowTop;
    const spaceAbove = textareaRect.top - wrapperRect.top + coords.top - 6;

    const top =
      spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove
        ? belowTop
        : Math.max(6, aboveTop);

    this.mentionAnchorLeft = left;
    this.mentionAnchorTop = top;
    this.mentionDropdownWidth = width;
    this.mentionAnchorReady = true;
  }

  private _fetchMentionResults(query: string) {
    if (this.mentionSearchTimer !== null) {
      window.clearTimeout(this.mentionSearchTimer);
    }

    this.mentionSearchTimer = window.setTimeout(async () => {
      const requestId = ++this.mentionRequestId;
      this.mentionLoading = true;

      try {
        const results = await searchAccounts(query, 6);
        if (requestId !== this.mentionRequestId) return;

        this.mentionResults = results || [];
        this.mentionActiveIndex = this.mentionResults.length > 0 ? 0 : -1;
        this._handleCaretMove();
      } catch (error) {
        console.error('[PostComposer] Mention search failed:', error);
        if (requestId !== this.mentionRequestId) return;

        this.mentionResults = [];
        this.mentionActiveIndex = -1;
      } finally {
        if (requestId === this.mentionRequestId) {
          this.mentionLoading = false;
          this.mentionOpen = true;
        }
      }
    }, 200);
  }

  private _moveMentionSelection(step: number) {
    if (this.mentionResults.length === 0) return;

    const nextIndex =
      (this.mentionActiveIndex + step + this.mentionResults.length) %
      this.mentionResults.length;
    this.mentionActiveIndex = nextIndex;
  }

  private _applyMention(account: MastodonAccount) {
    if (!this.mentionQueryRange) return;

    const nativeTextArea = this._getNativeTextArea();
    const currentValue = nativeTextArea?.value || this.textArea?.value || '';
    const { start, end } = this.mentionQueryRange;

    const acct = account.acct;
    const prefix = currentValue.slice(0, start);
    const suffix = currentValue.slice(end);
    const mentionText = `@${acct}`;
    const needsSpace = suffix.length === 0 || !/^\s/.test(suffix);
    const insertText = mentionText + (needsSpace ? ' ' : '');
    const nextValue = `${prefix}${insertText}${suffix}`;

    if (nativeTextArea) {
      nativeTextArea.value = nextValue;
      const nextCursor = prefix.length + insertText.length;
      nativeTextArea.selectionStart = nextCursor;
      nativeTextArea.selectionEnd = nextCursor;
      nativeTextArea.focus();
    }

    if (this.textArea) {
      this.textArea.value = nextValue;
    }

    this.charCount = nextValue.length;
    this.hasStatus = nextValue.length > 0;
    this._closeMentionPicker();
  }

  private _closeMentionPicker() {
    if (this.mentionSearchTimer !== null) {
      window.clearTimeout(this.mentionSearchTimer);
    }
    this.mentionSearchTimer = null;
    this.mentionRequestId += 1;
    this.mentionOpen = false;
    this.mentionQuery = '';
    this.mentionResults = [];
    this.mentionLoading = false;
    this.mentionActiveIndex = -1;
    this.mentionQueryRange = null;
    this.mentionAnchorReady = false;
  }

  // File attachment methods

  private _getMediaType(
    file: File
  ): 'image' | 'video' | 'gifv' | 'audio' | 'unknown' {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  }

  private _formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _addFileAttachment(file: File) {
    const mediaType = this._getMediaType(file);

    // Validate file size against instance limits
    const sizeLimit =
      mediaType === 'video' ? this.videoSizeLimit : this.imageSizeLimit;
    if (file.size > sizeLimit) {
      showErrorToast(
        msg(
          str`File exceeds the server limit of ${this._formatBytes(sizeLimit)}.`
        )
      );
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);

    const newAttachment: LocalAttachment = {
      id: tempId,
      preview_url: previewUrl,
      description: null,
      pending: true,
      file,
      type: mediaType,
    };

    this.attachments = [...this.attachments, newAttachment];
    this._uploadFile(file, tempId);
  }

  private async _uploadFile(file: File, tempId: string) {
    try {
      const result = await uploadMediaBlob(file);

      // Find and update the attachment
      const index = this.attachments.findIndex((a) => a.id === tempId);
      if (index !== -1) {
        const oldPreview = this.attachments[index].preview_url;
        // For video, keep the local blob URL so the <video> element
        // can still show a real frame; the server preview_url is just
        // a static thumbnail image.
        const isVideo = result.type === 'video';
        const updatedAttachment: LocalAttachment = {
          id: result.id,
          preview_url: isVideo ? oldPreview : result.preview_url,
          description: result.description,
          pending: false,
          file,
          type: result.type,
        };

        if (this.activeAttachment?.id === tempId) {
          this._setActiveAttachment(updatedAttachment);
        }

        this.attachments = this.attachments.map((a) =>
          a.id === tempId ? updatedAttachment : a
        );

        if (!isVideo && oldPreview.startsWith('blob:')) {
          URL.revokeObjectURL(oldPreview);
        }
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      // Remove the failed attachment
      this.attachments = this.attachments.filter((a) => a.id !== tempId);
      showInfoToast(msg('Failed to upload media'));
    }
  }

  async attachFile() {
    if (this.pollEnabled) {
      showInfoToast(msg('Disable the poll to attach media.'));
      return;
    }

    if (this.attachments.length >= this.maxMediaAttachments) {
      showInfoToast(
        msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
      );
      return;
    }

    const files = await pickMedia();
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (this.attachments.length >= this.maxMediaAttachments) {
        showInfoToast(
          msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
        );
        break;
      }
      this._addFileAttachment(file);
    }
  }

  removeImage(id: string) {
    const attachment = this.attachments.find((a) => a.id === id);
    if (attachment?.preview_url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.preview_url);
    }
    this.attachments = this.attachments.filter((a) => a.id !== id);

    if (this.activeAttachment?.id === id) {
      this._closeEditDialog();
    }
  }

  private _setActiveAttachment(attachment: LocalAttachment | null) {
    if (this.activeAttachmentBlobUrl) {
      URL.revokeObjectURL(this.activeAttachmentBlobUrl);
      this.activeAttachmentBlobUrl = null;
    }

    this.activeAttachment = attachment;

    if (!attachment) {
      this.activeAttachmentImageSrc = '';
      return;
    }

    if (attachment.file) {
      this.activeAttachmentBlobUrl = URL.createObjectURL(attachment.file);
      this.activeAttachmentImageSrc = this.activeAttachmentBlobUrl;
      return;
    }

    this.activeAttachmentImageSrc = attachment.preview_url;
  }

  private _closeEditDialog() {
    this.editDialogOpen = false;
    this._setActiveAttachment(null);
  }

  openEditDialog(attachment: LocalAttachment) {
    this._setActiveAttachment(attachment);
    this.editDialogOpen = true;
  }

  async handleMediaSave(e: CustomEvent) {
    const { id, description, editedBlob } = e.detail;

    const attachment = this.attachments.find((a) => a.id === id);
    if (!attachment) {
      this.mediaEditDialog?.completeUpload(false);
      return;
    }

    const blobToUpload =
      editedBlob || (attachment.file ? attachment.file : null);

    if (blobToUpload) {
      try {
        const result = await uploadMediaBlob(blobToUpload);
        const fileForLocalEditing =
          blobToUpload instanceof File
            ? blobToUpload
            : new File(
                [blobToUpload],
                attachment.file?.name || `edited-${result.id}.jpg`,
                { type: blobToUpload.type || 'image/jpeg' }
              );

        if (description) {
          await updateMedia(result.id, description);
        }

        if (attachment.preview_url.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.preview_url);
        }

        this.attachments = this.attachments.map((a) =>
          a.id === id
            ? {
                id: result.id,
                preview_url: result.preview_url,
                description,
                pending: false,
                file: fileForLocalEditing,
                type: result.type,
              }
            : a
        );

        if (this.activeAttachment?.id === id) {
          this._setActiveAttachment(null);
        }

        this.mediaEditDialog?.completeUpload(true);
      } catch (err) {
        console.error('Failed to upload media', err);
        this.mediaEditDialog?.completeUpload(false);
      }
      return;
    }

    this.attachments = this.attachments.map((a) =>
      a.id === id ? { ...a, description } : a
    );

    if (this.activeAttachment?.id === id) {
      this._setActiveAttachment(null);
    }

    if (!attachment.pending) {
      try {
        await updateMedia(id, description);
        this.mediaEditDialog?.completeUpload(true);
      } catch (err) {
        console.error('Failed to update media description', err);
        this.mediaEditDialog?.completeUpload(false);
      }
    } else {
      this.mediaEditDialog?.completeUpload(true);
    }
  }

  // Poll methods

  private _togglePoll() {
    if (!this.pollEnabled && this.attachments.length > 0) {
      showInfoToast(msg('Remove media attachments before adding a poll.'));
      return;
    }

    this.pollEnabled = !this.pollEnabled;
    this.pollError = null;

    if (!this.pollEnabled) {
      this.pollOptions = ['', ''];
      this.pollDurationSeconds = 60 * 60;
      this.pollMultiple = false;
    }
  }

  private _setPollOption(index: number, value: string) {
    const next = [...this.pollOptions];
    next[index] = String(value ?? '');
    this.pollOptions = next;
    this.pollError = null;
  }

  private _readInputEventValue(e: Event): string {
    const detailValue = (e as CustomEvent<{ value?: string }>).detail?.value;
    if (typeof detailValue === 'string') return detailValue;

    const target = e.target as HTMLInputElement | null;
    if (target && typeof target.value === 'string') return target.value;

    const first = e.composedPath?.()[0] as HTMLInputElement | undefined;
    if (first && typeof first.value === 'string') return first.value;

    return '';
  }

  private _addPollOption() {
    if (this.pollOptions.length >= 4) return;
    this.pollOptions = [...this.pollOptions, ''];
    this.pollError = null;
  }

  private _removePollOption(index: number) {
    if (this.pollOptions.length <= 2) return;
    this.pollOptions = this.pollOptions.filter((_, i) => i !== index);
    this.pollError = null;
  }

  private _getPollPayload(): {
    options: string[];
    expiresIn: number;
    multiple: boolean;
  } | null {
    if (!this.pollEnabled) return null;

    const options = this.pollOptions
      .map((o) => String(o ?? '').trim())
      .filter(Boolean);
    if (options.length < 2 || options.length > 4) {
      this.pollError = msg('Add between 2 and 4 options.');
      return null;
    }

    const normalized = options.map((o) => o.toLowerCase());
    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      this.pollError = msg('Poll options must be unique.');
      return null;
    }

    if (
      !Number.isFinite(this.pollDurationSeconds) ||
      this.pollDurationSeconds <= 0
    ) {
      this.pollError = msg('Choose a valid poll duration.');
      return null;
    }

    return {
      options,
      expiresIn: this.pollDurationSeconds,
      multiple: this.pollMultiple,
    };
  }

  // Scheduling

  private _toggleSchedule() {
    this.scheduleEnabled = !this.scheduleEnabled;
    this.scheduleError = null;

    if (this.scheduleEnabled && (!this.scheduleDate || !this.scheduleTime)) {
      this._setDefaultScheduleDateTime();
    }
  }

  private _openScheduledStatuses() {
    this.dispatchEvent(
      new CustomEvent('open-scheduled-statuses', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _setDefaultScheduleDateTime() {
    const suggestedDate = new Date(Date.now() + 30 * 60 * 1000);
    suggestedDate.setSeconds(0, 0);
    const minuteRemainder = suggestedDate.getMinutes() % 5;
    if (minuteRemainder !== 0) {
      suggestedDate.setMinutes(
        suggestedDate.getMinutes() + (5 - minuteRemainder)
      );
    }

    this.scheduleDate = this._toInputDateValue(suggestedDate);
    this.scheduleTime = this._toInputTimeValue(suggestedDate);
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
    this.scheduleDate = value;
    this.scheduleError = null;
  }

  private _setScheduleTime(value: string) {
    this.scheduleTime = value;
    this.scheduleError = null;
  }

  private _getScheduleMinDate(): string {
    return this._toInputDateValue(new Date(Date.now() + SCHEDULE_MIN_LEAD_MS));
  }

  private _getScheduleMinTime(): string {
    if (!this.scheduleDate) return '';

    const minDate = new Date(Date.now() + SCHEDULE_MIN_LEAD_MS);
    if (this.scheduleDate !== this._toInputDateValue(minDate)) return '';

    return this._toInputTimeValue(minDate);
  }

  private _parseScheduledDateTime(): Date | null {
    if (!this.scheduleDate || !this.scheduleTime) return null;

    const hasSeconds = this.scheduleTime.split(':').length > 2;
    const timeValue = hasSeconds
      ? this.scheduleTime
      : `${this.scheduleTime}:00`;
    const parsed = new Date(`${this.scheduleDate}T${timeValue}`);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private _resolveScheduledAtForSubmission(): string | null {
    if (!this.scheduleEnabled) return null;

    if (!this.scheduleDate || !this.scheduleTime) {
      this.scheduleError = msg('Choose a date and time.');
      return null;
    }

    const parsed = this._parseScheduledDateTime();
    if (!parsed) {
      this.scheduleError = msg('Choose a valid date and time.');
      return null;
    }

    if (parsed.getTime() < Date.now() + SCHEDULE_MIN_LEAD_MS) {
      this.scheduleError = msg(
        'Schedule your post at least 5 minutes in the future.'
      );
      return null;
    }

    this.scheduleError = null;
    return parsed.toISOString();
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

  // AI feature methods

  async doProofread() {
    const text = this.textArea?.value;
    if (!text || text.trim().length === 0) return;

    this.proofreading = true;
    this.proofreadResult = null;

    // Keep the dropdown open so the "Checking..." loading state is visible
    if (this._moreOptionsDropdown) {
      this._moreOptionsDropdown.keepOpen = true;
    }

    try {
      const result = await proofread(text);
      this.proofreadResult = result;
    } catch (error) {
      console.error('Proofreading failed:', error);
    } finally {
      this.proofreading = false;
      // Re-enable auto-close and hide the dropdown now that result is ready
      if (this._moreOptionsDropdown) {
        this._moreOptionsDropdown.keepOpen = false;
        this._moreOptionsDropdown.hide();
      }
    }
  }

  applyCorrections() {
    if (!this.proofreadResult) return;

    if (this.textArea) {
      this.textArea.value = this.proofreadResult.correctedInput;
      this._setStatusText(this.proofreadResult.correctedInput);
    }

    this.proofreadResult = null;
  }

  dismissProofread() {
    this.proofreadResult = null;
  }

  // Speech-to-text methods

  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });

      this.audioChunks = [];

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const options: MediaRecorderOptions = selectedMimeType
        ? { mimeType: selectedMimeType }
        : {};

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        await this.handleTranscription(audioBlob);
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  async handleTranscription(audioBlob: Blob) {
    this.isTranscribing = true;

    try {
      const transcribedText = await transcribeAudio(audioBlob);

      if (transcribedText && this.textArea) {
        const currentText = this.textArea.value;
        const nextValue =
          currentText.trim().length > 0
            ? currentText + ' ' + transcribedText
            : transcribedText;

        this.textArea.value = nextValue;
        this._setStatusText(nextValue);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      this.isTranscribing = false;
    }
  }

  // Handwriting

  openHandwritingDialog() {
    this.handwritingDialogOpen = true;
  }

  handleHandwritingComplete(e: CustomEvent<{ text: string }>) {
    const recognizedText = e.detail.text;

    if (recognizedText && this.textArea) {
      const currentText = this.textArea.value;
      const nextValue =
        currentText.trim().length > 0
          ? currentText + ' ' + recognizedText
          : recognizedText;

      this.textArea.value = nextValue;
      this._setStatusText(nextValue);
    }

    this.handwritingDialogOpen = false;
  }

  handleHandwritingClose() {
    this.handwritingDialogOpen = false;
  }

  // Sensitivity

  markAsSensitive() {
    this.sensitive = !this.sensitive;
  }

  // Submit / Publish

  private async _handleSubmit() {
    const status = this.textArea?.value;
    if (!status || status.length === 0) return;

    // Guard: don't publish while media is still uploading
    if (this.attachments.some((a) => a.pending)) {
      showInfoToast(msg('Waiting for media to finish uploading…'));
      return;
    }

    const scheduledAt = this.compact
      ? null
      : this._resolveScheduledAtForSubmission();
    if (!this.compact && this.scheduleEnabled && !scheduledAt) return;

    if (this.autoPublish) {
      await this._publish(scheduledAt);
    } else {
      const pollPayload = this._getPollPayload();
      if (this.pollEnabled && !pollPayload) return; // Validation failed

      const event: ComposerSubmitEvent = {
        status,
        attachments: [...this.attachments],
        visibility: this.visibility,
        sensitive: this.sensitive,
        spoilerText: this.sensitive ? this.spoilerText : '',
        poll: pollPayload,
        scheduledAt,
        replyToId: this.replyTo?.id ?? null,
        quotedStatusId: this.quotedPost?.id ?? null,
      };

      this.dispatchEvent(
        new CustomEvent('submit', {
          bubbles: true,
          composed: true,
          detail: event,
        })
      );
    }
  }

  private async _publish(submitScheduledAt?: string | null) {
    const status = this.textArea?.value;
    if (!status || status.length === 0) return;

    const scheduledAt =
      submitScheduledAt ??
      (!this.compact && this.scheduleEnabled
        ? this._resolveScheduledAtForSubmission()
        : null);

    if (!this.compact && this.scheduleEnabled && !scheduledAt) return;

    if (scheduledAt && !navigator.onLine) {
      showInfoToast(msg('Scheduling requires an internet connection.'));
      return;
    }

    this.isPublishing = true;

    const worker = new MarkdownWorker();

    worker.onmessage = async (_e: MessageEvent<string>) => {
      const isOffline = !navigator.onLine;

      try {
        const pollPayload = this._getPollPayload();

        if (pollPayload && this.attachments.length > 0) {
          this.pollError = msg(
            'Remove media attachments before publishing a poll.'
          );
          worker.terminate();
          this.isPublishing = false;
          return;
        }

        let spoilerText = '';
        if (this.sensitive) {
          spoilerText = this.spoilerText;
        }

        // Handle edit vs reply vs new post
        if (this.editingPost?.id) {
          // Edit mode - use PUT to update existing post
          await editPost(this.editingPost.id, {
            status,
            media_ids: this.attachments.map((att) => att.id),
            sensitive: this.sensitive,
            spoiler_text: spoilerText,
            visibility: this.visibility,
          });
        } else if (this.replyTo?.id) {
          // Reply mode - use replyToPost which accepts mediaIds and visibility
          await replyToPost(
            this.replyTo.id,
            status,
            this.attachments.length > 0
              ? this.attachments.map((att) => att.id)
              : undefined,
            this.visibility,
            scheduledAt ?? undefined
          );
        } else if (this.attachments.length > 0) {
          await publishPost(
            status,
            this.attachments.map((att) => att.id),
            this.sensitive,
            spoilerText,
            this.visibility,
            undefined,
            scheduledAt ?? undefined,
            this.quotedPost?.id
          );
        } else if (pollPayload) {
          await publishPollPost(
            status,
            pollPayload,
            this.sensitive,
            spoilerText,
            this.visibility,
            scheduledAt ?? undefined
          );
        } else {
          await publishPost(
            status,
            undefined,
            this.sensitive,
            spoilerText,
            this.visibility,
            undefined,
            scheduledAt ?? undefined,
            this.quotedPost?.id
          );
        }
      } catch (error) {
        console.error('[PostComposer] Publish error:', error);

        if (isOffline) {
          if (scheduledAt) {
            showInfoToast(
              msg('Could not schedule while offline. Reconnect and try again.')
            );
            worker.terminate();
            this.isPublishing = false;
            return;
          }

          showInfoToast(
            msg("Your post will be published when you're back online")
          );
          this._resetState();
          worker.terminate();
          this.isPublishing = false;
          return;
        }

        worker.terminate();
        this.isPublishing = false;
        return;
      }

      // Success
      if (scheduledAt) {
        showInfoToast(
          msg(
            str`Post scheduled for ${this._formatScheduledDateTime(scheduledAt)}.`
          )
        );
      }

      worker.terminate();
      this.isPublishing = false;
      this.publishSuccess = true;

      import('../utils/haptics').then(({ hapticNotification }) =>
        hapticNotification('success')
      );

      // Brief success flash, then reset and dispatch
      setTimeout(() => {
        this.publishSuccess = false;
        const wasEditing = !!this.editingPost;
        this._resetState();

        this.dispatchEvent(
          new CustomEvent('published', {
            bubbles: true,
            composed: true,
            detail: {
              status,
              scheduledAt: scheduledAt ?? null,
              edited: wasEditing,
            },
          })
        );
      }, 600);
    };

    worker.postMessage(status);
  }

  private _resetState() {
    this.attachments.forEach((att) => {
      if (att.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(att.preview_url);
      }
    });
    this.attachments = [];
    this.charCount = 0;
    this.hasStatus = false;
    this.sensitive = false;
    this.spoilerText = '';
    this.statusText = '';
    this.draftStatus = 'idle';
    this.draftPickerOpen = false;
    this.draftDirty = false;
    this.lastSavedStatusText = '';
    this.proofreadResult = null;
    this.isRecording = false;
    this.isTranscribing = false;
    this.publishSuccess = false;
    this.replyTo = null;
    this.editingPost = null;
    this.quotedPost = null;
    this._setActiveAttachment(null);
    this.editDialogOpen = false;

    this.pollEnabled = false;
    this.pollOptions = ['', ''];
    this.pollDurationSeconds = 60 * 60;
    this.pollMultiple = false;
    this.pollError = null;
    this.scheduleEnabled = false;
    this.scheduleDate = '';
    this.scheduleTime = '';
    this.scheduleError = null;

    this._closeMentionPicker();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.audioChunks = [];

    if (this.textArea) {
      this.textArea.value = '';
    }
  }

  // Drafts

  private _getDraftKey(): string | null {
    const server = localStorage.getItem('server');
    const userId = localStorage.getItem('currentUserID');
    if (!server || !userId) return null;
    return buildDraftKey({
      server,
      userId,
      replyToId: this.replyTo?.id ?? null,
    });
  }

  private _hasDraftContent(): boolean {
    return (
      this.statusText.trim().length > 0 ||
      this.attachments.length > 0 ||
      this.pollEnabled ||
      this.scheduleEnabled ||
      this.sensitive ||
      this.spoilerText.trim().length > 0
    );
  }

  private async _loadDraftForContext() {
    const key = this._getDraftKey();
    this.draftKey = key;
    this.availableDrafts = [];
    this.selectedDraftId = '';
    this.draftPickerOpen = false;

    if (!key) return;
    await this._refreshDraftList(key);
  }

  private async _applyDraft(draft: DraftPost) {
    this.statusText = draft.status ?? '';
    this.visibility = draft.visibility ?? this.visibility;
    this.sensitive = !!draft.sensitive;
    this.spoilerText = draft.spoilerText ?? '';
    this.pollEnabled = !!draft.poll;
    this.pollOptions = draft.poll?.options?.length
      ? [...draft.poll.options]
      : ['', ''];
    this.pollDurationSeconds = draft.poll?.expiresIn ?? 60 * 60;
    this.pollMultiple = !!draft.poll?.multiple;
    this.pollError = null;
    const draftSchedule = this.compact ? null : draft.schedule;
    this.scheduleEnabled = !!draftSchedule;
    this.scheduleDate = draftSchedule?.date ?? '';
    this.scheduleTime = draftSchedule?.time ?? '';
    this.scheduleError = null;

    this.attachments.forEach((att) => {
      if (att.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(att.preview_url);
      }
    });
    this.attachments = [];

    if (draft.attachments?.length) {
      for (const attachment of draft.attachments) {
        if (attachment.file) {
          const file =
            attachment.file instanceof File
              ? attachment.file
              : new File([attachment.file], 'draft-attachment', {
                  type: attachment.file.type || 'application/octet-stream',
                });
          this._restorePendingAttachment(file, attachment.description);
        } else {
          this.attachments = [
            ...this.attachments,
            {
              id: attachment.id,
              preview_url: attachment.preview_url,
              description: attachment.description ?? null,
              pending: attachment.pending,
            },
          ];
        }
      }
    }

    await this.updateComplete;
    if (this.textArea) {
      this.textArea.value = this.statusText;
    }
    this.charCount = this.statusText.length;
    this.hasStatus = this.statusText.length > 0;

    this.draftStatus = 'saved';
    this.draftDirty = false;
    this.lastSavedStatusText = this.statusText;

    // Trigger highlight pulse on text area to draw attention
    this.draftLoaded = false;
    await this.updateComplete;
    this.draftLoaded = true;
    // Remove class after animation completes
    setTimeout(() => {
      this.draftLoaded = false;
    }, 650);
  }

  private async _refreshDraftList(keyOverride?: string) {
    const activeKey = keyOverride ?? this.draftKey;
    if (!activeKey) {
      this.availableDrafts = [];
      this.selectedDraftId = '';
      return;
    }

    const drafts = await listDraftsForContext(activeKey);
    if (this.draftKey !== activeKey) return;

    this.availableDrafts = drafts;
    if (!drafts.some((draft) => draft.id === this.selectedDraftId)) {
      this.selectedDraftId = drafts[0]?.id ?? '';
    }
  }

  private _restorePendingAttachment(file: File, description: string | null) {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    const newAttachment: LocalAttachment = {
      id: tempId,
      preview_url: previewUrl,
      description,
      pending: true,
      file,
    };

    this.attachments = [...this.attachments, newAttachment];
    this._uploadFile(file, tempId);
  }

  private async _saveDraft() {
    if (!this.draftKey) return;

    if (!this._hasDraftContent()) return;

    this.draftStatus = 'saving';

    const attachments = this.attachments.map((attachment) => ({
      id: attachment.id,
      preview_url: attachment.preview_url.startsWith('blob:')
        ? ''
        : attachment.preview_url,
      description: attachment.description ?? null,
      pending: attachment.pending,
      file: attachment.pending ? attachment.file : undefined,
    }));

    const savedDraft = await saveDraftForContext(this.draftKey, {
      status: this.statusText,
      visibility: this.visibility,
      sensitive: this.sensitive,
      spoilerText: this.sensitive ? this.spoilerText : '',
      poll: this.pollEnabled
        ? {
            options: [...this.pollOptions],
            expiresIn: this.pollDurationSeconds,
            multiple: this.pollMultiple,
          }
        : null,
      schedule:
        !this.compact && this.scheduleEnabled
          ? {
              date: this.scheduleDate,
              time: this.scheduleTime,
            }
          : null,
      replyToId: this.replyTo?.id ?? null,
      attachments,
    });
    await this._refreshDraftList();
    this.selectedDraftId = savedDraft.id;
    this.draftStatus = 'saved';
    this.draftDirty = false;
    this.lastSavedStatusText = this.statusText;

    this.dispatchEvent(
      new CustomEvent('draft-saved', {
        bubbles: true,
        composed: true,
        detail: { draftId: savedDraft.id },
      })
    );
  }

  private async _openDraftPicker() {
    if (!this.draftKey) return;
    await this._refreshDraftList();
    if (this.availableDrafts.length === 0) return;

    if (!this.selectedDraftId) {
      this.selectedDraftId = this.availableDrafts[0].id;
    }
    this.draftPickerOpen = true;
  }

  private _closeDraftPicker() {
    this.draftPickerOpen = false;
  }

  private _handleDraftStatusAnimationEnd = () => {
    if (this.draftStatus === 'saved') {
      this.draftStatus = 'idle';
    }
  };

  private _handleDraftSelectionChange(
    e: CustomEvent<{ value: string; oldValue: string }>
  ) {
    this.selectedDraftId = e.detail.value;
  }

  private _formatDraftOptionLabel(draft: DraftPost): string {
    const trimmedStatus = draft.status.replace(/\s+/g, ' ').trim();
    const statusPreview =
      trimmedStatus.length > 64
        ? `${trimmedStatus.slice(0, 61)}...`
        : trimmedStatus;
    const preview = statusPreview || msg('Untitled draft');
    const parsedDate = Date.parse(draft.updatedAt);
    const formattedDate = Number.isNaN(parsedDate)
      ? draft.updatedAt
      : new Date(parsedDate).toLocaleString();
    return `${formattedDate} - ${preview}`;
  }

  private async _loadSelectedDraft() {
    const draft = this.availableDrafts.find(
      (entry) => entry.id === this.selectedDraftId
    );
    if (!draft) return;

    await this._applyDraft(draft);
    this._closeDraftPicker();
    this.draftDirty = false;
    this.lastSavedStatusText = this.statusText;
    showInfoToast(msg('Draft loaded'));
  }

  // Render methods

  private _renderReplyIndicator() {
    if (this.hideReplyIndicator || !this.replyTo) return nothing;

    return html`
      <div class="replying-to-indicator">
        <span>${msg(str`Replying to @${this.replyTo.account.acct}`)}</span>
        <md-icon-button
          label=${msg('Dismiss')}
          src="/assets/close-outline.svg"
          @click=${() => this.clearReplyTo()}
        ></md-icon-button>
      </div>
    `;
  }

  private _renderQuoteIndicator() {
    if (!this.quotedPost) return nothing;

    return html`
      <div class="replying-to-indicator">
        <span>${msg(str`Quoting @${this.quotedPost.account.acct}`)}</span>
        <md-icon-button
          label=${msg('Dismiss')}
          src="/assets/close-outline.svg"
          @click=${() => {
            this.quotedPost = null;
          }}
        ></md-icon-button>
      </div>
    `;
  }

  private _renderQuotePreview() {
    if (!this.quotedPost) return nothing;

    return html` <quoted-post .post=${this.quotedPost} preview></quoted-post> `;
  }

  private _renderMentionPicker() {
    if (!this.mentionOpen) return nothing;

    const mentionStyle = this.mentionAnchorReady
      ? `left: ${this.mentionAnchorLeft}px; top: ${this.mentionAnchorTop}px; width: ${this.mentionDropdownWidth}px;`
      : '';

    return html`
      <div class="mention-dropdown" role="listbox" style="${mentionStyle}">
        ${this.mentionLoading
          ? html`<div class="mention-state">${msg('Searching...')}</div>`
          : this.mentionResults.length === 0
            ? html`<div class="mention-state">
                ${msg('No matching accounts')}
              </div>`
            : this.mentionResults.map((account, index) => {
                const displayName =
                  account.display_name?.trim() || account.acct;
                const avatar =
                  account.avatar_static ||
                  account.avatar ||
                  '/assets/icons/new-icons/icon-72x72.png';
                const isActive = index === this.mentionActiveIndex;

                return html`
                  <div
                    class="mention-item ${isActive ? 'active' : ''}"
                    role="option"
                    aria-selected=${isActive}
                    @mouseenter=${() => {
                      if (this.mentionActiveIndex !== index) {
                        this.mentionActiveIndex = index;
                      }
                    }}
                    @mousedown=${(event: MouseEvent) => {
                      event.preventDefault();
                      this._applyMention(account);
                    }}
                  >
                    <img class="mention-avatar" src="${avatar}" alt="" />
                    <div class="mention-text">
                      <span class="mention-name">${displayName}</span>
                      <span class="mention-acct">@${account.acct}</span>
                    </div>
                  </div>
                `;
              })}
      </div>
    `;
  }

  private _renderTextArea() {
    const placeholderText =
      this.placeholder ||
      (this.replyTo
        ? msg('Reply to this post...')
        : msg("What's on your mind?"));

    return html`
      <div class="text-area-wrapper ${this.draftLoaded ? 'draft-loaded' : ''}">
        <md-text-area
          @change="${(e: Event) => this._handleStatusChange(e)}"
          @input="${(e: Event) => this._handleStatusChange(e)}"
          @focusout="${() => this._closeMentionPicker()}"
          .value=${this.statusText}
          autofocus
          placeholder=${placeholderText}
          rows="${this.rows}"
          maxlength="${this.maxChars}"
          hide-counter
        ></md-text-area>
        ${this._renderMentionPicker()}
      </div>
    `;
  }

  private _toggleEmojiPicker() {
    if (!this.emojiPickerOpen) {
      import('./emoji-picker.js');
    }
    this.emojiPickerOpen = !this.emojiPickerOpen;
  }

  private _onEmojiSelect(e: CustomEvent<{ shortcode: string; url: string }>) {
    const { shortcode } = e.detail;
    const insertText = `:${shortcode}: `;

    const nativeTextArea = this._getNativeTextArea();
    const currentValue = nativeTextArea?.value || this.textArea?.value || '';
    const cursor = nativeTextArea?.selectionStart ?? currentValue.length;

    const prefix = currentValue.slice(0, cursor);
    const suffix = currentValue.slice(cursor);
    const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix);
    const insert = (needsLeadingSpace ? ' ' : '') + insertText;
    const nextValue = `${prefix}${insert}${suffix}`;

    if (nativeTextArea) {
      nativeTextArea.value = nextValue;
      const nextCursor = prefix.length + insert.length;
      nativeTextArea.selectionStart = nextCursor;
      nativeTextArea.selectionEnd = nextCursor;
      nativeTextArea.focus();
    }

    if (this.textArea) {
      this.textArea.value = nextValue;
    }

    this.charCount = nextValue.length;
    this.hasStatus = nextValue.length > 0;
    this.emojiPickerOpen = false;
  }

  private _renderEmojiPicker() {
    return html`
      <emoji-picker
        .open=${this.emojiPickerOpen}
        .anchorElement=${this._emojiButton ?? null}
        @emoji-select=${(e: CustomEvent) => this._onEmojiSelect(e)}
        @emoji-picker-close=${() => (this.emojiPickerOpen = false)}
      ></emoji-picker>
    `;
  }

  private _getVisibilityDisplayLabel(): string {
    switch (this.visibility) {
      case 'unlisted':
        return msg('Unlisted');
      case 'private':
        return msg('Followers Only');
      case 'direct':
        return msg('Direct');
      case 'public':
      default:
        return msg('Public');
    }
  }

  private _getVisibilityIconSrc(): string {
    switch (this.visibility) {
      case 'unlisted':
        return '/assets/eye-outline.svg';
      case 'private':
        return '/assets/lock-closed-outline.svg';
      case 'direct':
        return '/assets/paper-plane-outline.svg';
      case 'public':
      default:
        return '/assets/globe-outline.svg';
    }
  }

  private _renderActions() {
    if (this.hideActions) return nothing;

    return html`
      <div class="actions-row">
        <!-- Visibility selector -->
        ${!this.compact
          ? html`
              <md-select
                .value=${this.visibility}
                .placeholder=${msg('Post visibility')}
                .iconSrc=${this._getVisibilityIconSrc()}
                .iconLabel=${msg('Post visibility')}
                @change=${(e: CustomEvent<{ value: string }>) =>
                  (this.visibility = e.detail.value)}
                title=${this._getVisibilityDisplayLabel()}
                variant="filled"
                icon-only
              >
                <md-option value="public">${msg('Public')}</md-option>
                <md-option value="unlisted">${msg('Unlisted')}</md-option>
                <md-option value="private">${msg('Followers Only')}</md-option>
                <md-option value="direct">${msg('Direct')}</md-option>
              </md-select>
            `
          : nothing}

        <md-icon-button
          class="mobile-icon-button"
          label=${msg('Content Warning')}
          src="/assets/eye-outline.svg"
          .variant=${this.sensitive ? 'filled-tonal' : 'standard'}
          @click="${() => this.markAsSensitive()}"
        ></md-icon-button>

        <md-icon-button
          id="emoji-trigger"
          class="mobile-icon-button"
          label=${msg('Emoji')}
          src="/assets/happy-outline.svg"
          .variant=${this.emojiPickerOpen ? 'filled-tonal' : 'standard'}
          @click="${() => this._toggleEmojiPicker()}"
        ></md-icon-button>
        ${this._renderEmojiPicker()}

        <md-icon-button
          class="mobile-icon-button"
          label=${msg('Attach Media')}
          src="/assets/attach-outline.svg"
          @click="${() => this.attachFile()}"
          ?disabled=${this.pollEnabled ||
          this.quotedPost != null ||
          this.attachments.length >= this.maxMediaAttachments}
        ></md-icon-button>

        <!-- Overflow menu -->
        <md-dropdown id="more-options-dropdown" placement="bottom-end">
          <md-icon-button
            slot="trigger"
            name="ellipsis-vertical"
            .label=${msg('More options')}
          ></md-icon-button>
          <md-menu>
            ${!this.compact
              ? html`
                  <md-menu-item
                    .selected=${this.scheduleEnabled}
                    @click=${() => this._toggleSchedule()}
                  >
                    <md-icon
                      slot="prefix"
                      src="/assets/calendar-outline.svg"
                    ></md-icon>
                    ${this.scheduleEnabled
                      ? msg('Edit scheduled time')
                      : msg('Schedule post')}
                  </md-menu-item>
                `
              : nothing}

            <md-menu-item
              .selected=${this.pollEnabled}
              ?disabled=${this.attachments.length > 0 ||
              this.quotedPost != null}
              @click=${() => this._togglePoll()}
            >
              <md-icon
                slot="prefix"
                src="/assets/chatbox-outline.svg"
              ></md-icon>
              ${this.pollEnabled ? msg('Remove Poll') : msg('Add Poll')}
            </md-menu-item>

            ${this.proofreaderAvailable
              ? html`
                  <md-menu-item
                    ?disabled=${!this.hasStatus || this.proofreading}
                    @click=${() => this.doProofread()}
                    title=${this.proofreading ? '' : 'On-device AI'}
                  >
                    <md-icon
                      slot="prefix"
                      src="/assets/sparkles-outline.svg"
                    ></md-icon>
                    ${this.proofreading ? msg('Checking...') : msg('Proofread')}
                  </md-menu-item>
                `
              : nothing}
            ${this.speechToTextAvailable
              ? html`
                  <md-menu-item
                    ?disabled=${this.isTranscribing}
                    @click=${() => this.toggleRecording()}
                    title=${this.isRecording || this.isTranscribing
                      ? ''
                      : 'On-device AI'}
                  >
                    <md-icon
                      slot="prefix"
                      src="${this.isRecording
                        ? '/assets/stop-circle-outline.svg'
                        : '/assets/mic-outline.svg'}"
                    ></md-icon>
                    ${this.isRecording
                      ? msg('Stop recording')
                      : this.isTranscribing
                        ? msg('Transcribing...')
                        : msg('Voice input')}
                  </md-menu-item>
                `
              : nothing}
          </md-menu>
        </md-dropdown>
      </div>
      <!-- Proofread result (below actions row, full-width) -->
      ${this.proofreaderAvailable ? this._renderProofreadResult() : nothing}
    `;
  }

  private _renderProofreadResult() {
    if (!this.proofreadResult) return nothing;

    if (this.proofreadResult.corrections.length === 0) {
      return html`
        <span class="proofread-success">
          ✓ ${msg('Looks good!')}
          <md-icon-button
            class="proofread-button"
            label=${msg('Dismiss')}
            src="/assets/close-outline.svg"
            @click="${() => this.dismissProofread()}"
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
              (${this.proofreadResult.corrections.length}
              change${this.proofreadResult.corrections.length > 1 ? 's' : ''})
            </span>
            <div class="proofread-dropdown-actions">
              <md-button
                size="small"
                variant="filled"
                pill
                @click="${() => this.applyCorrections()}"
                >${msg('Apply')}</md-button
              >
              <md-button
                size="small"
                variant="text"
                @click="${() => this.dismissProofread()}"
                >${msg('Dismiss')}</md-button
              >
            </div>
          </div>
          <div class="proofread-dropdown-content">
            <p>${this.proofreadResult.correctedInput}</p>
          </div>
        </div>
      </div>
    `;
  }

  private _renderSensitiveWarning() {
    if (this.hideActions || !this.sensitive) return nothing;

    return html`
      <div id="sensitive-warning">
        <md-text-field
          id="sensitive-input"
          .value=${this.spoilerText}
          @input=${(e: Event) =>
            this._setSpoilerText(this._readInputEventValue(e))}
          placeholder=${msg('Write your content warning here')}
        ></md-text-field>
      </div>
    `;
  }

  private _renderPoll() {
    if (this.hideActions || !this.pollEnabled) return nothing;

    return html`
      <div class="poll-composer">
        <div class="poll-header">
          <div class="poll-title">${msg('Poll')}</div>
          <div class="poll-subtitle">${msg('Add 2–4 options')}</div>
        </div>

        <div class="poll-options">
          ${this.pollOptions.map(
            (opt, idx) => html`
              <div class="poll-option-row">
                <md-text-field
                  class="poll-option-input"
                  placeholder=${msg(str`Option ${idx + 1}`)}
                  .value=${String(opt ?? '')}
                  @input=${(e: Event) =>
                    this._setPollOption(idx, this._readInputEventValue(e))}
                ></md-text-field>

                <md-icon-button
                  label=${msg('Remove option')}
                  src="/assets/close-outline.svg"
                  ?disabled=${this.pollOptions.length <= 2}
                  @click=${() => this._removePollOption(idx)}
                ></md-icon-button>
              </div>
            `
          )}

          <div class="poll-actions-row">
            <md-button
              variant="text"
              size="small"
              pill
              ?disabled=${this.pollOptions.length >= 4}
              @click=${() => this._addPollOption()}
            >
              ${msg('Add option')}
            </md-button>
          </div>
        </div>

        <div class="poll-settings">
          <md-select
            .value=${String(this.pollDurationSeconds)}
            @change=${(e: CustomEvent<{ value: string }>) =>
              (this.pollDurationSeconds = parseInt(e.detail.value, 10))}
            pill
            style="width: 180px; min-width: 180px;"
          >
            <md-option value="${String(5 * 60)}">${msg('5 minutes')}</md-option>
            <md-option value="${String(30 * 60)}"
              >${msg('30 minutes')}</md-option
            >
            <md-option value="${String(60 * 60)}">${msg('1 hour')}</md-option>
            <md-option value="${String(6 * 60 * 60)}"
              >${msg('6 hours')}</md-option
            >
            <md-option value="${String(24 * 60 * 60)}"
              >${msg('1 day')}</md-option
            >
            <md-option value="${String(3 * 24 * 60 * 60)}"
              >${msg('3 days')}</md-option
            >
            <md-option value="${String(7 * 24 * 60 * 60)}"
              >${msg('7 days')}</md-option
            >
          </md-select>

          <md-checkbox
            .checked=${this.pollMultiple}
            @change=${(e: CustomEvent<{ checked: boolean }>) =>
              (this.pollMultiple = e.detail.checked)}
          >
            ${msg('Allow multiple choices')}
          </md-checkbox>
        </div>

        ${this.pollError
          ? html`<div class="poll-error">${this.pollError}</div>`
          : null}
      </div>
    `;
  }

  private _renderSchedule() {
    if (this.compact || !this.scheduleEnabled || this.editingPost)
      return nothing;

    const parsed = this._parseScheduledDateTime();
    const preview =
      parsed && parsed.getTime() >= Date.now() + SCHEDULE_MIN_LEAD_MS
        ? this._formatScheduledDateTime(parsed.toISOString())
        : '';

    return html`
      <div class="schedule-composer">
        <div class="schedule-header">
          <div class="schedule-title">${msg('Schedule post')}</div>
          <md-button
            variant="text"
            size="small"
            @click=${() => this._openScheduledStatuses()}
          >
            ${msg('Manage scheduled posts')}
          </md-button>
        </div>

        <div class="schedule-inputs">
          <md-text-field
            type="date"
            .value=${this.scheduleDate}
            .min=${this._getScheduleMinDate()}
            @change=${(e: Event) =>
              this._setScheduleDate(this._readInputEventValue(e))}
          ></md-text-field>
          <md-text-field
            type="time"
            .value=${this.scheduleTime}
            .min=${this._getScheduleMinTime()}
            step="60"
            @change=${(e: Event) =>
              this._setScheduleTime(this._readInputEventValue(e))}
          ></md-text-field>
        </div>

        ${preview
          ? html`<div class="schedule-preview">
              ${msg(str`Will publish on ${preview}`)}
            </div>`
          : nothing}
        ${this.scheduleError
          ? html`<div class="schedule-error">${this.scheduleError}</div>`
          : nothing}
      </div>
    `;
  }

  private _renderAttachments() {
    const hasContent = this.attaching || this.attachments.length > 0;
    if (!hasContent) return nothing;

    return html`
      <div class="attachments-reveal">
        ${this.attaching
          ? html`
              <div id="attachment-loading">
                <md-skeleton></md-skeleton>
              </div>
            `
          : this.attachments.length > 0
            ? html`
                <ul class="attachments-list">
                  ${this.attachments.map(
                    (attachment) => html`
                      <div class="img-preview">
                        <div class="preview-actions">
                          <md-icon-button
                            size="small"
                            label=${msg('Remove attachment')}
                            @click="${() => this.removeImage(attachment.id)}"
                          >
                            <md-icon src="/assets/close-outline.svg"></md-icon>
                          </md-icon-button>
                          <md-icon-button
                            size="small"
                            label=${msg('Edit attachment')}
                            @click="${() => this.openEditDialog(attachment)}"
                          >
                            <md-icon src="/assets/brush-outline.svg"></md-icon>
                          </md-icon-button>
                        </div>
                        ${attachment.type === 'video'
                          ? html`<video
                              muted
                              preload="metadata"
                              src="${attachment.preview_url}#t=0.5"
                              controls
                            ></video>`
                          : html`<img
                              src="${attachment.preview_url}"
                              alt="${attachment.description || ''}"
                            />`}
                        ${attachment.pending
                          ? html`<div class="upload-spinner-overlay">
                              <div class="upload-spinner"></div>
                            </div>`
                          : nothing}
                      </div>
                    `
                  )}
                </ul>
              `
            : nothing}
      </div>
    `;
  }

  private _renderFooter() {
    const hasSavedDrafts = !this.hideDrafts && this.availableDrafts.length > 0;
    const canSaveDraft =
      !this.hideDrafts && this._hasDraftContent() && this.draftDirty;
    const primaryLabel =
      !this.compact && this.scheduleEnabled
        ? this.replyTo
          ? msg('Schedule reply')
          : msg('Schedule post')
        : this.replyTo
          ? msg('Reply')
          : msg('Publish');

    const publishButtonLabel = this.publishSuccess
      ? html`<span class="publish-label"
          ><span class="publish-success-icon">✓</span> ${msg('Posted!')}</span
        >`
      : this.isPublishing
        ? html`<span class="publish-label"
            ><span class="publish-spinner"></span> ${msg('Publishing...')}</span
          >`
        : primaryLabel;

    return html`
      <div class="footer-actions">
        <div class="footer-meta">
          ${hasSavedDrafts
            ? html`
                <md-button
                  size="small"
                  variant="text"
                  class="draft-action has-drafts"
                  @click="${() => this._openDraftPicker()}"
                >
                  ${msg('Load draft')}
                </md-button>
              `
            : nothing}
          ${canSaveDraft
            ? html`
                <md-button
                  size="small"
                  variant="text"
                  class="draft-action"
                  @click="${() => this._saveDraft()}"
                >
                  ${msg('Save draft')}
                </md-button>
              `
            : nothing}
          ${this.draftStatus === 'saving'
            ? html`<span class="draft-status">${msg('Saving draft...')}</span>`
            : this.draftStatus === 'saved'
              ? html`<span
                  class="draft-status saved"
                  @animationend=${this._handleDraftStatusAnimationEnd}
                  >${msg('Draft saved')}</span
                >`
              : nothing}
        </div>
        <div class="footer-primary">
          ${this.hasStatus
            ? html`<span
                class="char-count ${this.charCount >= this.maxChars
                  ? 'over-limit'
                  : this.charCount >= this.maxChars * 0.9
                    ? 'near-limit'
                    : ''}"
                role="status"
                aria-live="polite"
                >${this.charCount}/${this.maxChars}</span
              >`
            : nothing}
          <md-button
            ?disabled="${(!this.hasStatus && !this.publishSuccess) ||
            this.attaching ||
            this.attachments.some((a) => a.pending) ||
            this.isPublishing ||
            this.publishSuccess}"
            pill
            variant="filled"
            @click="${() => this._handleSubmit()}"
          >
            ${publishButtonLabel}
          </md-button>
        </div>
      </div>
    `;
  }

  private _renderDraftPickerDialog() {
    return html`
      <md-dialog
        label=${msg('Load draft')}
        .open=${this.draftPickerOpen}
        @md-dialog-hide=${() => this._closeDraftPicker()}
      >
        <div class="draft-picker">
          <p class="draft-picker-copy">
            ${msg('Choose one of your saved drafts.')}
          </p>
          <md-select
            .value=${this.selectedDraftId}
            placeholder=${msg('Select a draft')}
            @change=${this._handleDraftSelectionChange}
          >
            ${this.availableDrafts.map(
              (draft) => html`
                <md-option value="${draft.id}">
                  ${this._formatDraftOptionLabel(draft)}
                </md-option>
              `
            )}
          </md-select>
        </div>

        <div slot="footer" class="draft-picker-actions">
          <md-button variant="text" @click=${() => this._closeDraftPicker()}>
            ${msg('Cancel')}
          </md-button>
          <md-button
            variant="filled"
            ?disabled=${!this.selectedDraftId}
            @click=${() => this._loadSelectedDraft()}
          >
            ${msg('Load draft')}
          </md-button>
        </div>
      </md-dialog>
    `;
  }

  render() {
    return html`
      <div class="composer-wrapper">
        ${this._renderReplyIndicator()} ${this._renderQuoteIndicator()}
        ${this._renderTextArea()} ${this._renderQuotePreview()}
        ${this._renderActions()} ${this._renderSensitiveWarning()}
        ${this._renderPoll()} ${this._renderSchedule()}
        ${this._renderAttachments()} ${this._renderFooter()}
      </div>

      ${this._renderDraftPickerDialog()}

      <media-edit-dialog
        .open="${this.editDialogOpen}"
        .imageSrc="${this.activeAttachmentImageSrc}"
        .description="${this.activeAttachment?.description || ''}"
        .mediaId="${this.activeAttachment?.id || ''}"
        @close="${() => this._closeEditDialog()}"
        @save="${this.handleMediaSave}"
      ></media-edit-dialog>

      <handwriting-dialog
        .open="${this.handwritingDialogOpen}"
        @handwriting-complete="${this.handleHandwritingComplete}"
        @close="${() => this.handleHandwritingClose()}"
      ></handwriting-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'post-composer': PostComposer;
  }
}
