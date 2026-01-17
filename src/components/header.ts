import { LitElement, css, html, PropertyValueMap, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-icon.js';
import './md/md-icon-button.js';

import { enableVibrate } from '../utils/handle-vibrate';
import { setAuthRedirect } from '../utils/auth-redirect';

import type {
  OpenSettingsEvent,
  OpenThemingEvent,
  OpenInstallEvent,
} from '../types/events';

@localized()
@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: Boolean }) enableBack: boolean = false;

  @property({ type: Boolean }) showInstall: boolean = false;

  @property({ type: Boolean }) guestMode: boolean = false;

  static get styles() {
    return css`
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: white;
        padding-right: 5px;
        position: fixed;
        left: env(titlebar-area-x, 0);
        top: env(titlebar-area-y, 0);
        right: 0;
        app-region: drag;

        width: env(titlebar-area-width, intitial);
        padding-top: 4px;
        padding-left: 12px;

        view-transition-name: full-embed;
        contain: layout;

        z-index: 99999;

        backdrop-filter: unset;
        background: var(--md-sys-color-background);
        height: calc(env(titlebar-area-height, 33px) - 4px);
      }

      #actions {
        display: flex;
        gap: 0px;
      }

      header img {
        view-transition-name: main-header-icon;
        contain: layout;
        width: fit-content;
      }

      header svg {
        width: 24px;
        height: 24px;
      }

      nav a {
        margin-left: 10px;
      }

      #back-button-block {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      md-button,
      md-icon-button {
        -webkit-app-region: no-drag;
        app-region: no-drag;
      }

      @media (min-width: 768px) {
        header {
          padding-left: 38px;
        }
      }

      @media (prefers-color-scheme: light) {
        header {
          color: black;
        }

        nav a {
          color: initial;
        }
      }

      @media (prefers-color-scheme: dark) {
        md-button[variant='outlined']::part(control) {
          background: #1e1e1e;
          color: white;
        }

        md-button::part(control) {
          --neutral-fill-stealth-active: #1b1d26;
          --neutral-fill-stealth-hover: #1b1d26;
        }
      }

      @media (display-mode: window-controls-overlay) {
        header {
          padding-left: 0 !important;
        }
      }
    `;
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ): void {
    window.requestIdleCallback(() => {
      if (this.shadowRoot) {
        enableVibrate(this.shadowRoot);
      }
    });
  }

  openSettings() {
    // fire custom event
    this.dispatchEvent(new CustomEvent('open-settings') as OpenSettingsEvent);
  }

  handleTheming() {
    // fire custom event
    this.dispatchEvent(new CustomEvent('open-theming') as OpenThemingEvent);
  }

  openInstall() {
    // fire custom event
    this.dispatchEvent(new CustomEvent('open-install') as OpenInstallEvent);
  }

  async goBack() {
    if (window.navigation.canGoBack) {
      window.navigation.back();
    }
  }

  render() {
    return html`
      <header>
        <div id="back-button-block">
          ${this.enableBack
            ? html`<md-icon-button
                @click="${() => this.goBack()}"
                title=${msg('back')}
                size="small"
                pill
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="ionicon"
                  viewBox="0 0 512 512"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="48"
                    d="M328 112L184 256l144 144"
                  />
                </svg>
              </md-icon-button>`
            : html`<img
                src="/assets/icons/new-icons/icon-48x48.png"
                alt="App Icon"
                width="28"
                height="28"
              />`}
        </div>

        <div id="actions">
          ${!this.enableBack
            ? html`
                ${this.showInstall
                  ? html`<md-icon-button
                      title=${msg('Install App')}
                      id="install-button"
                      @click="${() => this.openInstall()}"
                    >
                      <md-icon src="/assets/download-outline.svg"></md-icon>
                    </md-icon-button>`
                  : nothing}

                <md-icon-button
                  title=${msg('Open Theme Settings')}
                  id="open-button"
                  @click="${() => this.handleTheming()}"
                >
                  <md-icon
                    src="/assets/color-palette-outline.svg"
                    alt="Theme"
                  ></md-icon>
                </md-icon-button>

                ${this.guestMode
                  ? html`<md-icon-button
                      id="login-button"
                      title=${msg('Sign In')}
                      @click="${() => {
                        setAuthRedirect(
                          `${window.location.pathname}${window.location.search}${window.location.hash}`
                        );
                        import('../router/routes').then((m) =>
                          m.router.navigate('/')
                        );
                      }}"
                    >
                      <md-icon name="log-in"></md-icon>
                    </md-icon-button>`
                  : html`<md-icon-button
                      id="settings-button"
                      title=${msg('Open Settings')}
                      @click="${() => this.openSettings()}"
                    >
                      <md-icon src="/assets/settings-outline.svg"></md-icon>
                    </md-icon-button>`}
              `
            : nothing}
        </div>
      </header>
    `;
  }
}
