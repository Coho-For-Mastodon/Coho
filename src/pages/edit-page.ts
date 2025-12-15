import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../components/header';
import '../components/edit-account';

@customElement('edit-page')
export class EditPage extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        min-height: 100vh;
        height: 100vh;
        overflow-y: auto;
        background: var(--md-sys-color-surface, #fef7ff);
      }

      @media (prefers-color-scheme: dark) {
        :host {
          background: var(--md-sys-color-surface, #141218);
        }
      }

      main {
        display: block;
        padding-top: 56px;
        padding-bottom: 80px;
        min-height: calc(100vh - 56px);
      }

      @media (max-width: 600px) {
        main {
          padding-top: 48px;
          min-height: calc(100vh - 48px);
        }
      }
    `,
  ];

  render() {
    return html`
      <app-header title="Edit Profile" enableBack></app-header>

      <main>
        <edit-account></edit-account>
      </main>
    `;
  }
}
