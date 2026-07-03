import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { mdSharedStyles } from './md-shared-styles';
import {
  updateMediaSession,
  clearMediaSession,
  updateMediaSessionPosition,
} from '../../utils/media-session';
import './md-icon';

/**
 * Material Design 3 Audio Player Component
 *
 * A custom audio player styled with MD3 design tokens.
 * Replaces the native `<audio>` element with a consistent,
 * accessible, and themed player.
 *
 * @fires play - Dispatched when playback starts
 * @fires pause - Dispatched when playback is paused
 * @fires ended - Dispatched when playback ends
 * @fires md-audio-player-error - Dispatched when playback fails to start; `event.detail` contains the underlying error (for example, the rejected value from `audio.play()`)
 */
@localized()
@customElement('md-audio-player')
export class MdAudioPlayer extends LitElement {
  /** The URL of the audio source */
  @property({ type: String }) src = '';

  /** Accessible label for the player */
  @property({ type: String }) label = '';

  /** Preload behavior */
  @property({ type: String }) preload: 'none' | 'metadata' | 'auto' =
    'metadata';

  /** Title shown in OS media controls */
  @property({ type: String }) mediaTitle = '';

  /** Artist shown in OS media controls */
  @property({ type: String }) mediaArtist = '';

  /** Artwork URL shown in OS media controls */
  @property({ type: String }) mediaArtwork = '';

  @state() private _playing = false;
  @state() private _currentTime = 0;
  @state() private _duration = 0;
  @state() private _loading = true;

  private _audio: HTMLAudioElement | null = null;
  private _animationFrame = 0;

  static styles = [
    mdSharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .player {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: var(--md-sys-shape-corner-large, 16px);
        background: var(
          --md-sys-color-surface-container,
          rgba(255, 255, 255, 0.08)
        );
        color: var(--md-sys-color-on-surface, rgba(255, 255, 255, 0.9));
      }

      .play-button {
        -webkit-tap-highlight-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        min-width: 40px;
        border: none;
        border-radius: 50%;
        background: var(--md-sys-color-primary, var(--sl-color-primary-600));
        color: var(--md-sys-color-on-primary, white);
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
        outline: none;
      }

      .play-button:hover {
        /* no shadow */
        filter: brightness(0.92);
      }

      .play-button:active {
        opacity: 0.7;
      }

      .play-button:focus-visible {
        outline: 2px solid
          var(--md-sys-color-primary, var(--sl-color-primary-600));
        outline-offset: 2px;
      }

      .play-button md-icon {
        color: var(--md-sys-color-on-primary, white);
      }

      .track {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .progress-container {
        position: relative;
        width: 100%;
        height: 20px;
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      .progress-track {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(
          --md-sys-color-surface-variant,
          rgba(255, 255, 255, 0.12)
        );
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        border-radius: 2px;
        background: var(--md-sys-color-primary, var(--sl-color-primary-600));
        transition: width 0.1s linear;
      }

      .progress-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
      }

      .progress-container:focus-within .progress-track {
        outline: 2px solid
          var(--md-sys-color-primary, var(--sl-color-primary-600));
        outline-offset: 2px;
        border-radius: 4px;
      }

      .time {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 500;
        color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
        letter-spacing: 0.4px;
        user-select: none;
      }

      /* Light mode */
      @media (prefers-color-scheme: light) {
        .player {
          background: var(
            --md-sys-color-surface-container,
            rgba(0, 0, 0, 0.05)
          );
          color: var(--md-sys-color-on-surface, rgba(0, 0, 0, 0.87));
        }

        .progress-track {
          background: var(--md-sys-color-surface-variant, rgba(0, 0, 0, 0.08));
        }

        .time {
          color: var(--md-sys-color-on-surface-variant, rgba(0, 0, 0, 0.6));
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._createAudio();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._destroyAudio();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('src') && this._audio) {
      this._audio.src = this.src;
      this._audio.load();
      this._playing = false;
      this._currentTime = 0;
      this._duration = 0;
      this._loading = true;
    }

    if (changedProperties.has('preload') && this._audio) {
      this._audio.preload = this.preload;
      // If preload has been increased and a source is set, ensure
      // the browser re-evaluates buffering behavior.
      if (this.preload !== 'none' && this._audio.src) {
        this._audio.load();
      }
    }
  }

  private _createAudio() {
    this._audio = new Audio();
    this._audio.preload = this.preload;
    this._audio.src = this.src;

    this._audio.addEventListener('loadedmetadata', this._onLoadedMetadata);
    this._audio.addEventListener('ended', this._onEnded);
    this._audio.addEventListener('error', this._onError);
  }

  private _destroyAudio() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    if (this._audio) {
      this._audio.pause();
      this._audio.removeEventListener('loadedmetadata', this._onLoadedMetadata);
      this._audio.removeEventListener('ended', this._onEnded);
      this._audio.removeEventListener('error', this._onError);
      this._audio.src = '';
      this._audio = null;
    }
  }

  private _onLoadedMetadata = () => {
    if (this._audio) {
      this._duration = this._audio.duration;
      this._loading = false;
    }
  };

  private _onEnded = () => {
    this._playing = false;
    this._currentTime = 0;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    clearMediaSession();
    this.dispatchEvent(new Event('ended', { bubbles: true, composed: true }));
  };

  private _onError = () => {
    this._loading = false;
    this._playing = false;
  };

  private _updateProgress = () => {
    if (this._audio && this._playing) {
      this._currentTime = this._audio.currentTime;
      updateMediaSessionPosition(this._currentTime, this._duration);
      this._animationFrame = requestAnimationFrame(this._updateProgress);
    }
  };

  private async _togglePlay() {
    if (!this._audio) return;

    if (this._playing) {
      this._audio.pause();
      this._playing = false;
      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
      }
      clearMediaSession();
      this.dispatchEvent(new Event('pause', { bubbles: true, composed: true }));
    } else {
      try {
        await this._audio.play();
        this._playing = true;
        this._setupMediaSession();
        this._updateProgress();
        this.dispatchEvent(
          new Event('play', { bubbles: true, composed: true })
        );
      } catch (err) {
        // Play was prevented (e.g., autoplay policy)
        this.dispatchEvent(
          new CustomEvent('md-audio-player-error', {
            bubbles: true,
            composed: true,
            detail: { error: err },
          })
        );
      }
    }
  }

