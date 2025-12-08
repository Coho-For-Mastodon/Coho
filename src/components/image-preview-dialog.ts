import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import './md/md-icon-button';
import './md/md-icon';
import './md/md-skeleton';
import { isPromptAPIAvailable, generateAltText } from '../services/ai';

@customElement('image-preview-dialog')
export class ImagePreviewDialog extends LitElement {
  @state() open: boolean = false;
  @state() src: string = '';
  @state() alt: string = '';
  @state() width: number = 0;
  @state() height: number = 0;
  @state() loaded: boolean = false;

  // Swipe gesture state
  @state() private swipeOffset: number = 0;
  @state() private isDragging: boolean = false;
  @state() private isClosingWithSwipe: boolean = false;

  private startY: number = 0;
  private startTime: number = 0;

  @query('dialog') dialog!: HTMLDialogElement;
  @query('.container') container!: HTMLElement;
  @query('.close-button') closeButton!: HTMLElement;

  static styles = css`
    :host {
      display: contents;
    }

    dialog {
      background: transparent;
      border: none;
      padding: 0;
      max-width: 100vw;
      max-height: 100vh;
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
    }

    dialog::backdrop {
      background-color: rgb(0 0 0 / 0%);
      backdrop-filter: blur(36px);
    }

    .container {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: 1fr auto;
      align-items: center;
      justify-items: center;
      padding: 24px;
      box-sizing: border-box;
      touch-action: none;
      user-select: none;
    }

    .image-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      isolation: isolate;
    }

    md-skeleton {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s ease-out;
      z-index: 1;
    }

    md-skeleton.hidden {
      opacity: 0;
    }

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 4px;
      cursor: default;
      opacity: 0;
      transition: opacity 0.3s ease-in;
      position: relative;
      z-index: 2;
    }

    img.loaded {
      opacity: 1;
    }

    .caption {
      margin-top: 16px;
      color: #e6e1e5;
      text-align: center;
      max-height: 10vh;
      overflow-y: auto;
      font-family: var(
        --md-sys-typescale-body-large-font-family-name,
        Roboto,
        sans-serif
      );
      font-size: var(--md-sys-typescale-body-large-font-size, 16px);
      max-width: 800px;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px 16px;
      border-radius: 24px;
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 10;
      color: white;
      --md-sys-color-on-surface-variant: white;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
    }

    .close-button:hover {
      background: rgba(0, 0, 0, 0.5);
    }

    /* Swipe gesture styles */
    .container.dragging {
      transition: none;
    }

    .close-button.dragging {
      transition: none;
    }

    .container.swipe-closing {
      transition:
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .close-button.swipe-closing {
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    dialog.swipe-closing::backdrop {
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      'preview-image',
      this.handlePreviewImage as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      'preview-image',
      this.handlePreviewImage as EventListener
    );
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        if (this.dialog && !this.dialog.open) this.dialog.showModal();
      } else {
        if (this.dialog && this.dialog.open) this.dialog.close();
      }
    }
  }

  private handlePreviewImage = (e: CustomEvent) => {
    this.src = e.detail.src;
    this.alt = e.detail.alt;
    this.width = e.detail.width;
    this.height = e.detail.height;
    this.loaded = false;
    this.open = true;

    if (isPromptAPIAvailable() && (!this.alt || this.alt.trim() === '')) {
      this.alt = 'Loading alt text...';
      this.handleGenerateAlt();
    }
  };

  private async handleGenerateAlt() {
    const result = await generateAltText(this.src);
    if (result) {
      this.alt = result;
    }
  }

  private close() {
    this.open = false;
    // Delay clearing src to avoid flicker during close animation
    setTimeout(() => {
      this.src = '';
      this.alt = '';
      this.width = 0;
      this.height = 0;
      this.loaded = false;
    }, 200);
  }

  private handleBackdropClick(e: MouseEvent) {
    // Close if clicking on the container or image wrapper (backdrop area)
    // But not if clicking on the image itself or caption
    const target = e.target as HTMLElement;
    if (
      target === this.dialog ||
      target.classList.contains('container') ||
      target.classList.contains('image-wrapper')
    ) {
      this.close();
    }
  }

  // Swipe gesture handlers
  private handleTouchStart = (e: TouchEvent) => {
    if (this.isClosingWithSwipe) return;

    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isDragging = true;
    this.swipeOffset = 0;
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.isDragging || this.isClosingWithSwipe) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.startY;

    // Only allow upward swipe (negative deltaY)
    // Add resistance for downward movement
    if (deltaY < 0) {
      this.swipeOffset = deltaY;
    } else {
      // Add resistance for downward swipe
      this.swipeOffset = deltaY * 0.3;
    }

    // Update container transform and fade
    if (this.container) {
      this.container.style.transform = `translateY(${this.swipeOffset}px)`;
      // Fade out as user swipes up
      const opacity = Math.max(0, 1 - Math.abs(this.swipeOffset) / 400);
      this.container.style.opacity = String(opacity);

      // Also fade the close button
      if (this.closeButton) {
        this.closeButton.style.opacity = String(opacity);
      }
    }
  };

  private handleTouchEnd = () => {
    if (!this.isDragging || this.isClosingWithSwipe) return;

    this.isDragging = false;

    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const velocity = Math.abs(this.swipeOffset) / duration;

    // Close if:
    // - Swiped up more than 100px, OR
    // - Swipe velocity is high enough (fast flick)
    const shouldClose =
      this.swipeOffset < -100 || (this.swipeOffset < -30 && velocity > 0.5);

    if (shouldClose) {
      this.closeWithSwipeAnimation();
    } else {
      // Reset position with animation
      this.resetSwipePosition();
    }
  };

  private closeWithSwipeAnimation() {
    this.isClosingWithSwipe = true;

    if (this.container) {
      this.container.classList.add('swipe-closing');
      this.container.style.transform = 'translateY(-100vh)';
      this.container.style.opacity = '0';
    }

    if (this.closeButton) {
      this.closeButton.classList.add('swipe-closing');
      this.closeButton.style.opacity = '0';
    }

    if (this.dialog) {
      this.dialog.classList.add('swipe-closing');
    }

    // Wait for animation to complete before closing
    setTimeout(() => {
      this.open = false;
      this.isClosingWithSwipe = false;

      // Reset styles after close
      setTimeout(() => {
        if (this.container) {
          this.container.classList.remove('swipe-closing');
          this.container.style.transform = '';
          this.container.style.opacity = '';
        }
        if (this.closeButton) {
          this.closeButton.classList.remove('swipe-closing');
          this.closeButton.style.opacity = '';
        }
        if (this.dialog) {
          this.dialog.classList.remove('swipe-closing');
        }
        this.src = '';
        this.alt = '';
        this.width = 0;
        this.height = 0;
        this.loaded = false;
      }, 50);
    }, 300);
  }

  private resetSwipePosition() {
    if (this.container) {
      this.container.style.transition =
        'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      this.container.style.transform = 'translateY(0)';
      this.container.style.opacity = '1';
    }

    if (this.closeButton) {
      this.closeButton.style.transition =
        'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      this.closeButton.style.opacity = '1';
    }

    // Remove transition after animation completes
    setTimeout(() => {
      if (this.container) {
        this.container.style.transition = '';
      }
      if (this.closeButton) {
        this.closeButton.style.transition = '';
      }
    }, 250);

    this.swipeOffset = 0;
  }

  render() {
    return html`
      <dialog @close="${this.close}" @click="${this.handleBackdropClick}">
        <md-icon-button
          class="close-button ${this.isDragging ? 'dragging' : ''}"
          @click="${this.close}"
        >
          <md-icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </md-icon>
        </md-icon-button>

        <div
          class="container ${this.isDragging ? 'dragging' : ''}"
          @touchstart="${this.handleTouchStart}"
          @touchmove="${this.handleTouchMove}"
          @touchend="${this.handleTouchEnd}"
          @touchcancel="${this.handleTouchEnd}"
        >
          <div class="image-wrapper">
            <md-skeleton
              class="${this.loaded ? 'hidden' : ''}"
              width="600px"
              height="600px"
            ></md-skeleton>
            <img
              class="${this.loaded ? 'loaded' : ''}"
              src="${this.src}"
              alt="${this.alt}"
              width="${ifDefined(this.width || undefined)}"
              @click="${(e: Event) => e.stopPropagation()}"
              @load="${() => (this.loaded = true)}"
            />
          </div>
          ${this.alt
            ? html`<div
                class="caption"
                @click="${(e: Event) => e.stopPropagation()}"
              >
                ${this.alt}
              </div>`
            : ''}
        </div>
      </dialog>
    `;
  }
}
