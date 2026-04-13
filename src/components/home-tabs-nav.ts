import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

import './md/md-tab';
import './md/md-icon';
import './md/md-button';

// Inline SVGs for SSR — md-icon fetches src at runtime but these provide
// instant rendering before JS loads. Once hydrated, the fetched src replaces them.
const ICONS = {
  'home-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 212v236a16 16 0 0 0 16 16h96V328a24 24 0 0 1 24-24h80a24 24 0 0 1 24 24v136h96a16 16 0 0 0 16-16V212"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M480 256 266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256m368-77V64h-48v69"/></svg>',
  'home-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79z" fill="currentColor"/><path d="m490.91 244.15-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97z" fill="currentColor"/></svg>',
  'search-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29 448 448"/></svg>',
  'search-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M456.69 421.39 362.6 327.3a173.81 173.81 0 0 0 34.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 0 0 327.3 362.6l94.09 94.09a25 25 0 0 0 35.3-35.3zM97.92 222.72a124.8 124.8 0 1 1 124.8 124.8 124.95 124.95 0 0 1-124.8-124.8z" fill="currentColor"/></svg>',
  'notifications-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57M320 384v16a64 64 0 0 1-128 0v-16"/></svg>',
  'notifications-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57M320 384v16a64 64 0 0 1-128 0v-16"/></svg>',
  'bookmark-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 48H160a48 48 0 0 0-48 48v368l144-128 144 128V96a48 48 0 0 0-48-48"/></svg>',
  'bookmark-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M400 480a16 16 0 0 1-10.63-4L256 357.41 122.63 476A16 16 0 0 1 96 464V96a64.07 64.07 0 0 1 64-64h192a64.07 64.07 0 0 1 64 64v368a16 16 0 0 1-16 16z" fill="currentColor"/></svg>',
  'heart-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352.92 80C288 80 256 144 256 144s-32-64-96.92-64c-52.76 0-94.54 44.14-95.08 96.81-1.1 109.33 86.73 187.08 183 252.42a16 16 0 0 0 18 0c96.26-65.34 184.09-143.09 183-252.42-.54-52.67-42.32-96.81-95.08-96.81"/></svg>',
  'heart-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 448a32 32 0 0 1-18-5.57c-78.59-53.35-112.62-89.93-131.39-112.8-40-48.75-59.15-98.8-58.61-153C48.63 114.52 98.46 64 159.08 64c44.08 0 74.61 24.83 92.39 45.51a6 6 0 0 0 9.06 0C278.31 88.81 308.84 64 352.92 64c60.62 0 110.45 50.52 111.08 112.64.54 54.21-18.63 104.26-58.61 153-18.77 22.87-52.8 59.45-131.39 112.8a32 32 0 0 1-18 5.56z" fill="currentColor"/></svg>',
  'add-outline':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>',
} as const;

@localized()
@customElement('home-tabs-nav')
export class HomeTabsNav extends LitElement {
  @property({ type: Boolean }) isGuestMode = false;
  @property({ type: Boolean }) hasNewNotifications = false;
  @property({ type: String }) activeTab = 'general';

  /**
   * Helper to get the correct icon path based on active state
   */
  private getIconSrc(panel: string, baseName: string): string {
    const variant = this.activeTab === panel ? 'filled' : 'outline';
    return `/assets/${baseName}-${variant}.svg`;
  }

  /**
   * Helper to get the inline SVG for an icon (SSR fallback)
   */
  private getInlineSvg(panel: string, baseName: string) {
    const variant = this.activeTab === panel ? 'filled' : 'outline';
    const key = `${baseName}-${variant}` as keyof typeof ICONS;
    return unsafeSVG(ICONS[key]);
  }

  connectedCallback() {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  createRenderRoot() {
    return this; // Render to Light DOM
  }

  private _handleReload() {
    this.dispatchEvent(
      new CustomEvent('reload-home', { bubbles: true, composed: true })
    );
  }

  private _handleOpenNewPost(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
    this.dispatchEvent(
      new CustomEvent('open-new-post', {
        bubbles: true,
        composed: true,
        detail: { origin },
      })
    );
  }

  render() {
    return html`
      <md-tab panel="general" @click="${this._handleReload}">
        <md-icon slot="icon" src="${this.getIconSrc('general', 'home')}"
          >${this.getInlineSvg('general', 'home')}</md-icon
        >
        <span class="tab-label">${msg('Home')}</span>
      </md-tab>
      <md-tab panel="search">
        <md-icon slot="icon" src="${this.getIconSrc('search', 'search')}"
          >${this.getInlineSvg('search', 'search')}</md-icon
        >
        <span class="tab-label">${msg('Explore')}</span>
      </md-tab>
      <md-tab panel="notifications" ?disabled="${this.isGuestMode}">
        <md-icon
          slot="icon"
          src="${this.getIconSrc('notifications', 'notifications')}"
          >${this.getInlineSvg('notifications', 'notifications')}</md-icon
        >
        <span class="tab-label">${msg('Notifications')}</span>
        ${this.hasNewNotifications
          ? html`<span class="notification-dot"></span>`
          : nothing}
        ${this.isGuestMode
          ? html`<md-icon
              slot="suffix"
              name="lock-closed"
              style="font-size: 12px; opacity: 0.5;"
            ></md-icon>`
          : nothing}
      </md-tab>
      <md-tab panel="bookmarks" ?disabled="${this.isGuestMode}">
        <md-icon slot="icon" src="${this.getIconSrc('bookmarks', 'bookmark')}"
          >${this.getInlineSvg('bookmarks', 'bookmark')}</md-icon
        >
        <span class="tab-label">${msg('Saved')}</span>
        ${this.isGuestMode
          ? html`<md-icon
              slot="suffix"
              name="lock-closed"
              style="font-size: 12px; opacity: 0.5;"
            ></md-icon>`
          : nothing}
      </md-tab>
      <md-tab panel="faves" ?disabled="${this.isGuestMode}">
        <md-icon slot="icon" src="${this.getIconSrc('faves', 'heart')}"
          >${this.getInlineSvg('faves', 'heart')}</md-icon
        >
        <span class="tab-label">${msg('Favorites')}</span>
        ${this.isGuestMode
          ? html`<md-icon
              slot="suffix"
              name="lock-closed"
              style="font-size: 12px; opacity: 0.5;"
            ></md-icon>`
          : nothing}
      </md-tab>

      ${this.isGuestMode
        ? nothing
        : html`
            <div class="new-post-container">
              <md-button
                variant="fab"
                class="new-post-btn"
                @click="${this._handleOpenNewPost}"
                title="New Post"
              >
                <md-icon src="/assets/add-outline.svg"
                  >${unsafeSVG(ICONS['add-outline'])}</md-icon
                >
              </md-button>
            </div>
          `}

      <md-tab panel="media" style="display: none;"></md-tab>
      <md-tab panel="messages" style="display: none;"></md-tab>
      <md-tab panel="custom" style="display: none;"></md-tab>
    `;
  }
}
