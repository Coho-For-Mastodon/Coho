import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-field.js';
import './md/md-icon.js';
import './md/md-skeleton.js';
import './post-composer.js';

import type { MdDialog } from './md/md-dialog.js';
import type { MdTextField } from './md/md-text-field.js';
import type { PostComposer } from './post-composer.js';

import { uploadMediaBlob } from '../services/posts';
import { createAPost, createImage } from '../services/ai';

import type { Post } from '../interfaces/Post';

@localized()
@customElement('post-dialog')
export class PostDialog extends LitElement {
  @state() isMobile: boolean = false;
  @state() isEditing: boolean = false;

  // AI image generation state
  @state() showPrompt: boolean = false;
  @state() generatingImage: boolean = false;
  @state() generatingPost: boolean = false;
  @state() generatedImage: string | undefined;

  private aiBlob: Blob | undefined;

  @query('#notify-dialog') private notifyDialog!: MdDialog;
  @query('post-composer') private composer!: PostComposer;
  @query('#ai-prompt-field') private promptTextField!: MdTextField;

  static styles = css`
    :host {
      display: block;
    }

    md-dialog::part(dialog) {
      z-index: 99999;
      min-width: 60vw;
      min-height: 60vh;
    }

    #ai-preview-block {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
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
      border-radius: var(--md-sys-shape-corner-small);
      animation: fadein 0.5s;
    }

    #ai-image img {
      width: 20em;
      height: 320px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    #ai-input-block {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    #ai-input-block md-text-field {
      flex: 1;
    }

    #post-copilot {
      background: rgb(0 0 0 / 6%);
      border-radius: var(--md-sys-shape-corner-small);
      padding: 10px;
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

    #post-ai-actions {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }

    .preview-actions {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    md-button {
      border: none;
    }

    @media (min-width: 1250px) {
      md-dialog::part(dialog) {
        min-width: 50vw;
        min-height: 60vh;
      }
    }

    @media (max-width: 820px) {
      md-dialog::part(dialog) {
        min-width: 100vw;
        min-height: 100vh;
        margin-top: calc(env(safe-area-inset-top, 0px));
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
  `;

  protected async firstUpdated() {
    // Detect mobile based on screen width
    this.isMobile = window.matchMedia('(max-width: 820px)').matches;

    window.matchMedia('(max-width: 820px)').addEventListener('change', (e) => {
      this.isMobile = e.matches;
    });
  }

  // Public API

  public async openNewDialog(
    shareName?: string,
    origin?: { x: number; y: number },
    shareText?: string
  ) {
    await this.updateComplete;
    await customElements.whenDefined('md-dialog');

    if (origin) {
      this.notifyDialog?.setOpenOrigin(origin);
    }

    this.notifyDialog?.show();

    // Pre-fill composer with shared text (e.g. a URL from another app)
    if (shareText && this.composer) {
      this.composer.value = shareText;
    }

    if (shareName) {
      await this.shareTarget(shareName);
    }
  }

  public openReplyDialog(post: Post) {
    this.updateComplete.then(() => {
      if (this.composer) {
        this.composer.replyTo = post;
      }
      this.notifyDialog?.show();
    });
  }

  public openEditDialog(post: Post) {
    this.isEditing = true;
    this.updateComplete.then(() => {
      if (this.composer) {
        this.composer.editingPost = post;
      }
      this.notifyDialog?.show();
    });
  }

  // Share target handling

