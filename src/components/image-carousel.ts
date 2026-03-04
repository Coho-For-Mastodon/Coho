import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getBlurhashWorker } from '../services/blurhash-worker';
import type { MediaAttachment } from '../types/interfaces/MediaAttachment';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';
import './md/md-audio-player';

@localized()
@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  @property({ type: Array }) images: MediaAttachment[] = [];
  @state() blurhashUrls: Map<string, string> = new Map();
  @state() currentIndex: number = 0;

  private _videoObserver: IntersectionObserver | null = null;

  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
      }

      img {
        border-radius: var(--md-sys-shape-corner-medium);
      }

      .image-container {
        position: relative;
        overflow: hidden;
        background: var(--sl-color-neutral-100);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      @media (prefers-color-scheme: dark) {
        .image-container {
          background: rgb(24 25 31);
        }
      }

      .blurhash-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(20px);
        transform: scale(1.1);
        z-index: 0;
      }

      .image-container img:not(.blurhash-canvas) {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .image-container img.loaded {
        opacity: 1;
      }

      video {
        width: 100%;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      audio {
        width: 100%;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      #list {
        display: flex;
        scroll-snap-type: x mandatory;
        overflow-x: scroll;
        scroll-behavior: smooth;

        align-items: center;
      }

      #list div {
        width: 100%;
        flex-shrink: 0;
        scroll-snap-align: start;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #list::-webkit-scrollbar {
        display: none;
      }
    `,
  ];

  firstUpdated() {
    console.log('image-carousel firstUpdated, images:', this.images);
    this.addEventListener('keydown', this._handleKeydown);
    // Make carousel focusable for keyboard navigation
    this.setAttribute('tabindex', '0');

    // Auto-pause videos when scrolled off-screen, auto-resume gifvs when back
    this._videoObserver = createIntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (!entry.isIntersecting) {
            video.pause();
          } else if (video.hasAttribute('loop')) {
            // Resume autoplay gifvs when scrolled back into view
            video.play().catch(() => {});
          }
        }
      },
      { threshold: 0 }
    );

    this._observeVideos();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('images') && this.images.length > 0) {
      console.log('Images updated, generating blurhashes');
      this.generateBlurhashes();
      // Wait for the render to flush so new <video> elements are in the DOM
      this.updateComplete.then(() => this._observeVideos());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    disconnectIntersectionObserver(this._videoObserver);
    this._videoObserver = null;
  }

  /** Observe all <video> elements in this carousel for visibility-based pause/play */
  private _observeVideos() {
    if (!this._videoObserver) return;
    // Reset observer to drop any stale elements before re-observing
    this._videoObserver.disconnect();
    const videos = this.shadowRoot?.querySelectorAll('video');
    if (!videos) return;
    for (const video of videos) {
      this._videoObserver.observe(video);
    }
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    if (this.images.length <= 1) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this._navigatePrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._navigateNext();
        break;
      default:
        break;
    }
  };

  private _navigatePrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._scrollToCurrentImage();
    }
  }

  private _navigateNext() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this._scrollToCurrentImage();
    }
  }

  private _scrollToCurrentImage() {
    const list = this.shadowRoot?.querySelector('#list') as HTMLElement;
    if (list) {
      const imageWidth = list.offsetWidth;
      list.scrollTo({
        left: this.currentIndex * imageWidth,
        behavior: 'smooth',
      });
    }
  }

  private generateBlurhashes() {
    if (!this.images || this.images.length === 0) {
      console.warn('⚠ No images to process');
      return;
    }

    console.log('→ Generating blurhashes for', this.images.length, 'images');

    const worker = getBlurhashWorker();

    for (const image of this.images) {
      // Skip if already processed or processing
      if (this.blurhashUrls.has(image.id)) {
        console.log('⏭ Skipping already processed', image.id);
        continue;
      }

      if (!image.blurhash) {
        console.warn('⚠ No blurhash for image', image.id);
        continue;
      }

      worker.generateBlurhash(
        image.id,
        image.blurhash,
        20,
        20,
        (id: string, dataUrl: string) => {
          // Update the map
          const newMap = new Map(this.blurhashUrls);
          newMap.set(id, dataUrl);
          this.blurhashUrls = newMap;

          console.log(
            '✓ Blurhash URLs map updated, size:',
            this.blurhashUrls.size
          );
          this.requestUpdate();
        }
      );
    }
  }

  private getImageStyle(image: MediaAttachment): string {
    const meta = image.meta?.small || image.meta?.original;
    if (meta?.aspect) {
      return `aspect-ratio: ${meta.aspect}`;
    }
    return 'height: 300px';
  }

  private handleImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    // Small delay to ensure blurhash is visible first
    setTimeout(() => {
      img.classList.add('loaded');
    }, 100);
  }

  async openInBox(image: MediaAttachment, event?: MouseEvent) {
    console.log('show image', image);
    const target = event?.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;

    window.dispatchEvent(
      new CustomEvent('preview-image', {
        detail: {
          src: image.url,
          alt: image.description,
          width: image.meta?.original?.width,
          height: image.meta?.original?.height,
          blurhash: image.blurhash,
          origin,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div id="list">
        ${this.images.map((image) => {
          if (image.type === 'image') {
            const style = this.getImageStyle(image);
            const blurhashUrl = this.blurhashUrls.get(image.id);
            return html`
              <div
                class="image-container"
                style="${style}"
                @click="${(event: MouseEvent) => this.openInBox(image, event)}"
              >
                ${blurhashUrl
                  ? html`<img
                      class="blurhash-canvas"
                      src="${blurhashUrl}"
                      aria-hidden="true"
                    />`
                  : null}
                <img
                  src="${image.url}"
                  alt="${image.description || msg('Image')}"
                  @load="${this.handleImageLoad}"
                  class="${blurhashUrl ? '' : 'loaded'}"
                />
              </div>
            `;
          } else if (image.type === 'video') {
            return html`
              <div>
                <video controls src="${image.url}"></video>
              </div>
            `;
          } else if (image.type === 'gifv') {
            return html`
              <div>
                <video autoplay loop src="${image.url}"></video>
              </div>
            `;
          } else if (image.type === 'audio') {
            return html`
              <div>
                <md-audio-player
                  src="${image.url}"
                  label="${image.description || msg('Audio')}"
                  preload="metadata"
                ></md-audio-player>
              </div>
            `;
          }
          return null;
        })}
      </div>
    `;
  }
}
