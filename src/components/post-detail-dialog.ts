import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';

import './md/md-icon';
import './md/md-icon-button';
import '../pages/post-detail';

/**
 * Fullscreen dialog for displaying post details.
 * Integrates with browser history so the back button closes the dialog.
 */
@customElement('post-detail-dialog')
export class PostDetailDialog extends LitElement {
  @property({ type: Object }) post: Post | null = null;
  @state() private isOpen = false;

  @query('dialog') private dialog!: HTMLDialogElement;

  private _boundPopStateHandler = this._handlePopState.bind(this);

  static styles = css`
    :host {
      display: contents;
    }

    dialog {
      border: none;
      border-radius: 0;
      padding: 0;
      width: 100vw;
      height: 100dvh;
      max-width: 100vw;
      max-height: 100dvh;
      background-color: var(--md-sys-color-surface, #1e1e24);
      color: var(--md-sys-color-on-surface, #e6e1e5);
      overflow: hidden;
    }

    dialog[open] {
      display: flex;
      flex-direction: column;
    }

    dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    /* Animation */
    dialog[open] {
      animation: dialog-slide-up 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    dialog.closing {
      animation: dialog-slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    dialog[open]::backdrop {
      animation: backdrop-show 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    dialog.closing::backdrop {
      animation: backdrop-hide 0.25s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    @keyframes dialog-slide-up {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes dialog-slide-down {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(100%);
      }
    }

    @keyframes backdrop-show {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes backdrop-hide {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      padding: 8px 8px 8px 4px;
      gap: 8px;
      flex-shrink: 0;
      background: var(--md-sys-color-surface, #1e1e24);
      border-bottom: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
      z-index: 1;
    }

    .dialog-header svg {
      width: 24px;
      height: 24px;
    }

    .back-button {
      display: flex;
    }

    .close-button {
      display: none;
    }

    .dialog-title {
      font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
      font-weight: 500;
      margin: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dialog-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    post-detail {
      display: block;
      height: 100%;
    }

    /* Desktop: max width for content readability */
    @media (min-width: 820px) {
      dialog {
        border-radius: 16px;
        width: min(720px, calc(100vw - 64px));
        height: min(90vh, 900px);
        max-width: min(720px, calc(100vw - 64px));
        max-height: min(90vh, 900px);
      }

      .back-button {
        display: none;
      }

      .close-button {
        display: flex;
      }

      @keyframes dialog-slide-up {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes dialog-slide-down {
        from {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        to {
          opacity: 0;
          transform: scale(0.95) translateY(20px);
        }
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this._boundPopStateHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._boundPopStateHandler);
  }

  /**
   * Open the dialog with a post.
   * Pushes a history state so the back button will close the dialog.
   */
  open(post: Post) {
    if (this.isOpen) {
      // Already open - just swap the post content in place
      this.post = post;
      return;
    }

    this.post = post;
    this.isOpen = true;

    // Push a history entry so back button closes the dialog
    history.pushState(
      { postDetailDialogOpen: true, postId: post.id },
      '',
      window.location.href
    );

    this.updateComplete.then(() => {
      if (this.dialog && !this.dialog.open) {
        this.dialog.showModal();
      }
    });

    this.dispatchEvent(
      new CustomEvent('post-detail-dialog-open', {
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Close the dialog.
   * If triggered by back button, does not manipulate history.
   * Otherwise, goes back in history to remove the dialog state.
   */
  async close(fromPopState = false) {
    if (!this.isOpen) return;

    // Animate out
    if (this.dialog) {
      this.dialog.classList.add('closing');

      await new Promise<void>((resolve) => {
        const handler = () => {
          this.dialog.removeEventListener('animationend', handler);
          resolve();
        };
        this.dialog.addEventListener('animationend', handler);

        // Fallback timeout in case animationend doesn't fire
        setTimeout(resolve, 300);
      });

      if (this.dialog.classList.contains('closing')) {
        this.dialog.classList.remove('closing');
        this.dialog.close();
      }
    }

    this.isOpen = false;
    this.post = null;

    // If not triggered by popstate, we need to go back to remove our history entry
    if (!fromPopState) {
      history.back();
    }

    this.dispatchEvent(
      new CustomEvent('post-detail-dialog-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePopState(event: PopStateEvent) {
    // If dialog is open and we navigated away from the dialog state, close it
    if (this.isOpen && !event.state?.postDetailDialogOpen) {
      this.close(true); // fromPopState = true, don't manipulate history again
    }
  }

  private _handleCancel(e: Event) {
    e.preventDefault();
    this.close();
  }

  private _handleBackdropClick(e: MouseEvent) {
    if (e.target === this.dialog) {
      this.close();
    }
  }

  render() {
    return html`
      <dialog
        @cancel="${this._handleCancel}"
        @click="${this._handleBackdropClick}"
      >
        <div class="dialog-header">
          <md-icon-button
            class="back-button"
            @click="${() => this.close()}"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="48"
                d="M328 112L184 256l144 144"
              />
            </svg>
          </md-icon-button>
          <md-icon-button
            class="close-button"
            @click="${() => this.close()}"
            title="Close"
            src="/assets/close-outline.svg"
          ></md-icon-button>
          <h2 class="dialog-title">Post</h2>
        </div>

        <div class="dialog-body">
          ${this.post
            ? html`<post-detail .passed_tweet="${this.post}"></post-detail>`
            : null}
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'post-detail-dialog': PostDetailDialog;
  }
}
