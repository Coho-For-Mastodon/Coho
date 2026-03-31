import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import {
  searchInstances,
  POPULAR_INSTANCES,
} from '../services/instance-search';
import type { AutocompleteOption } from '../components/md/md-autocomplete';
import type { Instance } from '../mastodon/types/instance';

import '../components/md/md-autocomplete';
import '../components/md/md-button.js';
import '../components/md/md-dialog.js';
import type { MdDialog } from '../components/md/md-dialog.js';

const getRouter = () => import('../router/routes').then((m) => m.router);

@localized()
@customElement('create-account')
export class CreateAccount extends LitElement {
  @state() private instances: AutocompleteOption[] = POPULAR_INSTANCES;
  @state() private chosenServer = '';
  @state() private loadingInstances = false;
  @state() private instanceInfo: Instance | null = null;
  @state() private loadingInfo = false;
  @state() private instanceError = '';
  @state() private signupStarted = false;

  @query('md-dialog') private _dialog!: MdDialog;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _fetchController: AbortController | null = null;

  static styles = [
    css`
      :host {
        display: block;
        --md-sys-color-surface-container: #f0f4f8;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --md-sys-color-surface-container: #1a1c1e;
        }
      }

      main {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        width: 100%;
        background-color: var(--md-sys-color-surface-container);
        padding: 20px;
        padding-top: calc(80px + env(safe-area-inset-top, 0px));
        box-sizing: border-box;
      }

      .card {
        max-width: 460px;
        width: 100%;
        z-index: 2;
        padding: 32px;
      }

      .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 24px;
      }

      h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
        color: var(--md-sys-color-on-surface);
      }

      .subtitle {
        margin: 8px 0 0;
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
        line-height: 1.5;
      }

      .search-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .search-section md-autocomplete {
        width: 100%;
      }

      .instance-stats {
        font-size: 13px;
        color: var(--md-sys-color-on-surface-variant);
        margin: 0 0 12px;
      }

      .instance-description {
        font-size: 14px;
        color: var(--md-sys-color-on-surface);
        line-height: 1.5;
        margin: 0 0 16px;
      }

      .instance-rules {
        margin: 0 0 16px;
      }

      .instance-rules h3 {
        font-size: 14px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface);
        margin: 0 0 8px;
      }

      .instance-rules ol {
        margin: 0;
        padding-left: 20px;
      }

      .instance-rules li {
        font-size: 13px;
        color: var(--md-sys-color-on-surface-variant);
        line-height: 1.5;
        margin-bottom: 4px;
      }

      .registration-closed {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: var(--md-sys-shape-corner-small, 8px);
        background: color-mix(
          in srgb,
          var(--md-sys-color-error, #b3261e) 12%,
          transparent
        );
        color: var(--md-sys-color-error, #b3261e);
        font-size: 14px;
        font-weight: 500;
      }

      .approval-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: var(--md-sys-shape-corner-small, 8px);
        background: color-mix(
          in srgb,
          var(--md-sys-color-tertiary, #7d5260) 12%,
          transparent
        );
        color: var(--md-sys-color-tertiary, #7d5260);
        font-size: 14px;
        margin-bottom: 12px;
      }

      .error-message {
        color: var(--md-sys-color-error, #b3261e);
        font-size: 14px;
        text-align: center;
      }

      .post-signup {
        text-align: center;
        padding: 24px 0;
      }

      .post-signup h2 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 500;
        color: var(--md-sys-color-on-surface);
      }

      .post-signup p {
        margin: 0 0 20px;
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
        line-height: 1.5;
      }

      .post-signup md-button {
        --md-button-height: 48px;
      }

      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }

      @media (max-width: 820px) {
        .card {
          box-shadow: none;
          background: transparent;
          border: none;
        }
      }
    `,
  ];

  async handleServerInput(event: Event | CustomEvent<{ value: string }>) {
    const value =
      (event as CustomEvent<{ value: string }>).detail?.value ||
      (event.target as HTMLInputElement)?.value ||
      '';
    this.chosenServer = value;
    this.instanceInfo = null;
    this.instanceError = '';

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    if (value.length < 2) {
      this.instances = POPULAR_INSTANCES;
      return;
    }

    this._searchDebounceTimer = setTimeout(() => {
      this.doSearchInstances(value);
    }, 300);
  }

  private doSearchInstances = async (query: string) => {
    this.loadingInstances = true;
    try {
      this.instances = [
        ...(await searchInstances(query)),
        ...POPULAR_INSTANCES,
      ];
    } catch {
      this.instances = POPULAR_INSTANCES;
    } finally {
      this.loadingInstances = false;
    }
  };

