import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
import './md/md-toast';
import './account-settings';

import type { MdToast } from './md/md-toast';

import { parseEmojis } from '../utils/emoji-parser';
import type { Account } from '../mastodon/types/account';
import type { Instance } from '../mastodon/types/instance';
import type { Announcement } from '../mastodon/types/announcement';
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
  @property({ type: Boolean }) hapticsEnabled = true;
  @property({ type: Boolean }) experimental3dTimelineEnabled = false;
  @property({ type: Boolean }) appThemeLoaded = false;

  @state() private isAndroid = false;
  @state() private syncingToWatch = false;
  @state() private syncedToWatch = false;
  @state() private latestAnnouncement: Announcement | null = null;

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

    #warp-timeline-button {
      margin-top: 16px;
    }

    md-card md-divider {
      margin-top: 20px;
      margin-bottom: 20px;
    }

    .profile-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .profile-inner img {
      width: 4em;
      min-height: 4em;
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
      margin-top: 6px;
      margin-bottom: 0;
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .setting-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
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

    .announcement-date {
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 8px;
    }

    .announcement-body {
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .announcement-body a {
      color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    }

    .announcement-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .build-info {
      margin-top: 8px;
      padding-bottom: 24px;
      text-align: center;
      opacity: 0.7;
      font-size: var(--md-sys-typescale-label-small-font-size);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.detectPlatform();
    this.loadLatestAnnouncement();
  }

  private async loadLatestAnnouncement() {
    try {
      const { get } = await import('idb-keyval');
      const { SERVER_ANNOUNCEMENTS_IDB_KEY } =
        await import('../mastodon/api/announcements.js');
      const list = (await get(SERVER_ANNOUNCEMENTS_IDB_KEY)) as
        | Announcement[]
        | undefined;
      if (list?.length) {
        const sorted = [...list].sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime()
        );
        this.latestAnnouncement = sorted[0];
      }
    } catch {
      /* ignore */
    }
  }

  private async detectPlatform() {
    try {
      const { getPlatform } = await import('../utils/platform.js');
      this.isAndroid = getPlatform() === 'android';
    } catch {
      this.isAndroid = false;
    }
  }

  private async syncToWatch() {
    this.syncingToWatch = true;
    try {
      const { syncCredentialsToWearOS } =
        await import('../services/wear-sync.js');
      const success = await syncCredentialsToWearOS();
      if (success) {
        this.syncedToWatch = true;
      }
      this.showSyncToast(
        success ? msg('Synced to watch') : msg('No credentials to sync'),
        success ? 'success' : 'error'
      );
    } catch {
      this.showSyncToast(msg('Failed to sync to watch'), 'error');
    } finally {
      this.syncingToWatch = false;
    }
  }

  private showSyncToast(message: string, type: 'success' | 'error') {
    const toast = this.shadowRoot?.querySelector<MdToast>('md-toast');
    if (toast) {
      toast.setAttribute('message', message);
      toast.setAttribute('type', type);
      toast.show();
    }
  }

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
    }
    // @ts-expect-error - window.Capacitor is a runtime global not in TS types
    else if (window.Capacitor) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
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

  private _openDomainBlocks() {
    router.navigate('/domain-blocks');
  }

  private _openFollowRequests() {
    router.navigate('/follow-requests');
  }

  private _openFollowedHashtags() {
    router.navigate('/followed-hashtags');
  }

  private _openAnnouncements() {
    router.navigate('/announcements');
  }

  private _openWarpTimeline() {
    router.navigate('/warp');
  }

  private _formatAnnouncementDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
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

  private handleHapticsToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent('haptics-change', {
        detail: { checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleExperimental3dTimelineToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent('experimental-3d-timeline-change', {
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
                  @click="${() => this.viewMyProfile()}"
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
                      <md-icon
                        slot="prefix"
                        src="/assets/brush-outline.svg"
                      ></md-icon>
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

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Haptic Feedback')}</h4>
            <md-switch
              @sl-change="${(e: Event) => this.handleHapticsToggle(e)}"
              ?checked="${this.hapticsEnabled}"
            ></md-switch>
          </div>
          <p class="setting-description">
            ${msg('Vibrate on actions like likes, boosts, and publishing.')}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Experimental 3D Timeline')}</h4>
            <md-switch
              @sl-change="${(e: Event) =>
                this.handleExperimental3dTimelineToggle(e)}"
              ?checked="${this.experimental3dTimelineEnabled}"
            ></md-switch>
          </div>
          <p class="setting-description">
            ${msg('Try an experitment in exploring posts in 3D.')}
          </p>

          ${this.experimental3dTimelineEnabled
            ? html`
                <md-button
                  variant="tonal"
                  @click="${() => this._openWarpTimeline()}"
                  id="warp-timeline-button"
                >
                  ${msg('Open Warp Timeline')}
                </md-button>
              `
            : nothing}
          ${this.isAndroid
            ? html`
                <md-divider></md-divider>

                <div class="setting-row">
                  <h4>${msg('Sync to Watch')}</h4>
                  <md-button
                    variant="filled"
                    @click="${() => this.syncToWatch()}"
                    ?disabled="${this.syncingToWatch || this.syncedToWatch}"
                  >
                    ${this.syncedToWatch
                      ? msg('Synced ✓')
                      : this.syncingToWatch
                        ? msg('Syncing…')
                        : msg('Sync')}
                  </md-button>
                </div>
                <p class="setting-description">
                  ${msg('Send your account credentials to your Wear OS watch.')}
                </p>
              `
            : nothing}
        </md-card>

        <md-toast></md-toast>

        <!-- Account & Privacy / Posting Defaults -->
        <account-settings></account-settings>

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

          <div class="setting-row">
            <h4>${msg('Muted & Blocked Accounts')}</h4>
            <div class="setting-actions">
              <md-button variant="text" @click="${() => this._openMuted()}">
                ${msg('Muted')}
              </md-button>
              <md-button variant="text" @click="${() => this._openBlocked()}">
                ${msg('Blocked')}
              </md-button>
            </div>
          </div>
          <p class="setting-description">
            ${msg('Review and manage accounts you have muted or blocked.')}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Blocked Domains')}</h4>
            <md-button
              variant="text"
              @click="${() => this._openDomainBlocks()}"
            >
              ${msg('Manage')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg(
              'Block entire servers to hide all content from those domains.'
            )}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Follow Requests')}</h4>
            <md-button
              variant="text"
              @click="${() => this._openFollowRequests()}"
            >
              ${msg('Manage')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg(
              'Review pending requests from people who want to follow you.'
            )}
          </p>

          <md-divider></md-divider>

          <div class="setting-row">
            <h4>${msg('Followed Hashtags')}</h4>
            <md-button
              variant="text"
              @click="${() => this._openFollowedHashtags()}"
            >
              ${msg('Manage')}
            </md-button>
          </div>
          <p class="setting-description">
            ${msg('Hashtags you follow appear in your home timeline.')}
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

        <!-- Server Announcement Card -->
        ${this.latestAnnouncement
          ? html`
              <md-card variant="filled">
                <h3 slot="header">${msg('Server announcements')}</h3>

                <p class="announcement-date">
                  ${this._formatAnnouncementDate(
                    this.latestAnnouncement.published_at
                  )}
                </p>
                <div
                  class="announcement-body"
                  .innerHTML=${parseEmojis(
                    this.latestAnnouncement.content,
                    this.latestAnnouncement.emojis ?? []
                  )}
                ></div>
                <div class="announcement-footer">
                  <md-button
                    variant="text"
                    @click="${() => this._openAnnouncements()}"
                  >
                    ${msg('View all')}
                  </md-button>
                </div>
              </md-card>
            `
          : nothing}

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
