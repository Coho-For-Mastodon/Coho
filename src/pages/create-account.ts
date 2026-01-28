import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import { getServers } from '../services/account';

import '../components/md/md-dialog.js';
import '../components/md/md-button.js';
import '../components/md/md-badge.js';

interface ServerInfo {
  name: string;
  thumbnail?: string;
  users?: number;
  info: {
    full_description?: string;
    short_description?: string;
    usage?: {
      users?: { total: number };
    };
    categories?: string[];
  };
}

@localized()
@customElement('create-account')
export class CreateAccount extends LitElement {
  @state() servers: ServerInfo[] = [];
  @state() chosenServer: string | undefined = '';
  @state() fullDesc: string | undefined = '';
  @state() registered: boolean = false;

  @state() filledValues: string[] = [];

  static styles = [
    css`
      :host {
        display: block;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      main {
        padding: 10px;
        padding-top: 60px;

        overflow-y: auto;
        height: 88vh;
        max-width: var(--layout-max-width, 1200px);
        margin: 0 auto;
      }

      main ul {
        list-style: none;
        margin: 0;
        padding: 0;

        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      }

      li {
        background: #ffffff12;
        border-radius: 10px;
        padding: 10px;
      }

      li img {
        width: 100%;
        border-radius: 10px;
        height: 160px;
        object-fit: cover;
        display: block;
      }

      li .info {
        overflow: hidden;
        margin-top: 12px;
        height: 22ch;
      }

      li .name {
        font-size: var(--md-sys-typescale-title-large-font-size);
        font-weight: bold;
        display: block;
        margin-top: 6px;
      }

      #inputs {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 2em;
      }

      md-button {
        width: 100%;
      }

      @media (prefers-color-scheme: dark) {
        md-text-area::part(textarea),
        md-button[variant='outlined']::part(control) {
          background: #1e1e1e;
          color: white;
        }
      }

      @media (prefers-color-scheme: light) {
        li {
          background: rgb(0 0 0 / 7%);
        }
      }
    `,
  ];

  protected async firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ) {
    const servers = await getServers();
    console.log('servers', servers);

    this.servers = servers.instances;
  }

  startRegister(serverInfo: ServerInfo) {
    this.chosenServer = serverInfo.name;
    this.fullDesc = serverInfo.info.full_description;
    const dialog = this.shadowRoot?.querySelector('#create-dialog');
    // @ts-expect-error - Fluent UI dialog show() method not in base Element types
    dialog?.show();
  }

  async doRegister() {
    this.registered = true;

    const createDialog = this.shadowRoot?.querySelector('#create-dialog');
    // @ts-expect-error - Fluent UI dialog hide() method not in base Element types
    await createDialog?.hide();

    console.log('this.chosenServer', this.chosenServer);
    window.open(`https://${this.chosenServer}/auth/sign_up`, '_blank');
  }

  registerInputChange(id: string) {
    this.filledValues.push(id);

    console.log('filledValues', this.filledValues);

    if (
      this.filledValues.includes('username') &&
      this.filledValues.includes('password') &&
      this.filledValues.includes('email')
    ) {
      const button = this.shadowRoot?.querySelector('md-button') as HTMLElement;
      button.removeAttribute('disabled');
    }
  }

  render() {
    return html`
      <app-header ?enableBack=${true}></app-header>

      <md-dialog id="create-dialog" .label="${msg('Create Account')}">
        <span .innerHTML="${this.fullDesc || ''}"></span>

        <md-button
          @click="${() => this.doRegister()}"
          slot="footer"
          variant="filled"
          >${msg('Go Create An Account')}</md-button
        >
      </md-dialog>

      <md-dialog id="registered-dialog" .label="${msg('Account Created')}">
        <p>
          ${msg(
            'A confirmation email has been sent to the provided email address, please click the link in the email to confirm your account'
          )}
        </p>

        <md-button variant="filled"
          >${msg('Account Confirmed, Login')}</md-button
        >
      </md-dialog>

      <main>
        <h1>${msg('Create Account')}</h1>
        <p>
          ${msg(
            'Mastodon is a decentralized social network that allows users to create and join communities of their interest. To use Mastodon, you need to choose a server that hosts your account and connects you to other servers. Choosing a server is an important decision, as it affects your privacy, moderation, and content policies. You can browse the list of servers below to find one that suits your needs and preferences. Once you have created an account at your chosen server, come back to Otter and login to start using Otter as your Mastodon client.'
          )}
        </p>

        <ul>
          ${this.servers.map((server) => {
            return html`
              <li>
                <img
                  src="${server.thumbnail || ''}"
                  alt="${server.name} thumbnail"
                />
                <div class="info">
                  <div class="tags">
                    <md-badge apperance="accent"
                      >${msg(str`${server.users} users`)}</md-badge
                    >
                  </div>
                  <span class="name">${server.name}</span>

                  <p>
                    ${server.info.short_description || msg('No Description...')}
                  </p>
                </div>

                <md-button @click="${() => this.startRegister(server)}"
                  >${msg('Create Account')}</md-button
                >
              </li>
            `;
          })}
        </ul>
      </main>
    `;
  }
}
