import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getAllMedia } from '../services/media';

import '../components/header';

@customElement('app-media')
export class AppMedia extends LitElement {
  @state() media: File[] = [];

  private _mediaObjectUrls = new Map<File, string>();

  static styles = [
    css`
      :host {
        display: block;
      }

      main {
        padding-top: calc(60px + env(safe-area-inset-top, 0px));
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
        overflow-y: scroll;
        overflow-x: hidden;
        height: 90vh;

        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        grid-auto-rows: max-content;
        gap: 8px;
      }

      li {
        height: 260px;
      }

      li img {
        width: 100%;
        border-radius: var(--md-sys-shape-corner-small);
        height: 100%;
        object-fit: cover;
      }

      @media (min-width: 768px) {
        ul {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          grid-auto-rows: max-content;
          gap: 8px;
        }
      }
    `,
  ];

  async firstUpdated() {
    const files = await getAllMedia();

    this.media = files;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('media')) {
      this._syncObjectUrlsForCurrentMedia();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._revokeAllObjectUrls();
  }

  private _getObjectUrl(file: File): string {
    const existing = this._mediaObjectUrls.get(file);
    if (existing) {
      return existing;
    }

    const url = URL.createObjectURL(file);
    this._mediaObjectUrls.set(file, url);
    return url;
  }

  private _syncObjectUrlsForCurrentMedia() {
    const activeFiles = new Set(this.media);
    for (const [file, url] of this._mediaObjectUrls.entries()) {
      if (!activeFiles.has(file)) {
        URL.revokeObjectURL(url);
        this._mediaObjectUrls.delete(file);
      }
    }
  }

  private _revokeAllObjectUrls() {
    for (const url of this._mediaObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this._mediaObjectUrls.clear();
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <ul>
          ${this.media.map((file) => {
            return html`<li>
              <img src="${this._getObjectUrl(file)}" alt="${file.name}" />
            </li>`;
          })}
        </ul>
      </main>
    `;
  }
}