  async shareTarget(name: string) {
    const decodedName = decodeURIComponent(name);
    const cache = await caches.open('shareTarget');

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

      const data = await uploadMediaBlob(blob);

      // Add to composer's attachments
      if (this.composer) {
        this.composer.addAttachment({
          id: data.id,
          preview_url: data.preview_url,
          description: data.description,
          file: new File([blob], decodedName, {
            type: blob.type || 'application/octet-stream',
          }),
        });
      }

      await cache.delete(expectedKey);
      console.log('[Share Target Dialog] Cached file cleaned up');
    } else {
      console.log('[Share Target Dialog] No cached file found');
    }
  }

  // AI features

  async openAIPrompt() {
    this.showPrompt = true;
  }

  closeAIPrompt() {
    this.showPrompt = false;
    this.generatedImage = undefined;
    this.aiBlob = undefined;
  }

  async doAIImage(prompt: string) {
    if (!prompt) return;

    this.generatedImage = undefined;
    this.generatingImage = true;

    try {
      const imageData = await createImage(prompt);
      const baseData = imageData.data[0].b64_json;
      const blob = await fetch(`data:image/png;base64,${baseData}`).then(
        async (r) => await r.blob()
      );

      this.aiBlob = blob;
      this.generatedImage = URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to generate AI image:', error);
    } finally {
      this.generatingImage = false;
    }
  }

  async addAIImageToPost() {
    if (this.generatedImage && this.aiBlob) {
      this.showPrompt = false;

      const attachmentData = await uploadMediaBlob(this.aiBlob);

      if (this.composer) {
        this.composer.addAttachment({
          id: attachmentData.id,
          preview_url: attachmentData.preview_url,
          description: attachmentData.description,
          file: new File([this.aiBlob], 'ai-generated.png', {
            type: this.aiBlob.type || 'image/png',
          }),
        });
      }

      this.generatedImage = undefined;
      this.aiBlob = undefined;
    }
  }

  async generateStatus() {
    const prompt = this.promptTextField?.value;
    if (!prompt) return;

    this.generatingPost = true;

    try {
      const data = await createAPost(prompt);

      if (data?.choices?.[0]?.message?.content && this.composer) {
        const generated = data.choices[0].message.content
          .trim()
          .replace(/"/g, '');
        this.composer.value = generated;
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
    } finally {
      this.generatingPost = false;
    }
  }

  // Event handlers

  private _handlePublished(e: CustomEvent) {
    // Reset AI state
    this.showPrompt = false;
    this.generatedImage = undefined;
    this.aiBlob = undefined;

    // Hide dialog
    this.notifyDialog?.hide();

    // Forward the event
    this.dispatchEvent(
      new CustomEvent('published', {
        bubbles: true,
        composed: true,
        detail: e.detail,
      })
    );
  }

  private _handleDialogClose() {
    // Reset composer when dialog closes
    if (this.composer) {
      this.composer.reset();
    }
    this.isEditing = false;
    this.showPrompt = false;
    this.generatedImage = undefined;
    this.aiBlob = undefined;
  }

  private _handleDraftSaved() {
    this.notifyDialog?.hide();
  }

  private async _handleOpenScheduledStatuses(event: Event) {
    event.stopPropagation();
    await this.notifyDialog?.hide();
    this.dispatchEvent(
      new CustomEvent('open-scheduled-statuses', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <md-dialog
        id="notify-dialog"
        label=${this.isEditing ? msg('Edit Post') : msg('New Post')}
        ?fullscreen=${this.isMobile}
        ?no-backdrop-close=${this.isMobile}
        @close=${this._handleDialogClose}
      >
        <post-composer
          @published=${this._handlePublished}
          @draft-saved=${this._handleDraftSaved}
          @open-scheduled-statuses=${(event: Event) =>
            this._handleOpenScheduledStatuses(event)}
          rows="6"
        ></post-composer>

        ${this.showPrompt
          ? html`
              <div id="ai-image">
                ${this.generatedImage
                  ? html`
                      <img
                        src="${this.generatedImage}"
                        alt="${msg('AI generated image')}"
                      />
                      <div class="preview-actions">
                        <md-button
                          variant="filled"
                          @click=${() => this.addAIImageToPost()}
                        >
                          ${msg('Add to post')}
                        </md-button>
                        <md-button
                          variant="text"
                          @click=${() => this.closeAIPrompt()}
                        >
                          ${msg('Cancel')}
                        </md-button>
                      </div>
                    `
                  : this.generatingImage
                    ? html`
                        <div id="ai-preview-block">
                          <md-skeleton></md-skeleton>
                        </div>
                      `
                    : html`
                        <div id="ai-preview-block">
                          <p>
                            ${msg(
                              'Enter a prompt to generate an image with AI!'
                            )}
                          </p>
                        </div>
                      `}

                <div id="ai-input-block">
                  <md-text-field
                    id="ai-prompt-field"
                    placeholder=${msg('Describe the image...')}
                  ></md-text-field>
                  <md-button
                    variant="filled"
                    ?disabled=${this.generatingImage}
                    @click=${() =>
                      this.doAIImage(this.promptTextField?.value || '')}
                  >
                    ${msg('Generate')}
                  </md-button>
                </div>
              </div>
            `
          : nothing}
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'post-dialog': PostDialog;
  }
}
