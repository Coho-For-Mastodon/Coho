import { LitElement, css, html, PropertyValueMap, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-icon.js';
import './md/md-icon-button.js';

import { enableVibrate } from '../utils/handle-vibrate';
import { setAuthRedirect } from '../utils/auth-redirect';

import type {
  OpenAccountSwitcherEvent,
  OpenSettingsEvent,
  OpenInstallEvent,
} from '../types/events';

@localized()
@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: Boolean }) enableBack: boolean = false;

  @property({ type: Boolean }) showInstall: boolean = false;

  @property({ type: Boolean }) guestMode: boolean = false;

  @property({ type: Boolean }) showMessages: boolean = false;

  @property({ type: Boolean }) showAccountSwitcher: boolean = false;

  @property({ type: String }) currentAccountAvatar: string = '';

  @property({ type: String }) currentAccountLabel: string = '';

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
        top: env(titlebar-area-y, env(safe-area-inset-top, 0));
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
        background: transparent;
      }

      #actions {
        display: flex;
        gap: 0px;
      }

      #account-switcher-button {
        overflow: hidden;
      }

      .account-avatar,
      .avatar-placeholder {
        width: 24px;
        height: 24px;
        border-radius: 999px;
      }

      .account-avatar {
        display: block;
        object-fit: cover;
        background: var(--md-sys-color-surface-container-high);
      }

      .avatar-placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 1;
        text-transform: uppercase;
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

  openInstall() {
    // fire custom event
    this.dispatchEvent(new CustomEvent('open-install') as OpenInstallEvent);
  }

  openAccountSwitcher(event: Event) {
    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;

    this.dispatchEvent(
      new CustomEvent('open-account-switcher', {
        detail: { origin },
      }) as OpenAccountSwitcherEvent
    );
  }

  async goBack() {
    if (window.navigation.canGoBack) {
      window.navigation.back();
    }
  }

  private _openMessages() {
    import('../router/routes').then((m) => m.router.navigate('/messages'));
  }

  private getCurrentAccountInitial(): string {
    const source = this.currentAccountLabel.trim();
    return source.slice(0, 1) || '?';
  }

  private renderAccountSwitcherContent() {
    if (this.currentAccountAvatar) {
      return html`<img
        class="account-avatar"
        src="${this.currentAccountAvatar}"
        alt="${this.currentAccountLabel || msg('Current account avatar')}"
      />`;
    }

    return html`<span class="avatar-placeholder" aria-hidden="true"
      >${this.getCurrentAccountInitial()}</span
    >`;
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
                ${this.showMessages
                  ? html`<md-icon-button
                      title=${msg('Messages')}
                      id="messages-button"
                      @click="${() => this._openMessages()}"
                    >
                      <md-icon src="/assets/chatbox-outline.svg"></md-icon>
                    </md-icon-button>`
                  : nothing}
                ${this.showAccountSwitcher
                  ? html`<md-icon-button
                      title=${msg('Switch accounts')}
                      label=${msg('Switch accounts')}
                      id="account-switcher-button"
                      @click="${(event: Event) =>
                        this.openAccountSwitcher(event)}"
                    >
                      ${this.renderAccountSwitcherContent()}
                    </md-icon-button>`
                  : nothing}
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
