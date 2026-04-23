import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
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
@customElement('image-grid')
export class ImageGrid extends LitElement {
  @property({ type: Array }) images: MediaAttachment[] = [];

  /** Artist shown in OS media controls */
  @property({ type: String }) mediaArtist = '';

  /** Artwork URL shown in OS media controls */
  @property({ type: String }) mediaArtwork = '';

  @state() blurhashUrls: Map<string, string> = new Map();
  @state() private _slowNetwork = false;

  private _videoObserver: IntersectionObserver | null = null;
  private _pendingBlurhashIds: Set<string> = new Set();
  private _unsubscribeNetwork: (() => void) | null = null;

  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
      }

      .media-grid {
        display: grid;
        gap: 3px;
        border-radius: var(--md-sys-shape-corner-medium);
        overflow: hidden;
        width: 100%;
      }

      /* Multi-image layouts: 2 columns */
      .media-grid:not(.count-1) {
        grid-template-columns: 1fr 1fr;
      }

      .media-grid:not(.count-1) .media-cell {
        aspect-ratio: unset !important;
      }

      .media-grid.count-2 {
        grid-template-rows: 240px;
      }

      .media-grid.count-3 {
        grid-template-rows: 1fr 1fr;
        height: 280px;
      }

      .media-grid.count-3 .media-cell:first-child {
        grid-row: span 2;
      }

      .media-grid.count-4 {
        grid-template-rows: 1fr 1fr;
        height: 360px;
      }

      .media-grid.count-many {
        grid-auto-rows: 170px;
      }

      .media-cell {
        position: relative;
        overflow: hidden;
        background: var(--sl-color-neutral-100);
        display: flex;
        align-items: stretch;
      }

      @media (prefers-color-scheme: dark) {
        .media-cell {
          background: rgb(24 25 31);
        }
      }

      .count-1 .media-cell {
        max-height: 480px;
      }

      .media-cell.clickable {
        cursor: pointer;
        border-radius: var(--md-sys-shape-corner-medium);
      }

      .media-cell.clickable img {
        border-radius: var(--md-sys-shape-corner-medium);
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

      .media-cell img:not(.blurhash-canvas) {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .media-cell img.loaded {
        opacity: 1;
      }

      .media-cell video {
        position: relative;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .media-cell video.loaded {
        opacity: 1;
      }

      /* Single video: natural sizing, no crop */
      .count-1 .media-cell video {
        height: auto;
        object-fit: contain;
      }

      .audio-cell {
        grid-column: 1 / -1;
        padding: 4px 0;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._slowNetwork = shouldUseReducedImageQuality();
    this._unsubscribeNetwork = onNetworkQualityChange(() => {
      this._slowNetwork = shouldUseReducedImageQuality();
    });
  }

  firstUpdated() {
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
    disconnectIntersectionObserver(this._videoObserver);
    this._videoObserver = null;

    const worker = getBlurhashWorker();
    for (const id of this._pendingBlurhashIds) {
      worker.cancel(id);
    }
    this._pendingBlurhashIds.clear();

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

  private getVideoPreloadMode(): 'metadata' | 'none' {
    return this._slowNetwork ? 'none' : 'metadata';
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

  private getCellStyle(image: MediaAttachment): string {
    const small = image.meta?.small;
    const original = image.meta?.original;
    const aspect = small?.aspect ?? original?.aspect;
    if (aspect) {
      return `aspect-ratio: ${aspect}`;
    }

    const width = small?.width ?? original?.width;
    const height = small?.height ?? original?.height;
    if (typeof width === 'number' && typeof height === 'number' && height > 0) {
      return `aspect-ratio: ${width} / ${height}`;
    }

    return 'aspect-ratio: 16 / 9';
  }

  private getMediaDimensions(
    image: MediaAttachment
  ): { width: number; height: number } | undefined {
    const small = image.meta?.small;
    const original = image.meta?.original;
    const width = small?.width ?? original?.width;
    const height = small?.height ?? original?.height;

    if (typeof width === 'number' && typeof height === 'number') {
      return { width, height };
    }

    return undefined;
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
      title: attachment.description || 'Video',
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

  private get gridClass(): string {
    const n = this.images.length;
    if (n === 1) return 'count-1';
    if (n === 2) return 'count-2';
    if (n === 3) return 'count-3';
    if (n === 4) return 'count-4';
    return 'count-many';
  }

  private renderCell(image: MediaAttachment) {
    const dimensions = this.getMediaDimensions(image);
    const cellStyle = this.getCellStyle(image);
    const blurhashUrl = this.blurhashUrls.get(image.id);
    const isSingle = this.images.length === 1;

    if (image.type === 'image') {
      return html`
        <div
          class="media-cell clickable"
          style="${cellStyle}"
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
            width="${ifDefined(
              dimensions ? String(dimensions.width) : undefined
            )}"
            height="${ifDefined(
              dimensions ? String(dimensions.height) : undefined
            )}"
            decoding="async"
          />
        </div>
      `;
    }

    if (image.type === 'video') {
      return html`
        <div class="media-cell" style="${isSingle ? '' : cellStyle}">
          ${blurhashUrl
            ? html`<img
                class="blurhash-canvas"
                src="${blurhashUrl}"
                aria-hidden="true"
              />`
            : null}
          <video
            controls
            preload="${this.getVideoPreloadMode()}"
            poster="${image.preview_url}"
            src="${image.url}"
            width="${ifDefined(
              !isSingle && dimensions ? String(dimensions.width) : undefined
            )}"
            height="${ifDefined(
              !isSingle && dimensions ? String(dimensions.height) : undefined
            )}"
            @loadeddata="${this._handleVideoLoaded}"
            @play="${(e: Event) => this._handleVideoPlay(e, image)}"
            @pause="${this._handleVideoPauseOrEnded}"
            @ended="${this._handleVideoPauseOrEnded}"
            @timeupdate="${this._handleVideoTimeUpdate}"
          ></video>
        </div>
      `;
    }

    if (image.type === 'gifv') {
      return html`
        <div class="media-cell" style="${isSingle ? '' : cellStyle}">
          ${blurhashUrl
            ? html`<img
                class="blurhash-canvas"
                src="${blurhashUrl}"
                aria-hidden="true"
              />`
            : null}
          <video
            ?autoplay="${!this._slowNetwork}"
            ?loop="${!this._slowNetwork}"
            ?controls="${this._slowNetwork}"
            muted
            playsinline
            preload="${this.getVideoPreloadMode()}"
            poster="${image.preview_url}"
            src="${image.url}"
            width="${ifDefined(
              !isSingle && dimensions ? String(dimensions.width) : undefined
            )}"
            height="${ifDefined(
              !isSingle && dimensions ? String(dimensions.height) : undefined
            )}"
            @loadeddata="${this._handleVideoLoaded}"
          ></video>
        </div>
      `;
    }

    if (image.type === 'audio') {
      return html`
        <div class="audio-cell">
          <md-audio-player
            src="${image.url}"
            label="${image.description || msg('Audio')}"
            preload="metadata"
            mediaTitle="${image.description || ''}"
            mediaArtist="${this.mediaArtist}"
            mediaArtwork="${this.mediaArtwork}"
          ></md-audio-player>
        </div>
      `;
    }

    return null;
  }

  render() {
    return html`
      <div class="media-grid ${this.gridClass}">
        ${this.images.map((image) => this.renderCell(image))}
      </div>
    `;
  }
}
