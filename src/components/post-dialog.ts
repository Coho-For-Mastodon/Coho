import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { msg, str, localized } from '@lit/localize';

import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-field.js';
import './md/md-text-area.js';
import './md/md-icon.js';
import './md/md-icon-button.js';
import './md/md-select.js';
import './md/md-option.js';
import './md/md-checkbox.js';
import './media-edit-dialog.js';
import './md/md-skeleton.js';
import './handwriting-dialog.js';

import type { MdDialog } from './md/md-dialog.js';
import type { MdTextArea } from './md/md-text-area.js';
import type { MdTextField } from './md/md-text-field.js';

import {
  publishPost,
  publishPollPost,
  uploadImageFromBlob,
  updateMedia,
  pickMedia,
  uploadMediaFile,
} from '../services/posts';
import { getInstanceInfo } from '../services/account';
import {
  createAPost,
  createImage,
  proofread,
  isProofreaderAvailable,
  isAudioTranscriptionAvailable,
  transcribeAudio,
  isHandwritingRecognitionAvailable,
} from '../services/ai';
import { showInfoToast } from '../utils/optimistic-updates';

import MarkdownWorker from '../utils/markdown-worker?worker';

interface LocalAttachment {
  id: string;
  preview_url: string;
  description: string | null;
  pending?: boolean;
  file?: File; // Store file for deferred upload
}

@localized()
@customElement('post-dialog')
export class PostDialog extends LitElement {
  @state() attachmentPreview: string | undefined;
  @state() attachmentID: string | undefined;

  @state() attachments: Array<LocalAttachment> = [];

  @state() editDialogOpen = false;
  @state() activeAttachment: LocalAttachment | null = null;

  @state() attaching: boolean = false;

  @state() showPrompt: boolean = false;
  @state() generatingImage: boolean = false;

  @state() generatingPost: boolean = false;

  @state() generatedImage: string | undefined;

  @state() hasStatus: boolean = false;
  @state() sensitive: boolean = false;
  @state() visibility: string = 'public';
  @state() isMobile: boolean = false;

  @state() maxChars: number = 500;
  @state() maxMediaAttachments: number = 4;
  @state() charCount: number = 0;

  // Poll composer state (basic)
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

  // Drag and drop state
  @state() isDraggingOver: boolean = false;

  aiBlob: Blob | undefined;

  // MediaRecorder for speech-to-text
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // DOM element references using @query for type safety
  @query('#notify-dialog') private notifyDialog!: MdDialog;
  @query('md-text-area') private postTextArea!: MdTextArea;
  @query('md-text-field') private promptTextField!: MdTextField;
  @query('#sensitive-input') private sensitiveInput!: MdTextField;
  @query('media-edit-dialog')
  private mediaEditDialog!: import('./media-edit-dialog').MediaEditDialog;