  async handleServerSelect(event: CustomEvent) {
    const server = event.detail.value;
    this.chosenServer = server;
    await this.fetchInstanceInfo(server);
  }

  private async fetchInstanceInfo(server: string) {
    // Abort any in-flight request
    this._fetchController?.abort();
    this._fetchController = new AbortController();

    this.loadingInfo = true;
    this.instanceInfo = null;
    this.instanceError = '';

    try {
      const url = new URL(`https://${server}/api/v1/instance`);
      const response = await fetch(url.href, {
        signal: this._fetchController.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch instance info`);
      }
      this.instanceInfo = await response.json();

      await this.updateComplete;
      this._dialog?.show();
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
      this.instanceError = msg(
        'Could not fetch server information. Please check the server name and try again.'
      );
    } finally {
      this.loadingInfo = false;
    }
  }

  private async openSignup() {
    if (this.chosenServer) {
      window.open(`https://${this.chosenServer}/auth/sign_up`, '_blank');

      // Close dialog and show post-signup state
      await this._dialog?.hide();
      this.signupStarted = true;
    }
  }

  private async goToLogin() {
    const router = await getRouter();
    router.navigate('/');
  }

  private renderDialogContent() {
    if (!this.instanceInfo) return null;

    const info = this.instanceInfo;
    const registrationsOpen = info.registrations;
    const approvalRequired = info.approval_required;

    return html`
      <p class="instance-stats">
        ${info.stats.user_count.toLocaleString()} ${msg('users')} ·
        ${info.stats.status_count.toLocaleString()} ${msg('posts')} ·
        ${info.stats.domain_count.toLocaleString()} ${msg('connected servers')}
      </p>

      ${info.short_description
        ? html`<p class="instance-description">${info.short_description}</p>`
        : info.description
          ? html`<p class="instance-description">${info.description}</p>`
          : null}
      ${info.rules && info.rules.length > 0
        ? html`
            <div class="instance-rules">
              <h3>${msg('Server Rules')}</h3>
              <ol>
                ${info.rules.map((rule) => html`<li>${rule.text}</li>`)}
              </ol>
            </div>
          `
        : null}
      ${!registrationsOpen
        ? html`<div class="registration-closed">
            ${msg('This server is not accepting new registrations.')}
          </div>`
        : html`
            ${approvalRequired
              ? html`<div class="approval-notice">
                  ${msg('This server requires admin approval after sign-up.')}
                </div>`
              : null}
          `}
    `;
  }

  render() {
    return html`
      <app-header ?enableBack=${true}></app-header>

      <md-dialog .label="${this.instanceInfo?.title || ''}">
        ${this.renderDialogContent()}
        ${this.instanceInfo?.registrations
          ? html`
              <md-button
                slot="footer"
                variant="filled"
                @click="${this.openSignup}"
              >
                ${msg('Create Account on')} ${this.instanceInfo.title}
              </md-button>
            `
          : null}
      </md-dialog>

      <main>
        <div class="card">
          ${this.signupStarted
            ? html`
                <div class="post-signup">
                  <h2>${msg('Almost there!')}</h2>
                  <p>
                    ${msg(
                      "Once you've finished creating your account and confirmed your email, come back here to log in."
                    )}
                  </p>
                  <md-button variant="filled" @click="${this.goToLogin}">
                    ${msg('Login')}
                  </md-button>
                </div>
              `
            : html`
                <div class="header">
                  <h1>${msg('Create Account')}</h1>
                  <p class="subtitle">
                    ${msg(
                      'Choose a Mastodon server to create your account. Each server is independently operated with its own rules and community. After signing up, you can follow anyone on any server.'
                    )}
                  </p>
                </div>

                <div class="search-section">
                  <md-autocomplete
                    .placeholder="${msg(
                      'Search for a server (e.g. mastodon.social)'
                    )}"
                    .value="${this.chosenServer}"
                    .options="${this.instances}"
                    .loading="${this.loadingInstances}"
                    @input="${this.handleServerInput}"
                    @select="${this.handleServerSelect}"
                  ></md-autocomplete>

                  ${this.loadingInfo
                    ? html`<md-button variant="tonal" disabled>
                        ${msg('Loading server info...')}
                      </md-button>`
                    : null}
                  ${this.instanceError
                    ? html`<p class="error-message">${this.instanceError}</p>`
                    : null}
                </div>

                <div class="actions">
                  <md-button @click="${this.goToLogin}" variant="text">
                    ${msg('Already have an account? Login')}
                  </md-button>
                </div>
              `}
        </div>
      </main>
    `;
  }
}