  private _setupMediaSession() {
    if (!this._audio) return;
    const audio = this._audio;
    updateMediaSession({
      title: this.mediaTitle || this.label || msg('Audio'),
      artist: this.mediaArtist,
      artwork: this.mediaArtwork || undefined,
      onPlay: () => {
        audio.play().catch(() => {});
        this._playing = true;
        this._updateProgress();
      },
      onPause: () => {
        audio.pause();
        this._playing = false;
        if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
      },
      onStop: () => {
        audio.pause();
        audio.currentTime = 0;
        this._playing = false;
        this._currentTime = 0;
        if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
        clearMediaSession();
      },
      onSeekTo: (time: number) => {
        audio.currentTime = time;
        this._currentTime = time;
      },
    });
    updateMediaSessionPosition(this._currentTime, this._duration);
  }

  private _onSeek(e: Event) {
    const input = e.target as HTMLInputElement;
    const time = parseFloat(input.value);
    if (this._audio && isFinite(time)) {
      this._audio.currentTime = time;
      this._currentTime = time;
    }
  }

  private _formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    const progressPercent =
      this._duration > 0 ? (this._currentTime / this._duration) * 100 : 0;

    return html`
      <div
        class="player"
        role="region"
        aria-label="${this.label || msg('Audio player')}"
      >
        <button
          class="play-button"
          @click=${this._togglePlay}
          aria-label="${this._playing ? msg('Pause') : msg('Play')}"
        >
          <md-icon
            name="${this._playing ? 'pause' : 'play'}"
            size="20px"
          ></md-icon>
        </button>

        <div class="track">
          <div class="progress-container">
            <div class="progress-track">
              <div
                class="progress-fill"
                style="width: ${progressPercent}%"
              ></div>
            </div>
            <input
              class="progress-input"
              type="range"
              min="0"
              max="${this._duration || 0}"
              step="0.1"
              .value="${String(this._currentTime)}"
              @input=${this._onSeek}
              aria-label="${msg('Seek')}"
              aria-valuemin="0"
              aria-valuemax="${this._duration || 0}"
              aria-valuenow="${this._currentTime}"
              aria-valuetext="${this._formatTime(
                this._currentTime
              )} of ${this._formatTime(this._duration)}"
            />
          </div>
          <div class="time">
            <span>${this._formatTime(this._currentTime)}</span>
            <span
              >${
                this._loading ? '-:--' : this._formatTime(this._duration)
              }</span
            >
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-audio-player': MdAudioPlayer;
  }
}
