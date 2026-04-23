import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import './md/md-icon-button';
import './md/md-icon';

@customElement('image-preview-dialog')
export class ImagePreviewDialog extends LitElement {
  @state() open: boolean = false;
  @state() src: string = '';
  @state() alt: string = '';
  @state() width: number = 0;
  @state() height: number = 0;
  @state() loaded: boolean = false;
  @state() placeholderWidth: number | null = null;
  @state() placeholderHeight: number | null = null;

  // Swipe gesture state
  @state() private swipeOffset: number = 0;
  @state() private isDragging: boolean = false;
  @state() private isClosingWithSwipe: boolean = false;

  private startY: number = 0;
  private startTime: number = 0;

  @query('dialog') dialog!: HTMLDialogElement;
  @query('.container') container!: HTMLElement;
  @query('.image-wrapper') imageWrapper!: HTMLElement;
  @query('.close-button') closeButton!: HTMLElement;

  private openOrigin: { x: number; y: number } | null = null;

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

    dialog[open] .container {
      transform-origin: var(--image-preview-origin-x, 50%)
        var(--image-preview-origin-y, 50%);
      animation: image-preview-open 0.28s cubic-bezier(0.2, 0, 0, 1);
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

    .placeholder-gradient {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: var(--md-sys-shape-corner-extra-small);
      background:
        radial-gradient(
          120% 120% at 20% 10%,
          rgba(255, 255, 255, 0.18),
          rgba(255, 255, 255, 0) 55%
        ),
        linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.18));
      opacity: 0.85;
      transition: opacity 0.2s ease-out;
      z-index: 1;
    }

    .placeholder-gradient.hidden {
      opacity: 0;
    }

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: var(--md-sys-shape-corner-extra-small);
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
      border-radius: var(--md-sys-shape-corner-extra-large);
    }

    .close-button {
      position: absolute;
      top: calc(
        env(titlebar-area-height, env(safe-area-inset-top, 0px)) + 16px
      );
      right: 16px;
      z-index: 10;
      color: white;
      --md-sys-color-on-surface-variant: white;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--md-sys-shape-corner-circle);
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

    @keyframes image-preview-open {
      from {
        opacity: 0;
        transform: scale(var(--image-preview-enter-scale, 0.9));
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      'preview-image',
      this.handlePreviewImage as unknown as EventListener
    );
    // Add keyboard event listener for Escape key
    window.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      'preview-image',
      this.handlePreviewImage as unknown as EventListener
    );
    window.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    if (!this.open) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
      default:
        break;
    }
  };

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this.applyOpenOrigin();
        if (this.dialog && !this.dialog.open) this.dialog.showModal();
      } else {
        if (this.dialog && this.dialog.open) this.dialog.close();
      }
    }
  }

  private handlePreviewImage = async (e: CustomEvent) => {
    this.src = e.detail.src;
    this.alt = e.detail.alt;
    this.width = e.detail.width;
    this.height = e.detail.height;
    this.loaded = false;
    this.placeholderWidth = null;
    this.placeholderHeight = null;
    this.openOrigin = e.detail.origin ?? null;
    this.open = true;

    await this.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.updatePlaceholderSize();

    // Always attempt alt text generation when missing — generateAltText has
    // its own fallback chain: native Android → Chrome Prompt API → cloud function
    if (!this.alt || this.alt.trim() === '') {
      this.alt = 'Loading alt text...';
      this.handleGenerateAlt();
    }
  };

  private handleImageLoad = () => {
    // Only update if not already loaded to prevent re-renders
    if (!this.loaded) {
      this.loaded = true;
    }
  };

  private updatePlaceholderSize() {
    if (!this.imageWrapper || !this.width || !this.height) return;

    const { width: maxWidth, height: maxHeight } =
      this.imageWrapper.getBoundingClientRect();

    if (!maxWidth || !maxHeight) return;

    const scale = Math.min(maxWidth / this.width, maxHeight / this.height, 1);
    this.placeholderWidth = Math.round(this.width * scale);
    this.placeholderHeight = Math.round(this.height * scale);
  }

  private applyOpenOrigin() {
    if (!this.dialog) return;

    if (this.openOrigin) {
      this.dialog.style.setProperty(
        '--image-preview-origin-x',
        `${this.openOrigin.x}px`
      );
      this.dialog.style.setProperty(
        '--image-preview-origin-y',
        `${this.openOrigin.y}px`
      );
      this.dialog.style.setProperty('--image-preview-enter-scale', '0.86');
    } else {
      this.dialog.style.removeProperty('--image-preview-origin-x');
      this.dialog.style.removeProperty('--image-preview-origin-y');
      this.dialog.style.removeProperty('--image-preview-enter-scale');
    }

    this.openOrigin = null;
  }

  private async handleGenerateAlt() {
    const { generateAltText } = await import('../services/ai');
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
      this.placeholderWidth = null;
      this.placeholderHeight = null;
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
            ${!this.loaded && this.placeholderWidth && this.placeholderHeight
              ? html`<div
                  class="placeholder-gradient ${this.loaded ? 'hidden' : ''}"
                  style="width: ${this.placeholderWidth}px; height: ${this
                    .placeholderHeight}px;"
                  aria-hidden="true"
                ></div>`
              : null}
            <img
              class="${this.loaded ? 'loaded' : ''}"
              .src="${this.src}"
              .alt="${this.alt}"
              width="${ifDefined(this.width || undefined)}"
              height="${ifDefined(this.height || undefined)}"
              @click="${(e: Event) => e.stopPropagation()}"
              @load="${this.handleImageLoad}"
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