  static styles = [
    css`
      :host {
        display: block;
      }

      /* Poll height animation using interpolate-size (native auto height animation) */
      .poll-wrapper {
        interpolate-size: allow-keywords;
        height: 0;
        overflow: hidden;
        opacity: 0;
        transition:
          height 0.3s cubic-bezier(0.2, 0, 0, 1),
          opacity 0.25s cubic-bezier(0, 0, 0.2, 1);
      }

      .poll-wrapper.open {
        height: auto;
        opacity: 1;
      }

      .poll-composer {
        margin-top: 12px;
        padding: 12px;
        border-radius: 12px;
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

      #ai-preview-block {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
      }

      #markdown-support {
        margin: 0;
        padding-top: 4px;
        font-size: var(--md-sys-typescale-label-small-font-size);
      }

      .preview-actions {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      md-dialog::part(dialog) {
        z-index: 99999;
        min-width: 60vw;
        min-height: 70vh;
      }

      #expanded-actions {
        display: flex;
        justify-content: flex-start;
        gap: 8px;
      }

      .dialog-footer-actions {
        gap: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;

        margin-bottom: env(keyboard-inset-height, 0px);

        justify-content: flex-end;
        width: 100%;
      }

      .dialog-footer-actions div {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex: 1;
        min-width: 0;
      }

      .dialog-footer-actions .desktop-button {
        flex-shrink: 1;
        min-width: fit-content;
      }

      #post-copilot {
        background: rgb(0 0 0 / 6%);
        border-radius: 6px;
        padding-left: 10px;
        padding-right: 10px;
        padding-bottom: 10px;
        padding-top: 10px;
        margin-top: 12px;

        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      #post-copilot span {
        font-size: var(--md-sys-typescale-body-small-font-size);
      }

      #post-copilot md-button {
        place-self: flex-end;
        margin-top: 8px;
      }

      ul {
        padding: 0;
        margin: 0;
        display: flex;
        gap: 6px;
        list-style: none;
        margin-top: 8px;

        overflow: hidden;
        overflow-x: scroll;
      }

      ul::-webkit-scrollbar {
        display: none;
      }

      md-button {
        border: none;
      }

      md-text-field {
        width: 100%;
        margin-top: 8px;
      }

      md-text-area {
        width: 100%;
      }

      @media (prefers-color-scheme: dark) {
        /* Dark mode handled by md-text-field and md-text-area components */
      }

      #post-ai-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
      }

      #ai-preview-block md-skeleton {
        height: 320px;
        width: 100%;
      }

      #ai-image {
        background: rgba(255, 255, 255, 0.04);
        padding: 10px;
        margin-top: 1em;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        min-height: 370px;
        border-radius: 6px;

        animation: fadein 0.5s;
      }

      #ai-image img {
        width: 20em;
        height: 320px;
        border-radius: 6px;
      }

      #ai-input-block {
        display: flex;
        gap: 8px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      #ai-input-block sl-input {
        width: 80%;
      }

      .mobile-icon-button {
        display: none;
      }

      .desktop-button {
        display: inline-flex;
      }

      .img-preview {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 8em;
        margin-top: 10px;
        background: #00000040;
        padding: 6px;
        gap: 6px;

        border-radius: 6px;
      }

      .img-preview img {
        width: 8em;
        height: 8em;
        border-radius: 6px;
        margin-top: 4px;
        object-fit: cover;
      }

      md-skeleton {
        height: 8em;
        width: 8em;
      }

      @media (min-width: 1250px) {
        md-dialog::part(dialog) {
          min-width: 50vw;
          min-height: 60vh;
        }
      }

      /* Switch to icon buttons when viewport is narrower than 1400px,
         since the dialog is 60vw wide, buttons would overflow earlier */
      @media (max-width: 1400px) {
        .mobile-icon-button {
          display: inline-flex;
        }

        .desktop-button {
          display: none;
        }
      }

      @media (max-width: 820px) {
        md-dialog::part(dialog) {
          min-width: 100vw;
          min-height: 100vh;
        }
      }

      @keyframes fadein {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Proofreading styles */
      .proofread-container {
        position: relative;
      }

      .proofread-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        width: 320px;
        margin-top: 4px;
        padding: 8px 0;
        background-color: var(--md-sys-color-surface-container, #2b2930);
        color: var(--md-sys-color-on-surface, #e6e1e5);
        border-radius: 4px;
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
        border-radius: 4px;
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

      /* Speech-to-text styles */
      .textarea-wrapper {
        position: relative;
        width: 100%;
      }

      .textarea-inner-buttons {
        position: absolute;
        top: 6px;
        right: 6px;
        z-index: 10;
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .mic-button,
      .proofread-button {
        // eslint-diable-next-line lit-binding-positions
        --md-icon-button-icon-size: 18px;
        transition: opacity 0.2s ease;
      }

      .mic-button:hover,
      .proofread-button:hover {
        opacity: 1;
      }

      .proofread-button.proofreading {
        --md-icon-button-icon-color: #e879f9;
        opacity: 1 !important;
        animation: ai-glow 1.5s ease-in-out infinite;
        border-radius: 50%;
      }

      .proofread-button[disabled] {
        opacity: 0.3;
      }

      .mic-button.recording {
        --md-icon-button-icon-color: #fff;
        background-color: #e53935;
        border-radius: 50%;
        opacity: 1;
        animation: recording-pulse 1s ease-in-out infinite;
      }

      .mic-button.transcribing {
        --md-icon-button-icon-color: #e879f9;
        opacity: 1 !important;
        animation: ai-glow 1.5s ease-in-out infinite;
        border-radius: 50%;
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

      /* Drag and drop styles */
      :host([dragging-over]) md-dialog::part(content) {
        outline: 2px dashed var(--md-sys-color-primary, #d0bcff);
        outline-offset: -4px;
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary, #d0bcff) 8%,
          transparent
        );
      }
    `,
  ];

