import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getPreviewTimeline } from '../services/timeline';

import '../components/preview-timeline';
import '../components/md/md-text-field';
import type { Post } from '../interfaces/Post';

@customElement('app-explore')
export class AppExplore extends LitElement {
  @state() timeline: Post[] = [];

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
        height: 100vh;
      }

      p {
        color: rgb(169, 169, 169);
      }

      main {
        padding-top: 60px;
        display: grid;
        grid-template-columns: 67vw 30vw;
        gap: 10px;
        padding-left: 10px;
        padding-right: 10px;
      }

      #sign-up-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        height: fit-content;
        background: #202023;
        border-radius: 6px;
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
    console.log('first updated');

    const data = await getPreviewTimeline();
    console.log(data);

    this.timeline = data;
  }

  async login() {
    let serverURL = (this.shadowRoot!.querySelector('#server-input') as HTMLInputElement | null)
      ?.value ?? '';
    if (serverURL.length > 0) {
      if (serverURL.includes('https://')) {
        // remove https://
        serverURL = serverURL.replace('https://', '');
      }

      try {
        const { initAuth } = await import('../services/account');
        await initAuth(serverURL);

        // (window as any).appInsights.setAuthenticatedUserContext(validatedId);
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
              Already have an account? Log in to your server. Otherwise, sign up
              for a account to follow people, like posts, and more!
            </p>
            <md-text-field
              id="server-input"
              placeholder="https://tech.lgbt"
              pill
            ></md-text-field>
            <md-button id="login-button" variant="filled" @click="${this.login}"
              >Login</md-button
            >
            <md-button variant="outlined" @click="${this.signup}"
              >Sign up</md-button
            >
          </div>

          <div>
            <strong>What is this?</strong>
            <p>
              Otter is a <a href="https://joinmastodon.org">Mastodon</a> client
              that is built with web technologies. It is a
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps"
                >progressive web app</a
              >, which means you can install it on your phone or desktop. It is
              also open source, and can be found on
              <a href="https://github.com/jgw96/mammoth-app">GitHub</a>.
            </p>
          </div>
        </div>
      </main>
    `;
  }
}
