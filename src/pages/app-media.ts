import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getAllMedia } from '../services/media';

import '../components/header';

@customElement('app-media')
export class AppMedia extends LitElement {
  @state() media: File[] = [];

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

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <ul>
          ${this.media.map((file) => {
            return html`<li>
              <img src="${URL.createObjectURL(file)}" alt="${file.name}" />
            </li>`;
          })}
        </ul>
      </main>
    `;
  }
}
