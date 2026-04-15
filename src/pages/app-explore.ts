import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getPreviewTimeline } from '../services/timeline';

import '../components/preview-timeline';
import '../components/md/md-text-field';
import type { Post } from '../interfaces/Post';

@localized()
@customElement('app-explore')
export class AppExplore extends LitElement {
  @state() timeline: Post[] = [];

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: auto;
        height: 100vh;
        scrollbar-width: none;
      }

      p {
        color: rgb(169, 169, 169);
      }

      main {
        padding-top: calc(60px + env(safe-area-inset-top, 0px));
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 10px;
        padding-left: 0px;
        padding-right: 0px;
        max-width: var(--layout-max-width, 1200px);
        margin: 0 auto;
      }

      #sign-up-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        height: fit-content;
        background: #202023;
        border-radius: var(--md-sys-shape-corner-small);
        width: 94%;
        margin-bottom: 22px;
      }

      h2 {
        margin-top: 0;
      }

      #sign-up-block p {
        margin-top: 0;
        color: darkgrey;
      }

      #sign-up-block #login-button {
        margin-top: 6px;
      }

      @media (max-width: 820px) {
        main {
          grid-template-columns: 1fr;
          display: flex;
          flex-direction: column-reverse;
          padding-left: 0;
          padding-right: 0;
        }
      }

      @media (prefers-color-scheme: dark) {
        md-button {
          color: white;
        }
      }

      @media (prefers-color-scheme: light) {
        md-button {
          color: black;
        }

        #sign-up-block {
          background: #f3f3f3;
        }
      }
    `,
  ];

  async firstUpdated() {
    const data = await getPreviewTimeline();

    this.timeline = data;
  }

  async login() {
    let serverURL =
      (
        this.shadowRoot!.querySelector(
          '#server-input'
        ) as HTMLInputElement | null
      )?.value ?? '';
    if (serverURL.length > 0) {
      if (serverURL.includes('https://')) {
        // remove https://
        serverURL = serverURL.replace('https://', '');
      }

      try {
        const { initAuth } = await import('../services/account');
        await initAuth(serverURL);
      } catch (err) {
        console.error(err);
      }
    }
  }

  signup() {
    window.open('https://joinmastodon.org/servers', '_blank');
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <div>
          <preview-timeline></preview-timeline>
        </div>

        <div>
          <div id="sign-up-block">
            <p>
              ${msg(
                'Already have an account? Log in to your server. Otherwise, sign up for a account to follow people, like posts, and more!'
              )}
            </p>
            <md-text-field
              id="server-input"
              placeholder="https://tech.lgbt"
              pill
            ></md-text-field>
            <md-button id="login-button" variant="filled" @click="${this.login}"
              >${msg('Login')}</md-button
            >
            <md-button variant="outlined" @click="${this.signup}"
              >${msg('Sign up')}</md-button
            >
          </div>

          <div>
            <strong>${msg('What is this?')}</strong>
            <p>
              ${msg(
                'Coho is a Mastodon client that is built with web technologies. It is a progressive web app, which means you can install it on your phone or desktop. It is also open source, and can be found on GitHub.'
              )}
            </p>
          </div>
        </div>
      </main>
    `;
  }
}
