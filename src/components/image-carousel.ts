import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getBlurhashWorker } from '../services/blurhash-worker';
import type { MediaAttachment } from '../types/interfaces/MediaAttachment';

@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  @property({ type: Array }) images: MediaAttachment[] = [];
  @state() blurhashUrls: Map<string, string> = new Map();

  constructor() {
    super();
  }

  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
      }

      img {
        border-radius: 12px;
      }

      .image-container {
        position: relative;
        overflow: hidden;
        background: var(--sl-color-neutral-100);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
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
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('images') && this.images.length > 0) {
      console.log('Images updated, generating blurhashes');
      this.generateBlurhashes();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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

  async openInBox(image: MediaAttachment) {
    console.log('show image', image);

    window.dispatchEvent(
      new CustomEvent('preview-image', {
        detail: {
          src: image.url,
          alt: image.description,
          width: image.meta?.original?.width,
          height: image.meta?.original?.height,
          blurhash: image.blurhash,
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
                @click="${() => this.openInBox(image)}"
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
                  alt="${image.description || 'Image'}"
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
          }
          return null;
        })}
      </div>
    `;
  }
}
