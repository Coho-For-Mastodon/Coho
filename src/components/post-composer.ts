import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { msg, str, localized } from '@lit/localize';
import { postComposerStyles } from '../styles/post-composer-styles';

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
import './md/md-skeleton.js';
import './quoted-post.js';

import type { MdTextArea } from './md/md-text-area.js';
import type { MdDropdown } from './md/md-dropdown.js';
import type {
  ComposerSubmitEvent,
  LocalAttachment,
} from './post-composer/types';
import { PostComposerAttachmentManager } from './post-composer/attachment-manager';
import {
  PostComposerDraftManager,
  type DraftManagerState,
} from './post-composer/draft-manager';
import { PostComposerMentionController } from './post-composer/mention-controller';
import {
  PostComposerPublishOrchestrator,
  type PublishOrchestratorState,
} from './post-composer/publish-orchestrator';

import { getInstanceInfo } from '../services/account';
import {
  proofread,
  isProofreaderAvailable,
  isAudioTranscriptionAvailable,
  transcribeAudio,
  isHandwritingRecognitionAvailable,
} from '../services/ai';
import { showInfoToast } from '../utils/optimistic-updates';
import { type DraftPost } from '../services/drafts';
import {
  getDefaultScheduleDateTime,
  resolveScheduledAtForSubmission,
} from './post-composer/schedule';

import type {
  PollRenderProps,
  ScheduleRenderProps,
  ProofreadRenderProps,
  AttachmentsRenderProps,
  DraftPickerRenderProps,
} from './post-composer/render-features';

import type { Post } from '../interfaces/Post';
import type { Account as MastodonAccount } from '../mastodon/types/account';

