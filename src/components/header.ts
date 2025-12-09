import { LitElement, css, html, PropertyValueMap, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';

import './md/md-icon.js';
import './md/md-icon-button.js';

import { enableVibrate } from '../utils/handle-vibrate';

import type {
  OpenSettingsEvent,
  OpenThemingEvent,
  OpenBotDrawerEvent,
} from '../types/events';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) title = 'Otter';

  @property({ type: Boolean }) enableBack: boolean = false;

  static get styles() {
    return css`
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: transparent;
        color: white;
        padding-right: 5px;
        position: fixed;
        left: env(titlebar-area-x, 0);
        top: env(titlebar-area-y, 0);
        right: 0;
        height: env(titlebar-area-height, 33px);
        app-region: drag;

        backdrop-filter: blur(46px);

        width: calc(env(titlebar-area-width, intitial) + -23px);
        padding-top: 4px;
        padding-left: 12px;

        view-transition-name: full-embed;
        contain: layout;

        z-index: 99999;
      }

      #actions {
        display: flex;
        gap: 0px;
      }

      header h1 {
        margin-top: 0;
        margin-bottom: 0;
        font-size: var(--md-sys-typescale-title-large-font-size);
        font-weight: bold;
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
        #mammoth-bot {
          display: none;
        }

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

  constructor() {
    super();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ): void {
    // Debug: Check display mode for window controls overlay
    const isWCO = window.matchMedia(
      '(display-mode: window-controls-overlay)'
    ).matches;
    console.log('[Header] Window Controls Overlay active:', isWCO);
    console.log(
      '[Header] titlebar-area-x:',
      getComputedStyle(document.documentElement).getPropertyValue(
        'env(titlebar-area-x, fallback)'
      )
    );

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

  openBotDrawer() {
    // fire custom event
    this.dispatchEvent(
      new CustomEvent('open-bot-drawer') as OpenBotDrawerEvent
    );
  }

  async goBack() {
    if ('navigation' in window) {
      // @ts-expect-error fix
      if (window.navigation.canGoBack) {
        // @ts-expect-error fix
        await window.navigation.back();
      }
    } else {
      window.history.back();
    }
  }

  render() {
    return html`
      <header>
        <div id="back-button-block">
          ${this.enableBack
            ? html`<md-icon-button
                @click="${() => this.goBack()}"
                title="back"
                size="small"
                href="/home"
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
            : null}
          ${!this.enableBack
            ? html`<img
                src="/assets/icons/new-icons/icon-48x48.png"
                alt="App Icon"
                width="28"
                height="28"
              />`
            : nothing}
        </div>

        <div id="actions">
          <md-icon-button
            title="Open Theme Settings"
            id="open-button"
            @click="${() => this.handleTheming()}"
          >
            <md-icon
              src="/assets/color-palette-outline.svg"
              alt="Theme"
            ></md-icon>
          </md-icon-button>

          <md-icon-button
            id="settings-button"
            title="Open Settings"
            @click="${() => this.openSettings()}"
          >
            <md-icon src="/assets/settings-outline.svg"></md-icon>
          </md-icon-button>
        </div>
      </header>
    `;
  }
}
