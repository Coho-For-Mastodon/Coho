import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-field.js';
import './md/md-text-area.js';
import './md/md-icon.js';
import './md/md-icon-button.js';
import './md/md-select.js';
import './md/md-option.js';
import './media-edit-dialog.js';
import './md/md-skeleton.js';
import './handwriting-dialog.js';

import type { MdDialog } from './md/md-dialog.js';
import type { MdTextArea } from './md/md-text-area.js';
import type { MdTextField } from './md/md-text-field.js';

import {
  publishPost,
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
}

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
  @state() charCount: number = 0;

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

  aiBlob: Blob | undefined;

  // MediaRecorder for speech-to-text
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // DOM element references using @query for type safety
  @query('#notify-dialog') private notifyDialog!: MdDialog;
  @query('md-text-area') private postTextArea!: MdTextArea;
  @query('md-text-field') private promptTextField!: MdTextField;
  @query('#sensitive-input') private sensitiveInput!: MdTextField;

  static styles = [
    css`
      :host {
        display: block;
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

      .dialog-footer-actions {
        gap: 5px;
        display: flex;
        justify-content: flex-end;
        align-items: center;

        margin-bottom: env(keyboard-inset-height, 0px);

        justify-content: space-between;
        width: 100%;
      }

      .dialog-footer-actions div {
        display: flex;
        align-items: center;
        gap: 8px;
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

      @media (max-width: 1200px) {
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
        --md-icon-button-icon-size: 18px;
        opacity: 0.6;
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
        opacity: 0.6;
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

    // Check if proofreader is available
    this.proofreaderAvailable = await isProofreaderAvailable();

    // Check if speech-to-text is available
    this.speechToTextAvailable = isAudioTranscriptionAvailable();

    // Check if handwriting recognition is available
    this.handwritingAvailable = await isHandwritingRecognitionAvailable();
  }

  public async openNewDialog() {
    // Ensure the component's shadow DOM is ready
    await this.updateComplete;

    // Wait for the dialog custom element to be defined
    await customElements.whenDefined('md-dialog');

    this.notifyDialog?.show();

    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('name')) {
      const name = urlParams.get('name');

      if (name) {
        await this.shareTarget(name);
      }
    }
  }

  async shareTarget(name: string) {
    const cache = await caches.open('shareTarget');
    const result = [];

    for (const request of await cache.keys()) {
      // If the request URL contains the name, add the response to the result
      if (request.url.includes(name)) {
        result.push(await cache.match(request));
      }
    }

    console.log('share target result', result);

    if (result.length > 0) {
      const blob = await result[0]!.blob();

      // await this.openNewDialog();

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
      this.openEditDialog(newAttachment);
    }
  }

  async attachFile() {
    const files = await pickMedia();
    if (!files || files.length === 0) return;

    for (const file of files) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);

      const newAttachment: LocalAttachment = {
        id: tempId,
        preview_url: previewUrl,
        description: null,
        pending: true,
      };

      this.attachments = [...this.attachments, newAttachment];

      // Open dialog for the first file immediately
      if (files.indexOf(file) === 0) {
        this.openEditDialog(newAttachment);
      }

      // Start upload in background
      this.uploadFile(file, tempId);
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
    this.attachments = this.attachments.filter((a) => a.id !== id);
  }

  async publish() {
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

            await publishPost(
              status,
              undefined,
              this.sensitive,
              spoilerText,
              this.visibility
            );
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
    this.attachments = [];
    this.generatedImage = undefined;
    this.aiBlob = undefined;
    this.charCount = 0;
    this.hasStatus = false;
    this.sensitive = false;
    this.proofreadResult = null;
    this.isRecording = false;
    this.isTranscribing = false;

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
    const { id, description } = e.detail;

    // Optimistic update
    this.attachments = this.attachments.map((a) =>
      a.id === id ? { ...a, description } : a
    );

    // If active attachment is the one being saved, update it too
    if (this.activeAttachment?.id === id) {
      this.activeAttachment = {
        ...this.activeAttachment,
        description,
      } as LocalAttachment;
    }

    // Only send update if not pending (uploading)
    const attachment = this.attachments.find((a) => a.id === id);
    if (attachment && !attachment.pending) {
      try {
        await updateMedia(id, description);
      } catch (err) {
        console.error('Failed to update media description', err);
      }
    }
  }
  render() {
    return html`
      <md-dialog
        id="notify-dialog"
        label="New Post"
        ?fullscreen=${this.isMobile}
        ?no-backdrop-close=${this.isMobile}
      >
        <div class="textarea-wrapper">
          <md-text-area
            @change="${(e: Event) => this.handleStatus(e)}"
            @input="${(e: Event) => this.handleStatus(e)}"
            autofocus
            placeholder="What's on your mind?"
            rows="6"
            maxlength="${this.maxChars}"
          ></md-text-area>

          <div class="textarea-inner-buttons">
            ${this.proofreaderAvailable
              ? html`
                  <div class="proofread-container">
                    ${this.proofreadResult &&
                    this.proofreadResult.corrections.length === 0
                      ? html`
                          <span class="proofread-success">
                            ✓ Looks good!
                            <md-icon-button
                              class="proofread-button"
                              label="Dismiss"
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
                              ? 'Checking...'
                              : 'Proofread'}"
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
                                Suggested revision
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
                                  >Apply</md-button
                                >
                                <md-button
                                  size="small"
                                  variant="text"
                                  @click="${() => this.dismissProofread()}"
                                  >Dismiss</md-button
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
                      ? 'Stop recording'
                      : this.isTranscribing
                        ? 'Transcribing...'
                        : 'Voice input'}"
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
                    label="Handwriting input"
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
                placeholder="Write your warning here"
              ></md-text-field>
            </div>`
          : null}

        <div slot="footer" class="dialog-footer-actions">
          ${this.showPrompt
            ? html`<div id="ai-image">
                ${this.showPrompt && this.generatedImage
                  ? html` <img src="${this.generatedImage}" /> `
                  : this.showPrompt && this.generatingImage === false
                    ? html`<div id="ai-preview-block">
                        <p>Enter a prompt to generate an image with AI!</p>
                      </div>`
                    : html`<div id="ai-preview-block">
                        <md-skeleton></md-skeleton>
                      </div>`}
              </div>`
            : null}

          <div>
            <!-- Desktop buttons with text -->
            <md-select
              .value=${this.visibility}
              @change=${(e: CustomEvent<{ value: string }>) =>
                (this.visibility = e.detail.value)}
              style="width: 140px; min-width: 140px;"
              pill
            >
              <md-option value="public">Public</md-option>
              <md-option value="unlisted">Unlisted</md-option>
              <md-option value="private">Followers Only</md-option>
              <md-option value="direct">Direct</md-option>
            </md-select>

            <md-button
              class="desktop-button"
              variant="outlined"
              @click="${() => this.markAsSensitive()}"
            >
              Content Warning
              <md-icon src="/assets/eye-outline.svg"></md-icon>
            </md-button>

            <md-button
              class="desktop-button"
              pill
              variant="outlined"
              @click="${() => this.attachFile()}"
            >
              Attach Media
              <md-icon src="/assets/attach-outline.svg"></md-icon>
            </md-button>

            <!-- Mobile icon buttons -->
            <md-icon-button
              class="mobile-icon-button"
              label="Content Warning"
              src="/assets/eye-outline.svg"
              @click="${() => this.markAsSensitive()}"
            ></md-icon-button>

            <md-icon-button
              class="mobile-icon-button"
              label="Attach Media"
              src="/assets/attach-outline.svg"
              @click="${() => this.attachFile()}"
            ></md-icon-button>
          </div>

          <!-- Publish button (same for both) -->
          <md-button
            ?disabled="${this.hasStatus === false || this.attaching === true}"
            pill
            variant="filled"
            @click="${() => this.publish()}"
            >Publish</md-button
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