export type {
  ComposerSubmitEvent,
  LocalAttachment,
} from './post-composer/types';

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
   * Whether the composer is rendered inside a dialog/sheet surface.
   */
  @property({ type: Boolean, attribute: 'dialog-mode', reflect: true })
  dialogMode = false;

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
   * Hide the reply indicator dismiss button while keeping the reply context visible.
   */
  @property({ type: Boolean }) hideReplyDismiss = false;

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
  @state() handwritingDialogLoaded: boolean = false;

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

  // MediaRecorder for speech-to-text
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Native speech recognition (Android)
  private useNativeSpeech: boolean = false;
  private nativeSpeechPromise: Promise<string> | null = null;
  private nativeSpeechPartialCleanup: (() => void) | null = null;

  private mediaEditDialogLoaded = false;

  private _features:
    typeof import('./post-composer/render-features.js') | null = null;

  private draftKey: string | null = null;

  private mentionController = new PostComposerMentionController({
    getState: () => ({
      mentionOpen: this.mentionOpen,
      mentionQuery: this.mentionQuery,
      mentionResults: this.mentionResults,
      mentionLoading: this.mentionLoading,
      mentionActiveIndex: this.mentionActiveIndex,
      mentionAnchorLeft: this.mentionAnchorLeft,
      mentionAnchorTop: this.mentionAnchorTop,
      mentionDropdownWidth: this.mentionDropdownWidth,
      mentionAnchorReady: this.mentionAnchorReady,
    }),
    setState: (patch) => Object.assign(this, patch),
    getNativeTextArea: () => this._getNativeTextArea(),
    getTextAreaWrapper: () => this._getTextAreaWrapper(),
    getComposerValue: () => this._getComposerValue(),
    setComposerValue: (value, nextCursor) =>
      this._applyComposerValue(value, nextCursor),
  });

  private attachmentManager = new PostComposerAttachmentManager({
    getState: () => ({
      attachments: this.attachments,
      activeAttachment: this.activeAttachment,
      activeAttachmentImageSrc: this.activeAttachmentImageSrc,
      editDialogOpen: this.editDialogOpen,
      maxMediaAttachments: this.maxMediaAttachments,
      imageSizeLimit: this.imageSizeLimit,
      videoSizeLimit: this.videoSizeLimit,
    }),
    setState: async (patch) => {
      const { editDialogOpen, ...rest } = patch;
      Object.assign(this, rest);
      if (editDialogOpen !== undefined) {
        await import('./media-edit-dialog.js');
        this.mediaEditDialogLoaded = true;
        await this.updateComplete;
        this.editDialogOpen = editDialogOpen;
      }
    },
    // @ts-expect-error - temporary
    getMediaEditDialog: () => {
      return this.shadowRoot?.querySelector('media-edit-dialog') ?? null;
    },
  });

  private draftManager = this._createDraftManager();

  private publishOrchestrator = this._createPublishOrchestrator();

  @query('md-text-area') private textArea!: MdTextArea;
  // @query('media-edit-dialog')
  // private mediaEditDialog!: import('./media-edit-dialog').MediaEditDialog;
  @query('#emoji-trigger') private _emojiButton!: HTMLElement;
  @query('#more-options-dropdown') private _moreOptionsDropdown?: MdDropdown;

  static styles = postComposerStyles;

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

    // Check for native Android speech recognition
    try {
      const { isNativeSpeechRecognitionAvailable } =
        await import('../services/native-ai.js');
      this.useNativeSpeech = await isNativeSpeechRecognitionAvailable();
      if (this.useNativeSpeech) {
        this.speechToTextAvailable = true;
      }
    } catch {
      // Not on native Android, use web fallback
    }

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

    this._loadFeatures();
  }

  private async _loadFeatures() {
    if (!this._features) {
      this._features = await import('./post-composer/render-features.js');
      this.requestUpdate();
    }
    return this._features;
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
    this.mentionController.destroy();

    const nativeTextArea = this._getNativeTextArea();
    if (nativeTextArea) {
      nativeTextArea.removeEventListener('keyup', this._handleCaretMove);
      nativeTextArea.removeEventListener('click', this._handleCaretMove);
      nativeTextArea.removeEventListener('scroll', this._handleCaretMove);
    }

    this.attachmentManager.destroy();
    this.draftManager.destroy();
    this.publishOrchestrator.destroy();

    // Stop any active recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
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
      const { getStatusSource } = await import('../services/posts');
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
    return this.attachmentManager.addAttachment(attachment, {
      pollEnabled: this.pollEnabled,
    });
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
    this.mentionController.handleCaretMove();
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

  private _getTextAreaWrapper(): HTMLElement | null {
    return this.renderRoot.querySelector(
      '.text-area-wrapper'
    ) as HTMLElement | null;
  }

  private _getComposerValue(): string {
    return this.textArea?.value || this.statusText || '';
  }

  private _applyComposerValue(value: string, nextCursor?: number) {
    const nativeTextArea = this._getNativeTextArea();
    if (nativeTextArea) {
      nativeTextArea.value = value;
      if (nextCursor !== undefined) {
        nativeTextArea.selectionStart = nextCursor;
        nativeTextArea.selectionEnd = nextCursor;
      }
      nativeTextArea.focus();
    }

    if (this.textArea) {
      this.textArea.value = value;
    }

    this._setStatusText(value);
  }

  private _syncComposerValue(value: string) {
    const nativeTextArea = this._getNativeTextArea();
    if (nativeTextArea) {
      nativeTextArea.value = value;
    }

    if (this.textArea) {
      this.textArea.value = value;
    }

    this._setStatusText(value);
  }

  private _createDraftManager() {
    return new PostComposerDraftManager({
      getState: () => this._getDraftManagerState(),
      setState: (patch) => this._applyDraftManagerPatch(patch),
      syncComposerValue: (value) => this._syncComposerValueAndWait(value),
      clearAttachments: () => this.attachmentManager.clearAttachments(),
      restorePendingAttachment: (file, description) =>
        this.attachmentManager.restorePendingAttachment(file, description),
      dispatchDraftSaved: (draftId) => this._dispatchDraftSaved(draftId),
    });
  }

  private _createPublishOrchestrator() {
    return new PostComposerPublishOrchestrator({
      getState: () => this._getPublishOrchestratorState(),
      setState: (patch) => this._applyPublishOrchestratorPatch(patch),
      getStatus: () => this._getComposerValue(),
      getPollPayload: () => this._getPollPayload(),
      resolveScheduledAtForSubmission: () =>
        this._resolveScheduledAtForSubmission(),
      resetComposer: () => this._resetState(),
      dispatchSubmit: (detail) => this._dispatchSubmit(detail),
      dispatchPublished: (detail) => this._dispatchPublished(detail),
    });
  }

  private _getDraftManagerState(): DraftManagerState {
    return {
      statusText: this.statusText,
      visibility: this.visibility,
      sensitive: this.sensitive,
      spoilerText: this.spoilerText,
      pollEnabled: this.pollEnabled,
      pollOptions: this.pollOptions,
      pollDurationSeconds: this.pollDurationSeconds,
      pollMultiple: this.pollMultiple,
      pollError: this.pollError,
      scheduleEnabled: this.scheduleEnabled,
      scheduleDate: this.scheduleDate,
      scheduleTime: this.scheduleTime,
      scheduleError: this.scheduleError,
      attachments: this.attachments,
      draftStatus: this.draftStatus,
      availableDrafts: this.availableDrafts,
      draftPickerOpen: this.draftPickerOpen,
      selectedDraftId: this.selectedDraftId,
      draftDirty: this.draftDirty,
      draftLoaded: this.draftLoaded,
      draftKey: this.draftKey,
      lastSavedStatusText: this.lastSavedStatusText,
      compact: this.compact,
      replyToId: this.replyTo?.id ?? null,
    };
  }

  private _applyDraftManagerPatch(patch: Partial<DraftManagerState>) {
    Object.assign(this, patch);
  }

  private async _syncComposerValueAndWait(value: string) {
    this._syncComposerValue(value);
    await this.updateComplete;
  }

  private _dispatchDraftSaved(draftId: string) {
    this.dispatchEvent(
      new CustomEvent('draft-saved', {
        bubbles: true,
        composed: true,
        detail: { draftId },
      })
    );
  }

  private _getPublishOrchestratorState(): PublishOrchestratorState {
    return {
      autoPublish: this.autoPublish,
      attachments: this.attachments,
      visibility: this.visibility,
      sensitive: this.sensitive,
      spoilerText: this.spoilerText,
      scheduleEnabled: this.scheduleEnabled,
      compact: this.compact,
      pollEnabled: this.pollEnabled,
      replyToId: this.replyTo?.id ?? null,
      quotedStatusId: this.quotedPost?.id ?? null,
      editingPostId: this.editingPost?.id ?? null,
      isPublishing: this.isPublishing,
      publishSuccess: this.publishSuccess,
    };
  }

  private _applyPublishOrchestratorPatch(
    patch: Partial<PublishOrchestratorState>
  ) {
    Object.assign(this, patch);
  }

  private _dispatchSubmit(detail: ComposerSubmitEvent) {
    this.dispatchEvent(
      new CustomEvent('submit', {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  private _dispatchPublished(detail: {
    status: string;
    scheduledAt: string | null;
    edited: boolean;
  }) {
    this.dispatchEvent(
      new CustomEvent('published', {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  private _updateMentionSuggestions(
    value: string,
    cursor: number,
    nativeTextArea: HTMLTextAreaElement | null
  ) {
    this.mentionController.updateSuggestions(value, cursor, nativeTextArea);
  }

  private _moveMentionSelection(step: number) {
    this.mentionController.moveSelection(step);
  }

  private _applyMention(account: MastodonAccount) {
    this.mentionController.applyMention(account);
  }

  private _closeMentionPicker() {
    this.mentionController.close();
  }

  // File attachment methods

  private _addFileAttachment(file: File) {
    this.attachmentManager.addFileAttachment(file);
  }

  async attachFile() {
    this.attaching = true;
    try {
      await this.attachmentManager.attachFilesFromPicker({
        pollEnabled: this.pollEnabled,
      });
    } finally {
      this.attaching = false;
    }
  }

  removeImage(id: string) {
    this.attachmentManager.removeImage(id);
  }

  private _closeEditDialog() {
    this.attachmentManager.closeEditDialog();
  }

  openEditDialog(attachment: LocalAttachment) {
    this.attachmentManager.openEditDialog(attachment);
  }

  async handleMediaSave(e: CustomEvent) {
    await this.attachmentManager.handleMediaSave(e.detail);
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
      const nextSchedule = getDefaultScheduleDateTime();
      this.scheduleDate = nextSchedule.date;
      this.scheduleTime = nextSchedule.time;
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

  private _setScheduleDate(value: string) {
    this.scheduleDate = value;
    this.scheduleError = null;
  }

  private _setScheduleTime(value: string) {
    this.scheduleTime = value;
    this.scheduleError = null;
  }

  private _resolveScheduledAtForSubmission(): string | null {
    const result = resolveScheduledAtForSubmission({
      scheduleEnabled: this.scheduleEnabled,
      scheduleDate: this.scheduleDate,
      scheduleTime: this.scheduleTime,
    });

    switch (result.error) {
      case null:
        this.scheduleError = null;
        return result.scheduledAt;
      case 'missing':
        this.scheduleError = msg('Choose a date and time.');
        return null;
      case 'invalid':
        this.scheduleError = msg('Choose a valid date and time.');
        return null;
      case 'tooSoon':
        this.scheduleError = msg(
          'Schedule your post at least 5 minutes in the future.'
        );
        return null;
      default:
        return null;
    }
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
      // Keep the dropdown open while recording is active
      if (this._moreOptionsDropdown) {
        this._moreOptionsDropdown.keepOpen = true;
      }

      // Use native ML Kit speech recognition on Android
      if (this.useNativeSpeech) {
        const { nativeStartSpeechRecognition, addNativeSpeechPartialListener } =
          await import('../services/native-ai.js');
        this.isRecording = true;

        // Subscribe to live partial text so the user sees recognition in real-time
        const baseText = this.textArea?.value ?? '';
        addNativeSpeechPartialListener((partial) => {
          if (this.textArea) {
            const nextValue =
              baseText.trim().length > 0 ? baseText + ' ' + partial : partial;
            this.textArea.value = nextValue;
            this._setStatusText(nextValue);
          }
        }).then((cleanup) => {
          this.nativeSpeechPartialCleanup = cleanup;
        });

        this.nativeSpeechPromise = nativeStartSpeechRecognition();
        // The promise resolves when stopSpeechRecognition is called
        this.nativeSpeechPromise
          .then((text) => {
            this.nativeSpeechPartialCleanup?.();
            this.nativeSpeechPartialCleanup = null;
            this.isRecording = false;
            this.nativeSpeechPromise = null;
            if (this._moreOptionsDropdown) {
              this._moreOptionsDropdown.keepOpen = false;
              this._moreOptionsDropdown.hide();
            }
            if (text && this.textArea) {
              const currentText = baseText;
              const nextValue =
                currentText.trim().length > 0 ? currentText + ' ' + text : text;
              this.textArea.value = nextValue;
              this._setStatusText(nextValue);
            }
          })
          .catch((err) => {
            console.error('Native speech recognition failed:', err);
            this.nativeSpeechPartialCleanup?.();
            this.nativeSpeechPartialCleanup = null;
            this.isRecording = false;
            this.nativeSpeechPromise = null;
            if (this._moreOptionsDropdown) {
              this._moreOptionsDropdown.keepOpen = false;
              this._moreOptionsDropdown.hide();
            }
          });
        return;
      }

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
      // If recording failed to start, release keepOpen
      if (this._moreOptionsDropdown) {
        this._moreOptionsDropdown.keepOpen = false;
      }
      console.error('Failed to start recording:', error);
    }
  }

  async stopRecording() {
    // Native Android path
    if (this.useNativeSpeech && this.nativeSpeechPromise) {
      try {
        const { nativeStopSpeechRecognition } =
          await import('../services/native-ai.js');
        await nativeStopSpeechRecognition();
      } catch (err) {
        console.error('Failed to stop native speech recognition:', err);
        this.nativeSpeechPartialCleanup?.();
        this.nativeSpeechPartialCleanup = null;
        if (this._moreOptionsDropdown) {
          this._moreOptionsDropdown.keepOpen = false;
          this._moreOptionsDropdown.hide();
        }
      }
      this.isRecording = false;
      return;
    }

    // Web path
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
      if (this._moreOptionsDropdown) {
        this._moreOptionsDropdown.keepOpen = false;
        this._moreOptionsDropdown.hide();
      }
    }
  }

  // Handwriting

  async openHandwritingDialog() {
    await import('./handwriting-dialog.js');
    this.handwritingDialogLoaded = true;

    await this.updateComplete;

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
    await this.publishOrchestrator.submit();
  }

  private _resetState() {
    this.attachmentManager.reset();
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

  private _hasDraftContent(): boolean {
    return this.draftManager.hasDraftContent();
  }

  private async _loadDraftForContext() {
    await this.draftManager.loadDraftForContext();
  }

  private async _saveDraft() {
    await this.draftManager.saveDraft();
  }

  private async _openDraftPicker() {
    await this.draftManager.openDraftPicker();
  }

  private _closeDraftPicker() {
    this.draftManager.closeDraftPicker();
  }

  private _handleDraftStatusAnimationEnd = () => {
    this.draftManager.handleDraftStatusAnimationEnd();
  };

  private _handleDraftSelectionChange(
    e: CustomEvent<{ value: string; oldValue: string }>
  ) {
    this.draftManager.handleDraftSelectionChange(e.detail.value);
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
    await this.draftManager.loadSelectedDraft();
  }

  // Render methods

  private _renderReplyIndicator() {
    if (this.hideReplyIndicator || !this.replyTo) return nothing;

    return html`
      <div class="replying-to-indicator">
        <span>${msg(str`Replying to @${this.replyTo.account.acct}`)}</span>
        ${
          this.hideReplyDismiss
            ? nothing
            : html`
                <md-icon-button
                  label=${msg('Dismiss')}
                  src="/assets/close-outline.svg"
                  @click=${() => this.clearReplyTo()}
                ></md-icon-button>
              `
        }
      </div>
    `;
  }

  private _renderQuoteIndicator() {
    if (!this.quotedPost) return nothing;

    return html`
      <div class="replying-to-indicator">
        <span>${msg(str`Quoting @${this.quotedPost.account.acct}`)}</span>
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
        ${
          this.mentionLoading
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
                })
        }
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
        ${
          !this.compact
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
                  <md-option value="private"
                    >${msg('Followers Only')}</md-option
                  >
                  <md-option value="direct">${msg('Direct')}</md-option>
                </md-select>
              `
            : nothing
        }

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
          ?disabled=${
            this.pollEnabled ||
            this.quotedPost != null ||
            this.attachments.length >= this.maxMediaAttachments
          }
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
              !this.compact
                ? html`
                    <md-menu-item
                      .selected=${this.scheduleEnabled}
                      @click=${() => this._toggleSchedule()}
                    >
                      <md-icon
                        slot="prefix"
                        src="/assets/calendar-outline.svg"
                      ></md-icon>
                      ${
                        this.scheduleEnabled
                          ? msg('Edit scheduled time')
                          : msg('Schedule post')
                      }
                    </md-menu-item>
                  `
                : nothing
            }

            <md-menu-item
              .selected=${this.pollEnabled}
              ?disabled=${
                this.attachments.length > 0 || this.quotedPost != null
              }
              @click=${() => this._togglePoll()}
            >
              <md-icon
                slot="prefix"
                src="/assets/chatbox-outline.svg"
              ></md-icon>
              ${this.pollEnabled ? msg('Remove Poll') : msg('Add Poll')}
            </md-menu-item>

            ${
              this.proofreaderAvailable
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
                : nothing
            }
            ${
              this.speechToTextAvailable
                ? html`
                    <md-menu-item
                      ?disabled=${this.isTranscribing}
                      @click=${() => this.toggleRecording()}
                      title=${
                        this.isRecording || this.isTranscribing
                          ? ''
                          : 'On-device AI'
                      }
                    >
                      <md-icon
                        slot="prefix"
                        src="${
                          this.isRecording
                            ? '/assets/stop-circle-outline.svg'
                            : '/assets/mic-outline.svg'
                        }"
                      ></md-icon>
                      ${
                        this.isRecording
                          ? msg('Stop recording')
                          : this.isTranscribing
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
      <!-- Proofread result (below actions row, full-width) -->
      ${this.proofreaderAvailable ? this._renderProofreadResult() : nothing}
    `;
  }

  private _renderProofreadResult() {
    if (!this.proofreadResult || !this._features) return nothing;

    return this._features.renderProofreadResult({
      proofreadResult: this.proofreadResult,
      onApply: () => this.applyCorrections(),
      onDismiss: () => this.dismissProofread(),
    } satisfies ProofreadRenderProps);
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
    if (this.hideActions || !this.pollEnabled || !this._features)
      return nothing;

    return this._features.renderPoll({
      pollOptions: this.pollOptions,
      pollDurationSeconds: this.pollDurationSeconds,
      pollMultiple: this.pollMultiple,
      pollError: this.pollError,
      onSetOption: (idx, val) => this._setPollOption(idx, val),
      onAddOption: () => this._addPollOption(),
      onRemoveOption: (idx) => this._removePollOption(idx),
      onSetDuration: (s) => (this.pollDurationSeconds = s),
      onSetMultiple: (v) => (this.pollMultiple = v),
      readInputValue: (e) => this._readInputEventValue(e),
    } satisfies PollRenderProps);
  }

  private _renderSchedule() {
    if (
      this.compact ||
      !this.scheduleEnabled ||
      this.editingPost ||
      !this._features
    )
      return nothing;

    return this._features.renderSchedule({
      scheduleDate: this.scheduleDate,
      scheduleTime: this.scheduleTime,
      scheduleError: this.scheduleError,
      onDateChange: (v) => this._setScheduleDate(v),
      onTimeChange: (v) => this._setScheduleTime(v),
      onOpenScheduledStatuses: () => this._openScheduledStatuses(),
      readInputValue: (e) => this._readInputEventValue(e),
    } satisfies ScheduleRenderProps);
  }

  private _renderAttachments() {
    const hasContent = this.attaching || this.attachments.length > 0;
    if (!hasContent || !this._features) return nothing;

    return this._features.renderAttachments({
      attaching: this.attaching,
      attachments: this.attachments,
      onRemove: (id) => this.removeImage(id),
      onEdit: (att) => this.openEditDialog(att),
    } satisfies AttachmentsRenderProps);
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
          ${
            hasSavedDrafts
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
              : nothing
          }
          ${
            canSaveDraft
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
              : nothing
          }
          ${
            this.draftStatus === 'saving'
              ? html`<span class="draft-status"
                  >${msg('Saving draft...')}</span
                >`
              : this.draftStatus === 'saved'
                ? html`<span
                    class="draft-status saved"
                    @animationend=${this._handleDraftStatusAnimationEnd}
                    >${msg('Draft saved')}</span
                  >`
                : nothing
          }
        </div>
        <div class="footer-primary">
          ${
            this.hasStatus
              ? html`<span
                  class="char-count ${
                    this.charCount >= this.maxChars
                      ? 'over-limit'
                      : this.charCount >= this.maxChars * 0.9
                        ? 'near-limit'
                        : ''
                  }"
                  role="status"
                  aria-live="polite"
                  >${this.charCount}/${this.maxChars}</span
                >`
              : nothing
          }
          <md-button
            ?disabled="${
              (!this.hasStatus && !this.publishSuccess) ||
              this.attaching ||
              this.attachments.some((a) => a.pending) ||
              this.isPublishing ||
              this.publishSuccess
            }"
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
    if (!this._features) return nothing;

    return this._features.renderDraftPickerDialog({
      draftPickerOpen: this.draftPickerOpen,
      selectedDraftId: this.selectedDraftId,
      availableDrafts: this.availableDrafts,
      onClose: () => this._closeDraftPicker(),
      onSelectionChange: (e) => this._handleDraftSelectionChange(e),
      onLoad: () => this._loadSelectedDraft(),
      formatLabel: (draft) => this._formatDraftOptionLabel(draft),
    } satisfies DraftPickerRenderProps);
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
      ${
        this.mediaEditDialogLoaded
          ? html`<media-edit-dialog
              .open="${this.editDialogOpen}"
              .imageSrc="${this.activeAttachmentImageSrc}"
              .description="${this.activeAttachment?.description || ''}"
              .mediaId="${this.activeAttachment?.id || ''}"
              @close="${() => this._closeEditDialog()}"
              @save="${this.handleMediaSave}"
            ></media-edit-dialog>`
          : nothing
      }
      ${
        this.handwritingDialogLoaded
          ? html`<handwriting-dialog
              .open="${this.handwritingDialogOpen}"
              @handwriting-complete="${this.handleHandwritingComplete}"
              @close="${() => this.handleHandwritingClose()}"
            ></handwriting-dialog>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'post-composer': PostComposer;
  }
}
