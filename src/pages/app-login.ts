import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '../components/md/md-autocomplete';
import '../components/md/md-button';
import '../components/md/md-card';
import type { AutocompleteOption } from '../components/md/md-autocomplete';
import type { MdDialog } from '../components/md/md-dialog';

// Dynamic import to avoid loading router during SSR
const getRouter = () => import('../utils/router').then((m) => m.router);

// Popular Mastodon instances for fallback/initial suggestions
const POPULAR_INSTANCES: AutocompleteOption[] = [
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

let scrollWidth: number = 0;

@customElement('app-login')
export class AppLogin extends LitElement {
  @state() loadIntro: boolean = false;
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

      md-card {
        max-width: 400px;
        width: 100%;
        z-index: 1;
        --md-card-padding: 32px;
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
      }

      .app-footer a {
        color: inherit;
        text-decoration: none;
      }

      .app-footer a:hover {
        text-decoration: underline;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      md-dialog::part(panel) {
        backdrop-filter: blur(80px);
        width: min(600px, 90vw);
        max-height: 85vh;
      }

      md-dialog a {
        color: var(--sl-color-primary-600);
      }

      #intro-carousel {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        gap: 0;
        width: 100%;
      }

      .scroll-item {
        flex: 0 0 100%;
        scroll-snap-align: center;
        padding: 0 4px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }

      .scroll-item md-button {
        align-self: center;
        margin-top: 16px;
      }

      @media (max-width: 820px) {
        md-card {
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

    if (code && state) {
      const { authToClient } = await import('../services/account');

      await authToClient(code, state);

      const router = await getRouter();
      await router.navigate('/home');
    } else if (accessToken && server) {
      const router = await getRouter();
      await router.navigate('/home');
    }

    window.requestIdleCallback(async () => {
      if (this.shadowRoot) {
        const { enableVibrate } = await import('../utils/handle-vibrate');
        enableVibrate(this.shadowRoot);
      }
    });
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

  async openIntro() {
    await import('../components/md/md-dialog.js');
    this.loadIntro = true;

    await this.updateComplete;

    const dialog = this.shadowRoot?.querySelector('md-dialog') as MdDialog | null;

    dialog?.show();
  }

  scrollToItem(scroller: Element, width: number) {
    const newWidth = scrollWidth + width;
    scrollWidth = newWidth;

    scroller.scrollTo({
      top: 0,
      left: newWidth,
      behavior: 'smooth',
    });
  }

  next() {
    const scroller = this.shadowRoot?.querySelector('#intro-carousel');

    if (scroller) {
      this.scrollToItem(scroller, 1000);
    }
  }

  async getStarted() {
    const dialog = this.shadowRoot?.querySelector('md-dialog') as MdDialog | null;
    await dialog?.hide();

    scrollWidth = 0;
  }

  handleServerInput(event: Event | CustomEvent<{ value: string }>) {
    const value = (event as CustomEvent<{ value: string }>).detail?.value || (event.target as HTMLInputElement)?.value || '';
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
      this.searchInstances(value);
    }, 300);
  }

  async searchInstances(query: string) {
    this.loadingInstances = true;

    try {
      // First, filter popular instances that match
      const matchingPopular = POPULAR_INSTANCES.filter((inst) =>
        inst.value.toLowerCase().includes(query.toLowerCase())
      );

      // Try to fetch from instances.social API
      const instancesToken = import.meta.env.VITE_INSTANCES_SOCIAL_TOKEN;
      if (!instancesToken) {
        console.warn(
          'VITE_INSTANCES_SOCIAL_TOKEN not set, using local filtering only'
        );
        this.instances =
          matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
        this.loadingInstances = false;
        return;
      }

      const response = await fetch(
        `https://instances.social/api/1.0/instances/search?q=${encodeURIComponent(query)}&count=10&name=true`,
        {
          headers: {
            Authorization: `Bearer ${instancesToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        interface InstanceResult {
          name: string;
          users?: number;
          thumbnail?: string;
          info?: {
            short_description?: string;
            full_description?: string;
          };
        }
        const apiInstances: AutocompleteOption[] = ((data.instances || []) as InstanceResult[]).map(
          (inst) => ({
            value: inst.name,
            label: inst.name,
            description:
              inst.info?.short_description ||
              inst.info?.full_description?.substring(0, 100) ||
              `${inst.users || '?'} users`,
            icon: inst.thumbnail,
          })
        );

        // Combine popular matches with API results, removing duplicates
        const seenValues = new Set<string>();
        const combined: AutocompleteOption[] = [];

        for (const inst of [...matchingPopular, ...apiInstances]) {
          if (!seenValues.has(inst.value)) {
            seenValues.add(inst.value);
            combined.push(inst);
          }
        }

        this.instances = combined.length > 0 ? combined : matchingPopular;
      } else {
        // Fallback to filtering popular instances
        this.instances =
          matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
      }
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
    const router = await getRouter();
    router.navigate('/explore');
  }

  render() {
    return html`
      ${this.loadIntro
        ? html`
            <md-dialog label="Intro To Mastodon">
              <div id="intro-carousel" class="scrollbar-hidden">
                <div class="scroll-item">
                  <h2>What is Coho?</h2>
                  <p>
                    Coho is the app your using 😊. It is an open source,
                    cross-platform Mastodon client. Coho brings the best of
                    Mastodon to any device, with a fast and intuitive interface,
                    no matter your device or internet connection. To use Coho,
                    you need a Mastodon account. Once you have a Mastodon
                    account you will need to enter the URL of the Mastodon
                    instance you signed up at.
                  </p>

                  <md-button variant="text" pill @click="${() => this.next()}"
                    >Next</md-button
                  >
                </div>

                <div class="scroll-item">
                  <h2>What Is Mastodon?</h2>
                  <p>
                    Mastodon is a social media platform that allows users to
                    create and share short posts, called "toots," and interact
                    with each other through features like boosting, direct
                    messaging, and hashtags. It is decentralized, meaning that
                    it is not controlled by a central authority and users can
                    choose which communities, called "instances," they want to
                    join. Mastodon is open-source and free to use.
                  </p>

                  <p>
                    Each instance is run by a different administrator and can
                    have its own rules and moderation policies.
                  </p>

                  <md-button variant="text" pill @click="${() => this.next()}"
                    >Next</md-button
                  >
                </div>

                <div class="scroll-item">
                  <h2>How do I join Mastodon?</h2>

                  <ol>
                    <li>
                      Go to
                      <a href="https://joinmastodon.org/"
                        >https://joinmastodon.org/</a
                      >
                      and select an instance to sign up for. There are many
                      different Mastodon instances to choose from, each with its
                      own rules and community guidelines. You can read more
                      about each instance to find one that fits your interests.
                    </li>
                    <li>
                      Click the "Sign up" button on the instance you have
                      chosen.
                    </li>
                    <li>
                      Fill out the sign-up form with your desired username,
                      email address, and password.
                    </li>
                    <li>
                      Read and agree to the terms of service for the instance.
                    </li>
                    <li>
                      Click the "Sign up" button to complete the registration
                      process.
                    </li>
                    <li>
                      You will receive an email with a confirmation link. Click
                      the link to confirm your email address and complete the
                      sign-up process.
                    </li>
                    <li>
                      Once you have confirmed your email, you can log in to
                      Mastodon and start using the platform.
                    </li>
                  </ol>
                  <p>
                    Note: Some instances may have additional requirements or
                    restrictions for new users, such as requiring a valid email
                    address or approving new accounts manually. Be sure to read
                    the rules and guidelines of the instance you are joining
                    before signing up.
                  </p>

                  <md-button
                    variant="filled"
                    pill
                    @click="${() => this.getStarted()}"
                    >Get Started</md-button
                  >
                </div>
              </div>
            </md-dialog>
          `
        : null}

      <main>
        <div class="background-decoration"></div>

        <md-card class="login-card" variant="elevated">
          <div class="login-header">
            <img
              src="/assets/icons/new-icons/icon-144x144.webp"
              alt="Coho Logo"
              class="logo"
            />
            <h1>Welcome to Coho</h1>
            <p class="subtitle">Your modern Mastodon client</p>
          </div>

          <div class="login-form">
            <md-autocomplete
              placeholder="Search for your server (e.g. mastodon.social)"
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
              Login
            </md-button>
          </div>

          <div slot="footer" class="login-actions">
            <md-button @click="${() => this.joinMastodon()}" variant="text">
              Sign up for Mastodon Account
            </md-button>
            <md-button @click="${() => this.openIntro()}" variant="text">
              Intro To Mastodon
            </md-button>
            <md-button @click="${() => this.explore()}" variant="text">
              Explore without an account
            </md-button>
          </div>
        </md-card>

        <div class="app-footer">
          <a href="https://github.com/jgw96/mammoth-app#readme" target="_blank">
            Learn More about Coho
          </a>
        </div>
      </main>
    `;
  }
}
