import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg, str } from '@lit/localize';
import { localized } from '@lit/localize';

import './md/md-skeleton';
import './md/md-badge';
import './md/md-switch';
import './md/md-icon';
import './md/md-icon-button';
import './md/md-dropdown';
import './md/md-menu';
import './md/md-menu-item';
import './md/md-button';

import type { Account } from '../mastodon/types/account';
import type { Instance } from '../mastodon/types/instance';
import { router } from '../router/routes';

declare const __APP_VERSION__: string;

/**
 * Settings drawer content component.
 * Displays user profile info, settings toggles, keyboard shortcuts, and instance info.
 */
@localized()
@customElement('settings-drawer-content')
export class SettingsDrawerContent extends LitElement {
  @property({ type: Object }) user: Account | null = null;
  @property({ type: Object }) instanceInfo: Instance | null = null;
  @property({ type: Boolean }) wellnessMode = false;
  @property({ type: Boolean }) dataSaverMode = false;
  @property({ type: Boolean }) userTermsLoaded = false;

  static styles = css`
    :host {
      display: block;
    }

    #settings-profile-inner {
      background: rgba(128, 128, 128, 0.14);
      border-radius: 6px;
      padding: 10px;
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    #settings-profile-inner img {
      width: 4em;
      border-radius: 50%;
    }

    #settings-profile-inner md-skeleton {
      display: block;
    }

    #settings-profile-inner h3 {
      margin-top: 0;
      margin-bottom: 0;
    }

    #username-block {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: -webkit-fill-available;
    }

    #user-url {
      margin-top: 4px;
      font-size: var(--md-sys-typescale-body-small-font-size);
    }

    .setting div {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .setting p {
      margin-top: 4px;
    }

    #instanceInfo {
      border-radius: 6px;
      background: #0000001a;
      padding-left: 12px;
      padding-top: 1px;
      padding-right: 12px;
      margin-top: 2em;
    }

    #instanceInfo img {
      width: 160px;
    }

    md-badge {
      cursor: pointer;
    }

    md-menu {
      background: #ffffff14;
      backdrop-filter: blur(48px);
      color: white;
      z-index: 99;
    }

    md-menu-item {
      color: white;
    }

    @media (prefers-color-scheme: light) {
      md-menu-item {
        color: black;
      }

      md-menu {
        background: rgb(235 235 235);
        backdrop-filter: none;
      }
    }
  `;

  private goToFollowers() {
    if (!this.user) return;
    router.navigate(`/followers?id=${this.user.id}`);
  }

  private goToFollowing() {
    if (!this.user) return;
    router.navigate(`/following?id=${this.user.id}`);
  }

  private viewMyProfile() {
    if (!this.user) return;
    router.navigate(`/account?id=${this.user.id}`, {
      state: { account: this.user },
    });
  }

  private async shareMyProfile() {
    if (!this.user) return;
    if (navigator.share) {
      await navigator.share({
        title: 'My Mastodon Profile',
        text: 'Check out my Mastodon profile!',
        url: this.user.url,
      });
    } else {
      await navigator.clipboard.writeText(this.user.url);
    }
  }

  private editMyProfile() {
    router.navigate(`/editaccount`);
  }