  protected async firstUpdated() {
    // Detect mobile based on screen width
    this.isMobile = window.matchMedia('(max-width: 820px)').matches;

    // Listen for resize events to update mobile state
    window.matchMedia('(max-width: 820px)').addEventListener('change', (e) => {
      this.isMobile = e.matches;
    });

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

    // Check if proofreader is available
    this.proofreaderAvailable = await isProofreaderAvailable();

    // Check if speech-to-text is available
    this.speechToTextAvailable = isAudioTranscriptionAvailable();

    // Check if handwriting recognition is available
    this.handwritingAvailable = await isHandwritingRecognitionAvailable();

    // Add keyboard shortcut for Ctrl/Cmd+Enter to publish
    this.addEventListener('keydown', this._handleKeydown);

    // Add paste event listener for clipboard images
    this.addEventListener('paste', this._handlePaste);

    // Add drag and drop event listeners
    this.addEventListener('dragover', this._handleDragOver);
    this.addEventListener('dragleave', this._handleDragLeave);
    this.addEventListener('drop', this._handleDrop);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this.removeEventListener('paste', this._handlePaste);
    this.removeEventListener('dragover', this._handleDragOver);
    this.removeEventListener('dragleave', this._handleDragLeave);
    this.removeEventListener('drop', this._handleDrop);

    // Clean up any blob URLs to prevent memory leaks
    this.attachments.forEach((att) => {
      if (att.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(att.preview_url);
      }
    });
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    // Ctrl/Cmd+Enter to publish
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.publish();
    }
  };

  private _handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    if (this.pollEnabled) {
      // Check early if poll is enabled before processing any images
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          showInfoToast(msg('Disable the poll to attach media.'));
          return;
        }
      }
      return;
    }

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();

        // Check attachment limit
        if (this.attachments.length >= this.maxMediaAttachments) {
          showInfoToast(
            msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
          );
          return;
        }

        const file = item.getAsFile();
        if (!file) continue;

        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const previewUrl = URL.createObjectURL(file);

        const newAttachment: LocalAttachment = {
          id: tempId,
          preview_url: previewUrl,
          description: null,
          pending: true,
          file,
        };

        this.attachments = [...this.attachments, newAttachment];

        // Start upload immediately for pasted images
        this.uploadFile(file, tempId);
      }
    }
  };

  private _handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if dragging files that include images
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

    // Only reset if leaving the component entirely
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

    // Process all image/video files, respecting the limit
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // Check attachment limit
        if (this.attachments.length >= this.maxMediaAttachments) {
          showInfoToast(
            msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
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
        };

        this.attachments = [...this.attachments, newAttachment];
        this.uploadFile(file, tempId);
      }
    }
  };

  public async openNewDialog(shareName?: string) {
    // Ensure the component's shadow DOM is ready
    await this.updateComplete;

    // Wait for the dialog custom element to be defined
    await customElements.whenDefined('md-dialog');

    this.notifyDialog?.show();

    // If shareName is passed directly (from share target), use it
    // Otherwise fall back to URL params for backwards compatibility
    const nameToUse =
      shareName ?? new URLSearchParams(window.location.search).get('name');

    if (nameToUse) {
      await this.shareTarget(nameToUse);
    }
  }

  async shareTarget(name: string) {
    // Decode the URL-encoded filename from the query param
    const decodedName = decodeURIComponent(name);
    const cache = await caches.open('shareTarget');

    // Build the expected cache key (must match SW's format)
    const expectedKey = `/_share/${encodeURIComponent(decodedName)}`;

    console.log('[Share Target Dialog] Looking for cache key:', expectedKey);
    console.log(
      '[Share Target Dialog] Available cache keys:',
      (await cache.keys()).map((r) => r.url)
    );

    const response = await cache.match(expectedKey);

    if (response) {
      console.log('[Share Target Dialog] Found cached file, uploading...');
      const blob = await response.blob();

      this.attaching = true;

      const { uploadImageFromBlob } = await import('../services/posts');
      const data = await uploadImageFromBlob(blob);

      this.attaching = false;

      const newAttachment = {
        id: data.id,
        preview_url: data.preview_url,
        description: data.description,
      };

      this.attachments = [...this.attachments, newAttachment];

      // Clean up the cache after successful upload
      await cache.delete(expectedKey);
      console.log('[Share Target Dialog] Cached file cleaned up');

      this.openEditDialog(newAttachment);
    } else {
      console.log('[Share Target Dialog] No cached file found');
    }
  }

  private _togglePoll() {
    // Enforce mutual exclusion: poll OR media
    if (!this.pollEnabled && this.attachments.length > 0) {
      showInfoToast('Remove media attachments before adding a poll.');
      return;
    }

    const next = !this.pollEnabled;
    this.pollEnabled = next;
    this.pollError = null;

    // Reset poll fields when turning off
    if (!next) {
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
    // md-text-field dispatches a CustomEvent('input', { detail: { value } }),
    // but the native <input> event can also bubble out of its shadow root.
    // Support both so typing doesn't get overwritten by stale state.
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
    const next = this.pollOptions.filter((_, i) => i !== index);
    this.pollOptions = next;
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
      this.pollError = 'Add between 2 and 4 options.';
      return null;
    }

    const normalized = options.map((o) => o.toLowerCase());
    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      this.pollError = 'Poll options must be unique.';
      return null;
    }

    if (
      !Number.isFinite(this.pollDurationSeconds) ||
      this.pollDurationSeconds <= 0
    ) {
      this.pollError = 'Choose a valid poll duration.';
      return null;
    }

    return {
      options,
      expiresIn: this.pollDurationSeconds,
      multiple: this.pollMultiple,
    };
  }

  async attachFile() {
    if (this.pollEnabled) {
      showInfoToast('Disable the poll to attach media.');
      return;
    }

    // Check if we're already at the limit
    if (this.attachments.length >= this.maxMediaAttachments) {
      showInfoToast(
        msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
      );
      return;
    }

    const files = await pickMedia();
    if (!files || files.length === 0) return;

    for (const file of files) {
      // Check limit for each file in case multiple selected
      if (this.attachments.length >= this.maxMediaAttachments) {
        showInfoToast(
          msg(str`Maximum ${this.maxMediaAttachments} attachments allowed.`)
        );
        break;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);

      const newAttachment: LocalAttachment = {
        id: tempId,
        preview_url: previewUrl,
        description: null,
        pending: true,
        file, // Store file for upload when user saves
      };

      this.attachments = [...this.attachments, newAttachment];

      // Open dialog for the first file immediately
      if (files.indexOf(file) === 0) {
        this.openEditDialog(newAttachment);
      }

      // Don't upload yet - wait for user to save in edit dialog
    }
  }

  async uploadFile(file: File, tempId: string) {
    try {
      const data = await uploadMediaFile(file);

      // Find the attachment to check if description was updated locally
      const currentAttachment = this.attachments.find((a) => a.id === tempId);
      const descriptionToSave = currentAttachment?.description;

      // Update with real data
      this.attachments = this.attachments.map((a) =>
        a.id === tempId
          ? {
              ...a,
              id: data.id,
              preview_url: data.preview_url, // Use remote URL
              pending: false,
            }
          : a
      );

      // If this was the active attachment in the dialog, update the dialog's active attachment
      if (this.activeAttachment?.id === tempId) {
        this.activeAttachment = {
          ...this.activeAttachment,
          id: data.id,
          preview_url: data.preview_url,
          pending: false,
        };
      }

      // If description was set while pending, update it on server
      if (descriptionToSave) {
        await updateMedia(data.id, descriptionToSave);
      }
    } catch (err) {
      console.error('Upload failed', err);
      // Remove failed attachment
      this.attachments = this.attachments.filter((a) => a.id !== tempId);
      if (this.activeAttachment?.id === tempId) {
        this.editDialogOpen = false;
        this.activeAttachment = null;
      }
    }
  }

  async addAIImageToPost() {
    if (this.generatedImage && this.aiBlob) {
      this.showPrompt = false;

      this.attaching = true;
      const attachmentData = await uploadImageFromBlob(this.aiBlob);

      const newAttachment = {
        id: attachmentData.id,
        preview_url: attachmentData.preview_url,
        description: attachmentData.description,
      };

      this.attachments = [...this.attachments, newAttachment];

      this.attaching = false;

      this.generatedImage = undefined;
      this.aiBlob = undefined;

      this.openEditDialog(newAttachment);
    }
  }

  removeImage(id: string) {
    const attachment = this.attachments.find((a) => a.id === id);
    if (attachment?.preview_url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.preview_url);
    }
    this.attachments = this.attachments.filter((a) => a.id !== id);
  }

  async publish() {
    // Check if any attachments are still uploading
    const pendingAttachments = this.attachments.filter((a) => a.pending);
    if (pendingAttachments.length > 0) {
      showInfoToast(msg('Please wait for media uploads to complete.'));
      return;
    }

    const status = this.postTextArea?.value;
    console.log(status);

    let spoilerText = '';

    if (status && status.length > 0) {
      const worker = new MarkdownWorker();

      worker.onmessage = async (e: MessageEvent<string>) => {
        const html = e.data;
        console.log(html);

        const isOffline = !navigator.onLine;

        try {
          // Build poll payload (if enabled)
          const pollPayload = this._getPollPayload();

          // Enforce mutual exclusion at publish-time as well
          if (pollPayload && this.attachments.length > 0) {
            this.pollError =
              'Remove media attachments before publishing a poll.';
            worker.terminate();
            return;
          }

          if (this.attachments.length > 0) {
            if (this.sensitive === true) {
              spoilerText = this.sensitiveInput?.value ?? '';
            }

            await publishPost(
              status,
              this.attachments.map((att) => att.id),
              this.sensitive,
              spoilerText,
              this.visibility
            );
          } else {
            if (this.sensitive === true) {
              spoilerText = this.sensitiveInput?.value ?? '';
            }

            if (pollPayload) {
              await publishPollPost(
                status,
                pollPayload,
                this.sensitive,
                spoilerText,
                this.visibility
              );
            } else {
              await publishPost(
                status,
                undefined,
                this.sensitive,
                spoilerText,
                this.visibility
              );
            }
          }
        } catch (error) {
          console.log('[PostDialog] Publish error:', error);

          // If we're offline, the service worker will queue the request
          // Show a friendly message and close the dialog
          if (isOffline) {
            showInfoToast(
              "Your post will be published when you're back online"
            );
            this.resetDialogState();
            this.notifyDialog?.hide();
            worker.terminate();
            return;
          }

          // If we're online but still got an error, it's a real failure
          // Don't close the dialog so user can retry
          worker.terminate();
          return;
        }

        // Success - reset and close
        this.resetDialogState();
        this.notifyDialog?.hide();

        worker.terminate();

        // fire custom event
        this.dispatchEvent(
          new CustomEvent('published', {
            bubbles: true,
            composed: true,
            detail: {
              status: status,
            },
          })
        );
      };

      worker.postMessage(status);
    }
  }

  /**
   * Reset the dialog state after publishing or closing
   */
  private resetDialogState() {
    // Clean up blob URLs before clearing attachments
    this.attachments.forEach((att) => {
      if (att.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(att.preview_url);
      }
    });
    this.attachments = [];
    this.generatedImage = undefined;
    this.aiBlob = undefined;
    this.charCount = 0;
    this.hasStatus = false;
    this.sensitive = false;
    this.proofreadResult = null;
    this.isRecording = false;
    this.isTranscribing = false;

    // Reset poll composer state
    this.pollEnabled = false;
    this.pollOptions = ['', ''];
    this.pollDurationSeconds = 60 * 60;
    this.pollMultiple = false;
    this.pollError = null;

    // Stop any active recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.audioChunks = [];

    if (this.postTextArea) {
      this.postTextArea.value = '';
    }
  }

  async doAIImage(prompt: string) {
    this.generatedImage = undefined;

    this.generatingImage = true;
    const imageData = await createImage(prompt);
    this.generatingImage = false;

    console.log('image', imageData);
    const baseData = imageData.data[0].b64_json;

    // convert base64 to blob
    const blob = await fetch(`data:image/png;base64,${baseData}`).then(
      async (r) => await r.blob()
    );

    this.aiBlob = blob;

    this.generatedImage = URL.createObjectURL(blob);
  }

  async openAIPrompt() {
    this.showPrompt = true;
  }

  async generateStatus() {
    const prompt = this.promptTextField?.value;

    if (this.postTextArea) {
      this.postTextArea.value = 'Generating post...';
    }

    this.generatingPost = true;

    const data = await createAPost(prompt);

    if (data && data.choices[0] && this.postTextArea) {
      const generated = data.choices[0].message.content.trim();
      /// remove quotes from generated text
      this.postTextArea.value = generated.replace(/"/g, '');
      this.postTextArea.value = data.choices[0].message.content.trim();
    } else if (this.postTextArea) {
      this.postTextArea.value = 'Failed to generate post.';
    }

    this.generatingPost = false;
  }

  handleStatus(ev: Event) {
    const target = ev.target as HTMLTextAreaElement;
    this.charCount = target.value.length;
    if (target.value.length > 0) {
      this.hasStatus = true;
    } else {
      this.hasStatus = false;
    }
  }

  async doProofread() {
    const text = this.postTextArea?.value;

    if (!text || text.trim().length === 0) return;

    this.proofreading = true;
    this.proofreadResult = null;

    try {
      const result = await proofread(text);
      this.proofreadResult = result;
    } catch (error) {
      console.error('Proofreading failed:', error);
    } finally {
      this.proofreading = false;
    }
  }

  applyCorrections() {
    if (!this.proofreadResult) return;

    if (this.postTextArea) {
      this.postTextArea.value = this.proofreadResult.correctedInput;
      this.charCount = this.proofreadResult.correctedInput.length;
      this.hasStatus = this.proofreadResult.correctedInput.length > 0;
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
      await this._startRecordingInternal();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  private async _startRecordingInternal() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      this.audioChunks = [];

      // Try to find a supported MIME type
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
      console.log('MediaRecorder using mimeType:', this.mediaRecorder.mimeType);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        console.log(
          'Audio blob created:',
          audioBlob.size,
          'bytes, type:',
          audioBlob.type
        );
        await this.handleTranscription(audioBlob);
      };

      // Request data every 250ms for more reliable capture
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

      if (transcribedText && this.postTextArea) {
        const currentText = this.postTextArea.value;
        // Append to existing text with a space separator
        if (currentText.trim().length > 0) {
          this.postTextArea.value = currentText + ' ' + transcribedText;
        } else {
          this.postTextArea.value = transcribedText;
        }

        // Update character count and status
        this.charCount = this.postTextArea.value.length;
        this.hasStatus = this.postTextArea.value.length > 0;
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      this.isTranscribing = false;
    }
  }

  async markAsSensitive() {
    this.sensitive = !this.sensitive;
  }

  openHandwritingDialog() {
    this.handwritingDialogOpen = true;
  }

  handleHandwritingComplete(e: CustomEvent<{ text: string }>) {
    const recognizedText = e.detail.text;

    if (recognizedText && this.postTextArea) {
      const currentText = this.postTextArea.value;
      // Append to existing text with a space separator
      if (currentText.trim().length > 0) {
        this.postTextArea.value = currentText + ' ' + recognizedText;
      } else {
        this.postTextArea.value = recognizedText;
      }

      // Update character count and status
      this.charCount = this.postTextArea.value.length;
      this.hasStatus = this.postTextArea.value.length > 0;
    }

    this.handwritingDialogOpen = false;
  }

  handleHandwritingClose() {
    this.handwritingDialogOpen = false;
  }

  openEditDialog(attachment: LocalAttachment) {
    this.activeAttachment = attachment;
    this.editDialogOpen = true;
  }

  async handleMediaSave(e: CustomEvent) {
    const { id, description, editedBlob } = e.detail;

    // Find the attachment being saved
    const attachment = this.attachments.find((a) => a.id === id);
    if (!attachment) {
      this.mediaEditDialog?.completeUpload(false);
      return;
    }

    // Determine what to upload: editedBlob (filter applied), stored file (new attachment), or nothing (already uploaded)
    const blobToUpload =
      editedBlob || (attachment.file ? attachment.file : null);

    if (blobToUpload) {
      // Need to upload the image
      try {
        const result = await uploadImageFromBlob(blobToUpload);

        // Update with description after upload
        if (description) {
          await updateMedia(result.id, description);
        }

        // Clean up the old preview URL if it was a blob URL
        if (attachment.preview_url.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.preview_url);
        }

        // Replace attachment with uploaded one
        this.attachments = this.attachments.map((a) =>
          a.id === id
            ? {
                id: result.id,
                preview_url: result.preview_url,
                description,
                pending: false,
                // Don't keep the file reference after upload
              }
            : a
        );

        // Update active attachment if it's the same one
        if (this.activeAttachment?.id === id) {
          this.activeAttachment = null;
        }

        // Signal upload complete
        this.mediaEditDialog?.completeUpload(true);
      } catch (err) {
        console.error('Failed to upload media', err);
        // Signal upload failed
        this.mediaEditDialog?.completeUpload(false);
      }
      return;
    }

    // No upload needed - just update description
    this.attachments = this.attachments.map((a) =>
      a.id === id ? { ...a, description } : a
    );

    // If active attachment is the one being saved, clear it
    if (this.activeAttachment?.id === id) {
      this.activeAttachment = null;
    }

    // Update description on server if already uploaded
    if (!attachment.pending) {
      try {
        await updateMedia(id, description);
        this.mediaEditDialog?.completeUpload(true);
      } catch (err) {
        console.error('Failed to update media description', err);
        this.mediaEditDialog?.completeUpload(false);
      }
    } else {
      // Was pending but no file to upload (shouldn't happen, but handle gracefully)
      this.mediaEditDialog?.completeUpload(true);
    }
  }
  render() {
    return html`
      <md-dialog
        id="notify-dialog"
        label=${msg('New Post')}
        ?fullscreen=${this.isMobile}
        ?no-backdrop-close=${this.isMobile}
      >
        <div class="textarea-wrapper">
          <md-text-area
            @change="${(e: Event) => this.handleStatus(e)}"
            @input="${(e: Event) => this.handleStatus(e)}"
            autofocus
            placeholder=${msg("What's on your mind?")}
            rows="6"
            maxlength="${this.maxChars}"
          ></md-text-area>

          <div id="expanded-actions">
            <!-- Desktop buttons with text -->
            <md-select
              .value=${this.visibility}
              @change=${(e: CustomEvent<{ value: string }>) =>
                (this.visibility = e.detail.value)}
              style="width: 140px; min-width: 140px;"
              pill
            >
              <md-option value="public">${msg('Public')}</md-option>
              <md-option value="unlisted">${msg('Unlisted')}</md-option>
              <md-option value="private">${msg('Followers Only')}</md-option>
              <md-option value="direct">${msg('Direct')}</md-option>
            </md-select>

            <md-button
              class="desktop-button"
              variant="outlined"
              ?disabled=${this.attachments.length > 0}
              @click="${() => this._togglePoll()}"
            >
              ${this.pollEnabled ? msg('Remove Poll') : msg('Add Poll')}
            </md-button>

            <md-button
              class="desktop-button"
              variant="outlined"
              @click="${() => this.markAsSensitive()}"
            >
              ${msg('Content Warning')}
              <md-icon src="/assets/eye-outline.svg"></md-icon>
            </md-button>

            <md-button
              class="desktop-button"
              pill
              variant="outlined"
              @click="${() => this.attachFile()}"
              ?disabled=${this.pollEnabled ||
              this.attachments.length >= this.maxMediaAttachments}
            >
              ${msg('Attach Media')}
              <md-icon src="/assets/attach-outline.svg"></md-icon>
            </md-button>

            <!-- Mobile icon buttons -->
            <md-icon-button
              class="mobile-icon-button"
              label="${this.pollEnabled ? msg('Remove Poll') : msg('Add Poll')}"
              src="/assets/chatbox-outline.svg"
              ?disabled=${this.attachments.length > 0}
              @click="${() => this._togglePoll()}"
            ></md-icon-button>

            <md-icon-button
              class="mobile-icon-button"
              label=${msg('Content Warning')}
              src="/assets/eye-outline.svg"
              @click="${() => this.markAsSensitive()}"
            ></md-icon-button>

            <md-icon-button
              class="mobile-icon-button"
              label=${msg('Attach Media')}
              src="/assets/attach-outline.svg"
              @click="${() => this.attachFile()}"
              ?disabled=${this.pollEnabled ||
              this.attachments.length >= this.maxMediaAttachments}
            ></md-icon-button>

            ${this.proofreaderAvailable
              ? html`
                  <div class="proofread-container">
                    ${this.proofreadResult &&
                    this.proofreadResult.corrections.length === 0
                      ? html`
                          <span class="proofread-success">
                            ✓ ${msg('Looks good!')}
                            <md-icon-button
                              class="proofread-button"
                              label=${msg('Dismiss')}
                              src="/assets/close-outline.svg"
                              @click="${() => this.dismissProofread()}"
                            ></md-icon-button>
                          </span>
                        `
                      : html`
                          <md-icon-button
                            class="proofread-button ${this.proofreading
                              ? 'proofreading'
                              : ''}"
                            label="${this.proofreading
                              ? msg('Checking...')
                              : msg('Proofread')}"
                            src="/assets/sparkles-outline.svg"
                            ?disabled=${!this.hasStatus || this.proofreading}
                            @click="${() => this.doProofread()}"
                            title="${this.proofreading ? '' : 'On-device AI'}"
                          ></md-icon-button>
                        `}
                    ${this.proofreadResult &&
                    this.proofreadResult.corrections.length > 0
                      ? html`
                          <div class="proofread-dropdown">
                            <div class="proofread-dropdown-header">
                              <span class="proofread-dropdown-label">
                                ${msg('Suggested revision')}
                                (${this.proofreadResult.corrections.length}
                                change${this.proofreadResult.corrections
                                  .length > 1
                                  ? 's'
                                  : ''})
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
                        `
                      : null}
                  </div>
                `
              : null}
            ${this.speechToTextAvailable
              ? html`
                  <md-icon-button
                    class="mic-button ${this.isRecording
                      ? 'recording'
                      : ''} ${this.isTranscribing ? 'transcribing' : ''}"
                    label="${this.isRecording
                      ? msg('Stop recording')
                      : this.isTranscribing
                        ? msg('Transcribing...')
                        : msg('Voice input')}"
                    src="${this.isRecording
                      ? '/assets/stop-circle-outline.svg'
                      : '/assets/mic-outline.svg'}"
                    ?disabled=${this.isTranscribing}
                    @click="${() => this.toggleRecording()}"
                    title="${this.isRecording || this.isTranscribing
                      ? ''
                      : 'On-device AI'}"
                  ></md-icon-button>
                `
              : null}
            ${this.handwritingAvailable
              ? html`
                  <md-icon-button
                    class="pen-button"
                    label=${msg('Handwriting input')}
                    src="/assets/brush-outline.svg"
                    @click="${() => this.openHandwritingDialog()}"
                    title="On-device AI"
                  ></md-icon-button>
                `
              : null}
          </div>
        </div>
        ${this.sensitive
          ? html`<div id="sensitive-warning">
              <md-text-field
                id="sensitive-input"
                placeholder=${msg('Write your warning here')}
              ></md-text-field>
            </div>`
          : null}

        <div class="poll-wrapper ${this.pollEnabled ? 'open' : ''}">
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
                <md-option value="${String(5 * 60)}"
                  >${msg('5 minutes')}</md-option
                >
                <md-option value="${String(30 * 60)}"
                  >${msg('30 minutes')}</md-option
                >
                <md-option value="${String(60 * 60)}"
                  >${msg('1 hour')}</md-option
                >
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
        </div>

        <div slot="footer" class="dialog-footer-actions">
          ${this.showPrompt
            ? html`<div id="ai-image">
                ${this.showPrompt && this.generatedImage
                  ? html`
                      <img
                        src="${this.generatedImage}"
                        alt="${msg('AI generated image')}"
                      />
                    `
                  : this.showPrompt && this.generatingImage === false
                    ? html`<div id="ai-preview-block">
                        <p>
                          ${msg('Enter a prompt to generate an image with AI!')}
                        </p>
                      </div>`
                    : html`<div id="ai-preview-block">
                        <md-skeleton></md-skeleton>
                      </div>`}
              </div>`
            : null}

          <!-- Publish button (same for both) -->
          <md-button
            ?disabled="${this.hasStatus === false ||
            this.attaching === true ||
            this.attachments.some((a) => a.pending)}"
            pill
            variant="filled"
            @click="${() => this.publish()}"
            >${msg('Publish')}</md-button
          >
        </div>

        ${this.attaching === false
          ? html`
              <ul>
                ${this.attachments.map((attachment) => {
                  return html`
                    <div class="img-preview">
                      <div class="preview-actions">
                        <md-icon-button
                          size="small"
                          @click="${() => this.removeImage(attachment.id)}"
                        >
                          <md-icon src="/assets/close-outline.svg"></md-icon>
                        </md-icon-button>
                        <md-icon-button
                          size="small"
                          @click="${() => this.openEditDialog(attachment)}"
                        >
                          <md-icon src="/assets/brush-outline.svg"></md-icon>
                        </md-icon-button>
                      </div>
                      <img
                        src="${attachment.preview_url}"
                        alt="${attachment.description || ''}"
                      />
                    </div>
                  `;
                })}
              </ul>
            `
          : html`<div id="attachment-loading">
              <md-skeleton></md-skeleton>
            </div>`}
      </md-dialog>

      <media-edit-dialog
        .open="${this.editDialogOpen}"
        .imageSrc="${this.activeAttachment?.preview_url || ''}"
        .description="${this.activeAttachment?.description || ''}"
        .mediaId="${this.activeAttachment?.id || ''}"
        @close="${() => {
          this.editDialogOpen = false;
          this.activeAttachment = null;
        }}"
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
