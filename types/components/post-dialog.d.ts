import { LitElement } from 'lit';
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
interface LocalAttachment {
  id: string;
  preview_url: string;
  description: string | null;
  pending?: boolean;
  file?: File;
}
export declare class PostDialog extends LitElement {
  attachmentPreview: string | undefined;
  attachmentID: string | undefined;
  attachments: Array<LocalAttachment>;
  editDialogOpen: boolean;
  activeAttachment: LocalAttachment | null;
  attaching: boolean;
  showPrompt: boolean;
  generatingImage: boolean;
  generatingPost: boolean;
  generatedImage: string | undefined;
  hasStatus: boolean;
  sensitive: boolean;
  visibility: string;
  isMobile: boolean;
  maxChars: number;
  charCount: number;
  pollEnabled: boolean;
  pollOptions: string[];
  pollDurationSeconds: number;
  pollMultiple: boolean;
  pollError: string | null;
  proofreading: boolean;
  proofreadResult: ProofreadResult | null;
  proofreaderAvailable: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  speechToTextAvailable: boolean;
  handwritingAvailable: boolean;
  handwritingDialogOpen: boolean;
  aiBlob: Blob | undefined;
  private mediaRecorder;
  private audioChunks;
  private notifyDialog;
  private postTextArea;
  private promptTextField;
  private sensitiveInput;
  private mediaEditDialog;
  static styles: import('lit').CSSResult[];
  protected firstUpdated(): Promise<void>;
  openNewDialog(): Promise<void>;
  shareTarget(name: string): Promise<void>;
  private _togglePoll;
  private _setPollOption;
  private _readInputEventValue;
  private _addPollOption;
  private _removePollOption;
  private _getPollPayload;
  attachFile(): Promise<void>;
  uploadFile(file: File, tempId: string): Promise<void>;
  addAIImageToPost(): Promise<void>;
  removeImage(id: string): void;
  publish(): Promise<void>;
  /**
   * Reset the dialog state after publishing or closing
   */
  private resetDialogState;
  doAIImage(prompt: string): Promise<void>;
  openAIPrompt(): Promise<void>;
  generateStatus(): Promise<void>;
  handleStatus(ev: Event): void;
  doProofread(): Promise<void>;
  applyCorrections(): void;
  dismissProofread(): void;
  toggleRecording(): Promise<void>;
  startRecording(): Promise<void>;
  private _startRecordingInternal;
  stopRecording(): Promise<void>;
  handleTranscription(audioBlob: Blob): Promise<void>;
  markAsSensitive(): Promise<void>;
  openHandwritingDialog(): void;
  handleHandwritingComplete(
    e: CustomEvent<{
      text: string;
    }>
  ): void;
  handleHandwritingClose(): void;
  openEditDialog(attachment: LocalAttachment): void;
  handleMediaSave(e: CustomEvent): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}
export {};
