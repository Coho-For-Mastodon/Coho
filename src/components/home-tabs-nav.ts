import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import './md/md-tab';
import './md/md-icon';
import './md/md-button';

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
        <md-icon
          slot="icon"
          src="${this.getIconSrc('general', 'home')}"
        ></md-icon>
        <span class="tab-label">${msg('Home')}</span>
      </md-tab>
      <md-tab panel="search">
        <md-icon
          slot="icon"
          src="${this.getIconSrc('search', 'search')}"
        ></md-icon>
        <span class="tab-label">${msg('Explore')}</span>
      </md-tab>
      <md-tab panel="notifications" ?disabled="${this.isGuestMode}">
        <md-icon
          slot="icon"
          src="${this.getIconSrc('notifications', 'notifications')}"
        ></md-icon>
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
        <md-icon
          slot="icon"
          src="${this.getIconSrc('bookmarks', 'bookmark')}"
        ></md-icon>
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
        <md-icon
          slot="icon"
          src="${this.getIconSrc('faves', 'heart')}"
        ></md-icon>
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
                <md-icon src="/assets/add-outline.svg"></md-icon>
              </md-button>
            </div>
          `}

      <md-tab panel="media" style="display: none;"></md-tab>
      <md-tab panel="messages" style="display: none;"></md-tab>
      <md-tab panel="custom" style="display: none;"></md-tab>
    `;
  }
}
