import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import '../components/md/md-autocomplete';
import '../components/md/md-button';
import type { AutocompleteOption } from '../components/md/md-autocomplete';

// Dynamic import to avoid loading router during SSR
const getRouter = () => import('../router/routes').then((m) => m.router);

@localized()
@customElement('app-login')
export class AppLogin extends LitElement {
  @state() instances: AutocompleteOption[] = [];
  @state() chosenServer: string = '';
  @state() loadingInstances: boolean = false;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        background-color: var(--md-sys-color-surface-container);
        padding: 20px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }

      .login-card {
        max-width: 400px;
        width: 100%;
        z-index: 2;
        padding: 32px;
      }

      .login-header {
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
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
        align-items: center;
      }

      md-text-field {
        width: 100%;
      }

      .login-button {
        --md-button-height: 48px;
      }

      .login-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }

      .app-footer {
        margin-top: 24px;
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant);
        z-index: 1;
        text-align: center;
      }

      .app-footer a {
        color: inherit;
        text-decoration: none;
      }

      .app-footer a:hover {
        text-decoration: underline;
      }

      @media (max-width: 820px) {
        .login-card {
          box-shadow: none;
          background: transparent;
          border: none;
        }

        main {
          justify-content: flex-start;
          padding-top: 40px;
        }
      }
    `,
  ];

  firstUpdated() {
    requestIdleCallback(
      async () => {
        // get code and state from url
        await this.init();
      },
      {
        timeout: 8000,
      }
    );

    requestIdleCallback(
      async () => {
        if (this.shadowRoot) {
          const { enableVibrate } = await import('../utils/handle-vibrate');
          enableVibrate(this.shadowRoot);
        }
      },
      {
        timeout: 8000,
      }
    );
  }

  private async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    const accessToken = localStorage.getItem('accessToken');
    const server = localStorage.getItem('server');

    if (code && state) {
      const { authToClient } = await import('../services/account');
      await authToClient(code, state);
      const router = await getRouter();
      await router.navigate(await this.getPostAuthRedirect());
    } else if (accessToken && server) {
      const router = await getRouter();
      await router.navigate(await this.getPostAuthRedirect());
    }
  }

  private async getPostAuthRedirect(): Promise<string> {
    // If the current URL already carries an intent (rare, but possible),
    // preserve it when we redirect to /home.
    const currentParams = new URLSearchParams(window.location.search);
    if (
      currentParams.has('tab') ||
      currentParams.has('newPost') ||
      currentParams.has('name')
    ) {
      return `/home${window.location.search}${window.location.hash}`;
    }

    const { consumeAuthRedirect } = await import('../utils/auth-redirect');

    // Check for stored redirect from before OAuth flow started
    const storedRedirect = consumeAuthRedirect();
    if (storedRedirect) {
      return storedRedirect;
    }

    return '/home';
  }

  private login = async () => {
    let serverURL = this.chosenServer;
    if (serverURL.length > 0) {
      if (serverURL.includes('https://')) {
        serverURL = serverURL.replace('https://', '');
      }
      try {
        const { initAuth } = await import('../services/account');
        await initAuth(serverURL);
      } catch (err) {
        console.error(err);
      }
    }
  };

  async handleServerInput(event: Event | CustomEvent<{ value: string }>) {
    const value =
      (event as CustomEvent<{ value: string }>).detail?.value ||
      (event.target as HTMLInputElement)?.value ||
      '';
    this.chosenServer = value;

    // Debounce the search
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    if (value.length < 2) {
      // Show popular instances when input is short
      const { POPULAR_INSTANCES } = await import('../services/instance-search');
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
      const { searchInstances, POPULAR_INSTANCES } =
        await import('../services/instance-search');
      this.instances = [
        ...(await searchInstances(query)),
        ...POPULAR_INSTANCES,
      ];
    } catch (error) {
      console.error('Failed to search instances:', error);
      const { POPULAR_INSTANCES } = await import('../services/instance-search');
      this.instances = POPULAR_INSTANCES;
    } finally {
      this.loadingInstances = false;
    }
  };

  handleServerSelect(event: CustomEvent) {
    this.chosenServer = event.detail.value;
  }

  private joinMastodon = async () => {
    const router = await getRouter();
    router.navigate('/createaccount');
  };

  private explore = async () => {
    const { enterGuestMode } = await import('../services/auth-state');
    enterGuestMode();
    const router = await getRouter();
    router.navigate('/home');
  };

  render() {
    return html`
      <main>
        <div class="login-card">
          <div class="login-header">
            <h1>${msg('Welcome to Coho')}</h1>
            <p class="subtitle">${msg('Your modern Mastodon client')}</p>
          </div>

          <div class="login-form">
            <md-autocomplete
              .placeholder="${msg(
                'Search for your server (e.g. mastodon.social)'
              )}"
              .value="${this.chosenServer}"
              .options="${this.instances}"
              .loading="${this.loadingInstances}"
              @input="${this.handleServerInput}"
              @select="${this.handleServerSelect}"
            >
            </md-autocomplete>

            <md-button
              @click="${this.login}"
              variant="filled"
              class="login-button"
            >
              ${msg('Login')}
            </md-button>
          </div>

          <div class="login-actions">
            <md-button @click="${this.joinMastodon}" variant="text">
              ${msg('Sign up for Mastodon Account')}
            </md-button>
            <md-button @click="${this.explore}" variant="text">
              ${msg('Try Coho without an account')}
            </md-button>
          </div>
        </div>

        <div class="app-footer">
          <a href="https://github.com/jgw96/mammoth-app#readme" target="_blank">
            ${msg('Learn More about Coho')}
          </a>
          <p style="opacity: 0.5; margin-top: 8px;">
            ${msg('Build:')} ${new Date(__APP_VERSION__).toLocaleString()}
          </p>
        </div>
      </main>
    `;
  }
}
