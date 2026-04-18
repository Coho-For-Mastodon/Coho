import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getBlurhashWorker } from '../services/blurhash-worker';
import type { MediaAttachment } from '../mastodon/types/media';
import {
  shouldUseReducedImageQuality,
  onNetworkQualityChange,
} from '../utils/network-monitor';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';
import {
  updateMediaSession,
  clearMediaSession,
  updateMediaSessionPosition,
} from '../utils/media-session';
import './md/md-audio-player';

@localized()
@customElement('image-carousel')
export class ImageCarousel extends LitElement {
  @property({ type: Array }) images: MediaAttachment[] = [];

  /** Title shown in OS media controls when playing video/audio */
  @property({ type: String }) mediaTitle = '';

  /** Artist shown in OS media controls */
  @property({ type: String }) mediaArtist = '';

  /** Artwork URL shown in OS media controls */
  @property({ type: String }) mediaArtwork = '';

  @state() blurhashUrls: Map<string, string> = new Map();
  @state() currentIndex: number = 0;
  @state() private _slowNetwork = false;

  private _videoObserver: IntersectionObserver | null = null;
  /** Track IDs sent to the worker so we can cancel on disconnect. */
  private _pendingBlurhashIds: Set<string> = new Set();
  private _unsubscribeNetwork: (() => void) | null = null;

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

      .video-container video {
        position: relative;
        width: 100%;
        border-radius: var(--md-sys-shape-corner-medium);
        z-index: 1;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .video-container video.loaded {
        opacity: 1;
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

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    // Initialise with the current quality and subscribe to future changes
    this._slowNetwork = shouldUseReducedImageQuality();
    this._unsubscribeNetwork = onNetworkQualityChange(() => {
      this._slowNetwork = shouldUseReducedImageQuality();
    });
  }

  firstUpdated() {
    this.addEventListener('keydown', this._handleKeydown);
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', 'carousel');
    this.setAttribute('aria-label', 'Media');

    this._videoObserver = createIntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (!entry.isIntersecting) {
            video.pause();
          } else if (video.hasAttribute('loop')) {
            video.play().catch(() => {});
          }
        }
      },
      { threshold: 0 }
    );

    this._observeVideos();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('images')) {
      // Revoke URLs for images that are no longer in the current set
      const currentIds = new Set(this.images.map((img) => img.id));
      const newMap = new Map(this.blurhashUrls);
      let changed = false;
      for (const [id, url] of this.blurhashUrls) {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(url);
          newMap.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.blurhashUrls = newMap;
      }

      if (this.images.length > 0) {
        this.generateBlurhashes();
        this.updateComplete.then(() => this._observeVideos());
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeNetwork?.();
    this._unsubscribeNetwork = null;
    this.removeEventListener('keydown', this._handleKeydown);
    disconnectIntersectionObserver(this._videoObserver);
    this._videoObserver = null;

    // Cancel any in-flight worker requests
    const worker = getBlurhashWorker();
    for (const id of this._pendingBlurhashIds) {
      worker.cancel(id);
    }
    this._pendingBlurhashIds.clear();

    // Revoke all blurhash object URLs on disconnect to prevent memory leaks.
    for (const url of this.blurhashUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.blurhashUrls = new Map();
  }

  private _observeVideos() {
    if (!this._videoObserver) return;
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
    if (!this.images || this.images.length === 0) return;

    const worker = getBlurhashWorker();

    for (const image of this.images) {
      if (
        this.blurhashUrls.has(image.id) ||
        this._pendingBlurhashIds.has(image.id)
      ) {
        continue;
      }

      if (!image.blurhash) continue;

      this._pendingBlurhashIds.add(image.id);

      worker.generateBlurhash(
        image.id,
        image.blurhash,
        20,
        20,
        (id: string, objectUrl: string) => {
          this._pendingBlurhashIds.delete(id);
          const newMap = new Map(this.blurhashUrls);
          newMap.set(id, objectUrl);
          this.blurhashUrls = newMap;
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
    setTimeout(() => {
      img.classList.add('loaded');
    }, 100);
  }

  private _handleVideoLoaded(e: Event) {
    const video = e.target as HTMLVideoElement;
    setTimeout(() => {
      video.classList.add('loaded');
    }, 100);
  }

  private _handleVideoPlay = (e: Event, attachment: MediaAttachment) => {
    const video = e.target as HTMLVideoElement;
    updateMediaSession({
      title: this.mediaTitle || attachment.description || 'Video',
      artist: this.mediaArtist,
      artwork: this.mediaArtwork || attachment.preview_url || undefined,
      onPlay: () => {
        video.play().catch(() => {});
      },
      onPause: () => {
        video.pause();
      },
      onStop: () => {
        video.pause();
        video.currentTime = 0;
        clearMediaSession();
      },
      onSeekTo: (time: number) => {
        video.currentTime = time;
      },
    });
    updateMediaSessionPosition(video.currentTime, video.duration);
  };

  private _handleVideoPauseOrEnded = () => {
    clearMediaSession();
  };

  private _handleVideoTimeUpdate = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (!video.paused) {
      updateMediaSessionPosition(video.currentTime, video.duration);
    }
  };

  async openInBox(image: MediaAttachment, event?: MouseEvent) {
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
      <span class="sr-only" role="status" aria-live="polite">
        ${this.images.length > 1
          ? `Item ${this.currentIndex + 1} of ${this.images.length}`
          : ''}
      </span>
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
                  src="${this._slowNetwork && image.preview_url
                    ? image.preview_url
                    : image.url}"
                  alt="${image.description || msg('Image')}"
                  @load="${this.handleImageLoad}"
                  class="${blurhashUrl ? '' : 'loaded'}"
                />
              </div>
            `;
          } else if (image.type === 'video') {
            const style = this.getImageStyle(image);
            const blurhashUrl = this.blurhashUrls.get(image.id);
            return html`
              <div class="image-container video-container" style="${style}">
                ${blurhashUrl
                  ? html`<img
                      class="blurhash-canvas"
                      src="${blurhashUrl}"
                      aria-hidden="true"
                    />`
                  : null}
                <video
                  controls
                  preload="metadata"
                  poster="${image.preview_url}"
                  src="${image.url}"
                  @loadeddata="${this._handleVideoLoaded}"
                  @play="${(e: Event) => this._handleVideoPlay(e, image)}"
                  @pause="${this._handleVideoPauseOrEnded}"
                  @ended="${this._handleVideoPauseOrEnded}"
                  @timeupdate="${this._handleVideoTimeUpdate}"
                ></video>
              </div>
            `;
          } else if (image.type === 'gifv') {
            const style = this.getImageStyle(image);
            const blurhashUrl = this.blurhashUrls.get(image.id);
            return html`
              <div class="image-container video-container" style="${style}">
                ${blurhashUrl
                  ? html`<img
                      class="blurhash-canvas"
                      src="${blurhashUrl}"
                      aria-hidden="true"
                    />`
                  : null}
                <video
                  autoplay
                  loop
                  muted
                  playsinline
                  preload="metadata"
                  poster="${image.preview_url}"
                  src="${image.url}"
                  @loadeddata="${this._handleVideoLoaded}"
                ></video>
              </div>
            `;
          } else if (image.type === 'audio') {
            return html`
              <div>
                <md-audio-player
                  src="${image.url}"
                  label="${image.description || msg('Audio')}"
                  preload="metadata"
                  mediaTitle="${this.mediaTitle || image.description || ''}"
                  mediaArtist="${this.mediaArtist}"
                  mediaArtwork="${this.mediaArtwork}"
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
