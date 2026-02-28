import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg, str } from '@lit/localize';
import { localized } from '@lit/localize';
import { fadeInAnimation } from '../styles/animations';

import './md/md-skeleton';
import './md/md-badge';
import './md/md-button';
import './md/md-icon';
import './md/md-icon-button';
import './md/md-dropdown';
import './md/md-menu';
import './md/md-menu-item';

import type { Account } from '../mastodon/types/account';
import type { TrendingTag } from '../mastodon/types/instance';
import { router } from '../router/routes';
import { setAuthRedirect } from '../utils/auth-redirect';

/**
 * Right sidebar component for the home page.
 * Displays user profile card (or guest welcome) and trending tags.
 */
@localized()
@customElement('home-sidebar')
export class HomeSidebar extends LitElement {
  @property({ type: Object }) user: Account | null = null;
  @property({ type: Array }) trendingTags: TrendingTag[] = [];
  @property({ type: Boolean }) trendingTagsLoading = false;
  @property({ type: Boolean }) isGuestMode = false;

  static styles = [
    fadeInAnimation,
    css`
      :host {
        display: block;
      }

      #right-sidebar {
        position: sticky;
        top: 20px;
        height: calc(100vh - 40px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-right: 16px;
      }

      .sidebar-card {
        background: var(--md-sys-color-surface-container, #1e1e24);
        border-radius: var(--md-sys-shape-corner-medium);
        padding: 16px;
        animation: fadeIn 0.3s ease-in-out;
      }

      .sidebar-card h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1.1rem;
      }

      #profile-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
        width: 100%;
      }

      #profile-card-content img,
      #profile-card-content md-skeleton#profile-avatar {
        height: 80px;
        width: 80px;
        border-radius: var(--md-sys-shape-corner-circle);
        border: 2px solid var(--md-sys-color-primary);
      }

      #profile-card-content h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      #profile-card-content p {
        margin: 0;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.9rem;
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

      .profile-stats {
        display: flex;
        gap: 12px;
        margin-top: 8px;
        justify-content: center;
        width: -webkit-fill-available;
      }

      .profile-stats md-badge {
        cursor: pointer;
        width: -webkit-fill-available;
      }

      .trending-item {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
        cursor: pointer;
      }

      .trending-item .tag {
        font-weight: bold;
        font-size: 1rem;
      }

      .trending-item .count {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
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

      @media (max-width: 820px) {
        :host {
          display: none;
        }
      }
    `,
  ];

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

  private navigateToTag(tagName: string) {
    router.navigate(`/hashtag?tag=${tagName}`);
  }

  render() {
    return html`
      <div id="right-sidebar">
        ${this.isGuestMode ? this.renderGuestCard() : this.renderProfileCard()}
        ${this.renderTrendingTags()}
      </div>
    `;
  }

  private renderGuestCard() {
    return html`
      <div class="sidebar-card">
        <div id="profile-card-content">
          <md-icon
            name="person-circle"
            style="font-size: 64px; color: var(--md-sys-color-on-surface-variant);"
          ></md-icon>
          <h3>${msg('Welcome to Coho')}</h3>
          <p style="margin-bottom: 16px;">
            ${msg(
              "You're browsing as a guest. Sign in to interact with posts and access all features."
            )}
          </p>
          <md-button
            variant="filled"
            @click="${() => {
              setAuthRedirect(
                `${window.location.pathname}${window.location.search}${window.location.hash}`
              );
              router.navigate('/');
            }}"
            >${msg('Sign In')}</md-button
          >
        </div>
      </div>
    `;
  }

  private renderProfileCard() {
    return html`
      <div class="sidebar-card">
        <div id="profile-card-content">
          ${this.user && this.user.avatar
            ? html`<img
                src="${this.user.avatar}"
                alt="${this.user.display_name}"
              />`
            : html`<md-skeleton
                id="profile-avatar"
                shape="circle"
                width="80px"
                height="80px"
              ></md-skeleton>`}

          <div id="username-block">
            <h3>
              ${this.user
                ? this.user.display_name
                : html`<md-skeleton width="100px" height="25px"></md-skeleton>`}
            </h3>

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
            ${this.user
              ? this.user.url
              : html`<md-skeleton width="100px" height="19px"></md-skeleton>`}
          </p>

          <div class="profile-stats">
            <md-badge
              variant="outlined"
              clickable
              @click="${() => this.goToFollowers()}"
              >${this.user
                ? msg(str`${this.user.followers_count} followers`)
                : msg('0 followers')}
            </md-badge>
            <md-badge
              variant="outlined"
              clickable
              @click="${() => this.goToFollowing()}"
              >${this.user
                ? msg(str`${this.user.following_count} following`)
                : msg('0 following')}
            </md-badge>
          </div>
        </div>
      </div>
    `;
  }

  private renderTrendingTags() {
    // Show skeleton while loading
    if (this.trendingTagsLoading) {
      return html`
        <div class="sidebar-card">
          <h3>${msg('Trending Tags')}</h3>
          ${[1, 2, 3, 4, 5].map(
            () => html`
              <div class="trending-item">
                <md-skeleton width="60%" height="16px"></md-skeleton>
                <md-skeleton
                  width="40%"
                  height="12px"
                  style="margin-top: 4px;"
                ></md-skeleton>
              </div>
            `
          )}
        </div>
      `;
    }

    if (!this.trendingTags || this.trendingTags.length === 0) {
      return nothing;
    }

    return html`
      <div class="sidebar-card">
        <h3>${msg('Trending Tags')}</h3>
        ${this.trendingTags.slice(0, 5).map(
          (tag) => html`
            <div
              class="trending-item"
              @click="${() => this.navigateToTag(tag.name)}"
            >
              <span class="tag">#${tag.name}</span>
              <span class="count"
                >${msg(str`${tag.history?.[0]?.uses || 0} posts today`)}</span
              >
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-sidebar': HomeSidebar;
  }
}
