import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import '../components/md/md-autocomplete';
import '../components/md/md-button';
import type { AutocompleteOption } from '../components/md/md-autocomplete';

// Dynamic import to avoid loading router during SSR
const getRouter = () => import('../utils/router').then((m) => m.router);

// Lazy load instance search - only loaded when user starts typing
const getInstanceSearch = () => import('../services/instance-search');

// Popular Mastodon instances for initial display (duplicated for initial render without loading service)
const POPULAR_INSTANCES = [
  {
    value: 'mastodon.social',
    label: 'mastodon.social',
    description: 'The original Mastodon server',
  },
  {
    value: 'mastodon.online',
    label: 'mastodon.online',
    description: 'A newer official Mastodon server',
  },
  {
    value: 'mstdn.social',
    label: 'mstdn.social',
    description: 'A general-purpose server',
  },
  {
    value: 'fosstodon.org',
    label: 'fosstodon.org',
    description: 'For Free & Open Source Software enthusiasts',
  },
  {
    value: 'hachyderm.io',
    label: 'hachyderm.io',
    description: 'For tech industry professionals',
  },
  {
    value: 'infosec.exchange',
    label: 'infosec.exchange',
    description: 'For the infosec community',
  },
  {
    value: 'tech.lgbt',
    label: 'tech.lgbt',
    description: 'For LGBTQ+ people in tech',
  },
  {
    value: 'universeodon.com',
    label: 'universeodon.com',
    description: 'A general-purpose server',
  },
  { value: 'mas.to', label: 'mas.to', description: 'A general-purpose server' },
  {
    value: 'social.vivaldi.net',
    label: 'social.vivaldi.net',
    description: 'Vivaldi browser community',
  },
];

@localized()
@customElement('app-login')
export class AppLogin extends LitElement {
  @state() instances: AutocompleteOption[] = POPULAR_INSTANCES;
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

      .background-decoration {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        opacity: 0.3;
        z-index: 0;
        pointer-events: none;
      }

      .login-card {
        max-width: 400px;
        width: 100%;
        z-index: 1;
        padding: 32px;
        background: var(--md-sys-color-surface, #fff);
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      @media (prefers-color-scheme: dark) {
        .login-card {
          background: var(--md-sys-color-surface, #1e1e24);
        }
      }

      .login-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 24px;
      }

      .logo {
        width: 80px;
        height: 80px;
        margin-bottom: 16px;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

  async firstUpdated() {
    // get code and state from url
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    const accessToken = localStorage.getItem('accessToken');

    const server = localStorage.getItem('server');

    const getPostAuthTarget = this.determinePostAuthRedirect();

    if (code && state) {
      const { authToClient } = await import('../services/account');

      await authToClient(code, state);

      const router = await getRouter();
      await router.navigate(getPostAuthTarget());
    } else if (accessToken && server) {
      const router = await getRouter();
      await router.navigate(getPostAuthTarget());
    }

    window.requestIdleCallback(async () => {
      if (this.shadowRoot) {
        const { enableVibrate } = await import('../utils/handle-vibrate');
        enableVibrate(this.shadowRoot);
      }
    });
  }

  private determinePostAuthRedirect() {
    return (): string => {
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

      // Otherwise, prefer the initial launch URL (manifest shortcut / deep link)
      // if it points at /home with intent params.
      try {
        const launchUrl = sessionStorage.getItem('coho:launchUrl') || '';
        if (launchUrl) {
          const launch = new URL(launchUrl, window.location.origin);
          const hasIntent =
            launch.searchParams.has('tab') ||
            launch.searchParams.has('newPost') ||
            launch.searchParams.has('name');

          if (launch.pathname === '/home' && hasIntent) {
            return `${launch.pathname}${launch.search}${launch.hash}`;
          }
        }
      } catch {
        // sessionStorage may be unavailable in some privacy contexts; ignore.
      }

      return '/home';
    };
  }

  async login() {
    let serverURL = this.chosenServer;
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

  handleServerInput(event: Event | CustomEvent<{ value: string }>) {
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
      this.instances = POPULAR_INSTANCES;
      return;
    }

    this._searchDebounceTimer = setTimeout(() => {
      this.doSearchInstances(value);
    }, 300);
  }

  async doSearchInstances(query: string) {
    this.loadingInstances = true;

    try {
      const { searchInstances } = await getInstanceSearch();
      this.instances = await searchInstances(query);
    } catch (error) {
      console.error('Failed to search instances:', error);
      // Fallback to filtering popular instances
      const matchingPopular = POPULAR_INSTANCES.filter((inst) =>
        inst.value.toLowerCase().includes(query.toLowerCase())
      );
      this.instances =
        matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
    } finally {
      this.loadingInstances = false;
    }
  }

  handleServerSelect(event: CustomEvent) {
    this.chosenServer = event.detail.value;
  }

  async joinMastodon() {
    // open https://joinmastodon.org/servers in new tab
    const router = await getRouter();
    router.navigate('/createaccount');
  }

  async explore() {
    const { enterGuestMode } = await import('../services/auth-state');
    enterGuestMode();

    const router = await getRouter();
    router.navigate('/home');
  }

  render() {
    return html`
      <main>
        <div class="background-decoration"></div>

        <div class="login-card">
          <div class="login-header">
            <img
              src="/assets/icons/new-icons/icon-144x144.png"
              alt="Coho Logo"
              class="logo"
            />
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
              @click="${() => this.login()}"
              variant="filled"
              class="login-button"
            >
              ${msg('Login')}
            </md-button>
          </div>

          <div class="login-actions">
            <md-button @click="${() => this.joinMastodon()}" variant="text">
              ${msg('Sign up for Mastodon Account')}
            </md-button>
            <md-button @click="${() => this.explore()}" variant="text">
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