  private handleWellnessToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent('wellness-change', {
        detail: { checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleDataSaverToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent('data-saver-change', {
        detail: { checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div>
        <div id="settings-profile-inner">
          ${this.user && this.user.avatar
            ? html`<img
                src="${this.user.avatar}"
                alt="${this.user.display_name}"
              />`
            : html`<md-skeleton
                id="profile-avatar"
                shape="circle"
                width="4em"
                height="4em"
              ></md-skeleton>`}
          <div id="username-block">
            <h3>${this.user ? this.user.display_name : msg('Loading...')}</h3>

            <div id="user-actions">
              <md-dropdown>
                <md-icon-button
                  slot="trigger"
                  src="/assets/settings-outline.svg"
                ></md-icon-button>
                <md-menu>
                  <md-menu-item @click="${() => this.viewMyProfile()}">
                    <md-icon
                      slot="prefix"
                      src="/assets/eye-outline.svg"
                    ></md-icon>
                    ${msg('View My Profile')}
                  </md-menu-item>
                  <md-menu-item @click="${() => this.shareMyProfile()}">
                    <md-icon
                      slot="prefix"
                      src="/assets/share-social-outline.svg"
                    ></md-icon>
                    ${msg('Share My Profile')}
                  </md-menu-item>
                  <md-menu-item @click="${() => this.editMyProfile()}">
                    ${msg('Edit My Profile')}
                  </md-menu-item>
                </md-menu>
              </md-dropdown>
            </div>
          </div>

          <p id="user-url">${this.user ? this.user.url : msg('Loading...')}</p>

          <div>
            <md-badge
              variant="filled"
              clickable
              @click="${() => this.goToFollowers()}"
              >${this.user
                ? msg(str`${this.user.followers_count} followers`)
                : msg('0 followers')}
            </md-badge>
            <md-badge
              variant="filled"
              clickable
              @click="${() => this.goToFollowing()}"
              >${this.user
                ? msg(str`${this.user.following_count} following`)
                : msg('0 following')}
            </md-badge>
          </div>
        </div>
      </div>

      <div class="setting">
        ${this.userTermsLoaded ? html`<user-terms></user-terms>` : nothing}
      </div>

      <div class="setting">
        <div>
          <h4>${msg('Wellness Mode')}</h4>

          <md-switch
            @sl-change="${(e: Event) => this.handleWellnessToggle(e)}"
            ?checked="${this.wellnessMode}"
          ></md-switch>
        </div>

        <p>${msg('Wellness Mode hides likes and boosts.')}</p>
      </div>

      <div class="setting">
        <div>
          <h4>${msg('Data Saver Mode')}</h4>

          <md-switch
            @sl-change="${(e: Event) => this.handleDataSaverToggle(e)}"
            ?checked="${this.dataSaverMode}"
          ></md-switch>
        </div>

        <p>
          ${msg('Data Saver Mode reduces the amount of data used by Coho.')}
        </p>
      </div>

      <div class="setting">
        <h4>${msg('Key Shortcuts')}</h4>

        <ul>
          <li><kbd>g</kbd> + <kbd>h</kbd> - ${msg('Open Home')}</li>
          <li><kbd>g</kbd> + <kbd>n</kbd> - ${msg('Open Notifications')}</li>
          <li><kbd>g</kbd> + <kbd>s</kbd> - ${msg('Open Search')}</li>
          <li><kbd>g</kbd> + <kbd>b</kbd> - ${msg('Open Bookmarks')}</li>
          <li><kbd>g</kbd> + <kbd>f</kbd> - ${msg('Open Favorites')}</li>
          <li><kbd>j</kbd> / <kbd>k</kbd> - ${msg('Navigate posts')}</li>
          <li><kbd>n</kbd> - ${msg('New post')}</li>
          <li><kbd>?</kbd> - ${msg('Show all shortcuts')}</li>
        </ul>

        <md-button
          variant="text"
          @click="${() =>
            window.dispatchEvent(new CustomEvent('show-shortcuts-help'))}"
        >
          ${msg('View all keyboard shortcuts')}
        </md-button>
      </div>

      ${this.instanceInfo
        ? html`
            <div id="instanceInfo">
              <h4>${msg('Instance Info')}</h4>

              ${this.instanceInfo.thumbnail
                ? html`<img
                    src="${this.instanceInfo.thumbnail}"
                    alt="${this.instanceInfo.title}"
                  />`
                : nothing}
              <p>${this.instanceInfo.title}</p>

              <div .innerHTML="${this.instanceInfo.description}"></div>
            </div>
          `
        : null}

      <div
        style="margin-top: 24px; padding-bottom: 24px; text-align: center; opacity: 0.7; font-size: 12px;"
      >
        <p>${msg('Build:')} ${new Date(__APP_VERSION__).toLocaleString()}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-drawer-content': SettingsDrawerContent;
  }
}
