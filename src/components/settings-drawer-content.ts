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
import './md/md-card';
import './md/md-divider';

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
  @property({ type: Boolean }) appThemeLoaded = false;

  static styles = css`
    :host {
      display: block;
    }

    .settings-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    md-card md-divider {
      margin-top: 16px;
      margin-bottom: 16px;
    }

    .profile-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .profile-inner img {
      width: 4em;
      border-radius: var(--md-sys-shape-corner-circle);
    }

    .profile-inner md-skeleton {
      display: block;
    }

    .profile-inner h3 {
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

    h4 {
      font-size: var(--md-sys-typescale-title-small-font-size);
      font-weight: var(--md-sys-typescale-title-small-font-weight);
      margin-top: 0;
      margin-bottom: 0;
    }

    h3 {
      margin-top: 8px;
      margin-bottom: 0;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .setting-description {
      margin-top: 4px;
      margin-bottom: 0;
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .instance-img {
      width: 160px;
      border-radius: var(--md-sys-shape-corner-small);
    }

    .instance-description {
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    md-badge {
      cursor: pointer;
    }

    kbd {
      font-family: inherit;
      font-size: var(--md-sys-typescale-body-small-font-size);
      padding: 2px 6px;
      border-radius: var(--md-sys-shape-corner-extra-small);
      background: var(--md-sys-color-surface-container-high);
      color: var(--md-sys-color-on-surface);
    }

    ul {
      padding-left: 0;
      list-style: none;
      margin: 8px 0;
    }

    li {
      padding: 4px 0;
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    md-menu {
      background: var(--md-sys-color-surface-container-high);
      backdrop-filter: blur(48px);
      color: var(--md-sys-color-on-surface);
      z-index: 99;
    }

    md-menu-item {
      color: var(--md-sys-color-on-surface);
    }

    .build-info {
      margin-top: 8px;
      padding-bottom: 24px;
      text-align: center;
      opacity: 0.7;
      font-size: var(--md-sys-typescale-label-small-font-size);
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

  private _openFilters() {
    this.dispatchEvent(
      new CustomEvent('open-filters', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openMuted() {
    router.navigate('/muted');
  }

  private _openBlocked() {
    router.navigate('/blocked');
  }

  private _openScheduledStatuses() {
    this.dispatchEvent(
      new CustomEvent('open-scheduled-statuses', {
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
      <div class="settings-cards">
        <!-- Profile Card -->
        <md-card variant="filled">
          <div class="profile-inner">
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

            <p id="user-url">
              ${this.user ? this.user.url : msg('Loading...')}
            </p>

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
        </md-card>

        <!-- Interests Card -->
        ${this.userTermsLoaded
          ? html`
              <md-card variant="filled">
                <h3 slot="header">${msg('Interests')}</h3>
                <user-terms></user-terms>
              </md-card>
            `
          : nothing}

        <!-- Preferences Card -->
        <md-card variant="filled">
          <h3 slot="header">${msg('Preferences')}</h3>
          <div class="setting-row">
            <h4>${msg('Wellness Mode')}</h4>
            <md-switch
              @sl-change="${(e: Event) => this.handleWellnessToggle(e)}"
              ?checked="${this.wellnessMode}"
            ></md-switch>
          </div>
          <p class="setting-description">
            ${msg('Wellness Mode hides likes and boosts.')}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Data Saver Mode')}</h4>
            <md-switch
              @sl-change="${(e: Event) => this.handleDataSaverToggle(e)}"
              ?checked="${this.dataSaverMode}"
            ></md-switch>
          </div>
          <p class="setting-description">
            ${msg('Data Saver Mode reduces the amount of data used by Coho.')}
          </p>
        </md-card>

        <!-- Theme Card -->
        ${this.appThemeLoaded
          ? html`
              <md-card variant="filled">
                <h3 slot="header">${msg('Theme')}</h3>
                <app-theme></app-theme>
              </md-card>
            `
          : nothing}

        <!-- Content & Safety Card -->
        <md-card variant="filled">
          <h3 slot="header">${msg('Content & Safety')}</h3>
          <div class="setting-row">
            <h4>${msg('Content Filters')}</h4>
            <md-button variant="text" @click="${() => this._openFilters()}">
              ${msg('Manage')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg('Filter unwanted content from your timelines by keyword.')}
          </p>

          <md-divider></md-divider>

          <h4>${msg('Muted & Blocked Accounts')}</h4>
          <div class="setting-row">
            <md-button variant="text" @click="${() => this._openMuted()}">
              ${msg('Muted')}
            </md-button>
            <md-button variant="text" @click="${() => this._openBlocked()}">
              ${msg('Blocked')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg('Review and manage accounts you have muted or blocked.')}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Scheduled Posts')}</h4>
            <md-button
              variant="text"
              @click="${() => this._openScheduledStatuses()}"
            >
              ${msg('Manage')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg('View, reschedule, or cancel queued posts.')}
          </p>
        </md-card>

        <!-- Keyboard Shortcuts Card -->
        <md-card variant="filled">
          <h3 slot="header">${msg('Key Shortcuts')}</h3>

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
        </md-card>

        <!-- Instance Info Card -->
        ${this.instanceInfo
          ? html`
              <md-card variant="filled">
                <h3 slot="header">${msg('Instance Info')}</h3>

                ${this.instanceInfo.thumbnail
                  ? html`<img
                      class="instance-img"
                      src="${this.instanceInfo.thumbnail}"
                      alt="${this.instanceInfo.title}"
                    />`
                  : nothing}
                <p>${this.instanceInfo.title}</p>

                <div
                  class="instance-description"
                  .innerHTML="${this.instanceInfo.description}"
                ></div>
              </md-card>
            `
          : nothing}

        <!-- Build Info -->
        <div class="build-info">
          <p>${msg('Build:')} ${new Date(__APP_VERSION__).toLocaleString()}</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-drawer-content': SettingsDrawerContent;
  }
}
