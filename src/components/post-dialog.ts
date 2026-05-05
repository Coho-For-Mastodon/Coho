import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-icon.js';
import './post-composer.js';

import type { MdDialog } from './md/md-dialog.js';
import type { PostComposer } from './post-composer.js';

import { uploadMediaBlob } from '../services/posts';
import type { Post } from '../interfaces/Post';

@localized()
@customElement('post-dialog')
export class PostDialog extends LitElement {
  @state() isMobile: boolean = false;
  @state() private dialogMode: 'new' | 'reply' | 'quote' | 'edit' = 'new';

  @query('#notify-dialog') private notifyDialog!: MdDialog;
  @query('post-composer') private composer!: PostComposer;

  static styles = css`
    :host {
      display: block;
    }

    md-dialog::part(dialog) {
      z-index: 99999;
      min-width: 60vw;
      min-height: 60vh;
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
    this.dialogMode = 'new';
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
    this.dialogMode = 'reply';
    this.updateComplete.then(() => {
      if (this.composer) {
        this.composer.replyTo = post;
      }
      this.notifyDialog?.show();
    });
  }

  public openQuoteDialog(post: Post) {
    this.dialogMode = 'quote';
    this.updateComplete.then(() => {
      if (this.composer) {
        this.composer.quotedPost = post;
      }
      this.notifyDialog?.show();
    });
  }

  public openEditDialog(post: Post) {
    this.dialogMode = 'edit';
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

    const response = await cache.match(expectedKey);

    if (response) {
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
    }
  }

  // Event handlers

  private _handlePublished(e: CustomEvent) {
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
    this.dialogMode = 'new';
  }

  private get dialogLabel() {
    switch (this.dialogMode) {
      case 'reply':
        return msg('Reply');
      case 'quote':
        return msg('Quote Post');
      case 'edit':
        return msg('Edit Post');
      case 'new':
        return msg('New Post');
      default:
        return msg('New Post');
    }
  }

  private get composerRows() {
    return this.dialogMode === 'reply' ? 3 : 6;
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
        label=${this.dialogLabel}
        ?fullscreen=${this.isMobile}
        ?no-backdrop-close=${this.isMobile}
        @close=${this._handleDialogClose}
      >
        <post-composer
          dialog-mode
          @published=${this._handlePublished}
          @draft-saved=${this._handleDraftSaved}
          @open-scheduled-statuses=${(event: Event) =>
            this._handleOpenScheduledStatuses(event)}
          .rows=${this.composerRows}
        ></post-composer>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'post-dialog': PostDialog;
  }
}
