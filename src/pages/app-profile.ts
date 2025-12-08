import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import {
  checkFollowing,
  followUser,
  getAccount,
  getUsersPosts,
  isFollowingMe,
  unfollowUser,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
  reportUser,
  type ProfilePostsFilter,
} from '../services/account';

import '../components/timeline-item';
import '../components/md/md-dialog';
import '../components/md/md-text-area';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/report-dialog';
import type { ReportSubmitDetail } from '../components/report-dialog';
import type { MdDialog } from '../components/md/md-dialog';
import type { MdTextArea } from '../components/md/md-text-area';
import type { Account } from '../mastodon/types';

import '../components/md/md-skeleton';
import '../components/md/md-segmented-button';
import '../components/md/md-divider';

import '../components/md/md-badge';
import { Post } from '../interfaces/Post';
import { editPost } from '../services/posts';

@customElement('app-profile')
export class AppProfile extends LitElement {
  @state() user: Account | undefined;
  @state() posts: Post[] = [];
  @state() followed: boolean = false;
  @state() following: boolean = false;
  @state() muted: boolean = false;
  @state() blocked: boolean = false;
  @state() selectedPost: Post | undefined = undefined;
  @state() isOwnProfile: boolean = false;
  @state() showReportDialog: boolean = false;
  @state() activeSegment: ProfilePostsFilter = 'posts';
  @state() loadingPosts: boolean = false;
  @state() loadingProfile: boolean = true;
  @state() profileLoadFailed: boolean = false;

  @query('#preview-content') private previewContent!: HTMLElement;
  @query('#edit') private editDialog!: MdDialog;
  @query('#content') private contentTextArea!: MdTextArea;

  static styles = [
    css`
      :host {
        display: block;
        overflow-y: auto;
        height: 100vh;
      }

      * {
        box-sizing: border-box;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      #edit-input-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      a {
        color: var(--md-sys-color-primary);
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      #edit-input-block md-text-area::part(textarea) {
        height: 200px;
      }

      /* Banner section */
      #banner {
        width: 100%;
        height: 200px;
        background: linear-gradient(
          135deg,
          var(--md-sys-color-surface-container-low) 0%,
          var(--md-sys-color-surface-container) 50%,
          var(--md-sys-color-surface-container-high) 100%
        );
        background-size: cover;
        background-position: center;
        position: relative;
      }

      #banner-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #banner-skeleton {
        width: 100%;
        height: 100%;
      }

      /* Profile header section */
      #profile-header {
        position: relative;
        padding: 0 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      #avatar-container {
        position: absolute;
        top: -64px;
        left: 16px;
      }

      #avatar {
        width: 128px;
        height: 128px;
        border-radius: 50%;
        border: 4px solid
          var(--md-sys-color-surface, var(--md-sys-color-background));
        object-fit: cover;
        background: var(--md-sys-color-surface, var(--md-sys-color-background));
      }

      #avatar-skeleton {
        width: 128px;
        height: 128px;
        border-radius: 50%;
        border: 4px solid
          var(--md-sys-color-surface, var(--md-sys-color-background));
      }

      /* Actions row (follow button, etc.) */
      #actions-row {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 12px 0;
        gap: 8px;
        min-height: 68px;
      }

      #actions-row md-button {
        font-weight: 700;
        min-width: 100px;
      }

      /* Profile info */
      #profile-info {
        padding: 0 0 16px 0;
      }

      #display-name {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
        color: var(--md-sys-color-on-surface);
        line-height: 1.2;
      }

      #display-name-skeleton {
        height: 24px;
        width: 180px;
        margin-bottom: 4px;
      }

      #handle {
        font-size: 15px;
        color: var(--md-sys-color-on-surface-variant);
        margin: 2px 0 12px 0;
      }

      #handle-skeleton {
        height: 18px;
        width: 140px;
      }

      #bio {
        font-size: 15px;
        line-height: 1.4;
        color: var(--md-sys-color-on-surface);
        margin: 12px 0;
        word-wrap: break-word;
      }

      #bio a {
        color: var(--md-sys-color-primary);
      }

      #bio-skeleton {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 12px 0;
      }

      #bio-skeleton md-skeleton {
        height: 16px;
      }

      #bio-skeleton md-skeleton:first-child {
        width: 100%;
      }

      #bio-skeleton md-skeleton:nth-child(2) {
        width: 90%;
      }

      #bio-skeleton md-skeleton:last-child {
        width: 60%;
      }

      /* Stats row */
      #stats-row {
        display: flex;
        gap: 20px;
        margin: 12px 0;
      }

      .stat {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      .stat:hover {
        opacity: 0.8;
      }

      .stat-count {
        font-weight: 700;
        font-size: 14px;
        color: var(--md-sys-color-on-surface);
      }

      .stat-label {
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
      }

      /* Mutuals badge */
      #mutuals-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        padding: 4px 10px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }

      /* Fields section */
      #fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .field-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .field-name {
        font-size: 13px;
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 500;
      }

      .field-value {
        font-size: 15px;
        color: var(--md-sys-color-on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .field-value a {
        color: var(--md-sys-color-primary);
        text-decoration: none;
      }

      .field-value a:hover {
        text-decoration: underline;
      }

      #fields img {
        height: 18px;
        vertical-align: middle;
      }

      /* Tabs section */
      #tabs-container {
        border-top: 1px solid var(--md-sys-color-outline-variant);
        max-width: 600px;
        margin: 0 auto;
        padding: 0 16px;
        padding-top: 16px !important;

        margin-top: 1em;
        margin-bottom: 2em;
      }

      md-segmented-button {
        width: 100%;
        margin: 0;
      }

      /* Posts list */
      #posts-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 0 16px;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      ul li {
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }

      .posts-loading {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Responsive */
      @media (min-width: 640px) {
        #banner {
          height: 200px;
        }

        #avatar {
          width: 134px;
          height: 134px;
        }

        #avatar-skeleton {
          width: 134px;
          height: 134px;
        }

        #avatar-container {
          top: -67px;
        }

        #display-name {
          font-size: 22px;
        }
      }

      @media (max-width: 640px) {
        #profile-header {
          padding: 0 12px;
        }

        #avatar-container {
          left: 12px;
          top: -50px;
        }

        #avatar {
          width: 100px;
          height: 100px;
        }

        #avatar-skeleton {
          width: 100px;
          height: 100px;
        }

        #actions-row {
          min-height: 54px;
        }

        #tabs-container,
        #posts-container {
          padding: 0 12px;
        }

        #display-name {
          font-size: 18px;
        }

        #handle,
        #bio {
          font-size: 14px;
        }
      }

      /* Animation */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #profile-info {
        animation: fadeIn 0.3s ease-out;
      }

      /* Offline fallback */
      #offline-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
        gap: 16px;
        margin-top: 60px;
      }

      #offline-message md-icon {
        font-size: 48px;
        color: var(--md-sys-color-on-surface-variant);
      }

      #offline-message h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface);
      }

      #offline-message p {
        margin: 0;
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
        max-width: 300px;
      }
    `,
  ];

  async firstUpdated() {
    // get id from query string
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      // Check if viewing own profile
      const currentUserID = localStorage.getItem('currentUserID');
      this.isOwnProfile = currentUserID === id;

      this.loadingProfile = true;
      this.profileLoadFailed = false;

      const accountData = await getAccount(id);
      console.log(accountData);

      if (accountData) {
        this.user = accountData;
      } else {
        // Profile couldn't be loaded (offline with no cache)
        this.profileLoadFailed = true;
        this.loadingProfile = false;
        return;
      }

      const postsData = await getUsersPosts(id);
      console.log(postsData);

      this.posts = Array.isArray(postsData) ? postsData : [];
      this.loadingProfile = false;

      // Only check follow status if not viewing own profile
      if (!this.isOwnProfile) {
        try {
          const followCheck = await checkFollowing(id);
          console.log('followCheck', followCheck);
          if (Array.isArray(followCheck) && followCheck[0]) {
            this.followed = followCheck[0].following;
          }

          const followedCheck = await isFollowingMe(id);
          console.log('followedCheck', followedCheck);
          if (Array.isArray(followedCheck) && followCheck[0]) {
            this.following = followedCheck[0].followed_by;
            this.muted = followedCheck[0].muting;
            this.blocked = followedCheck[0].blocking;
          }
        } catch (error) {
          console.log('Error checking follow status:', error);
        }
      }
    }
  }

  async follow() {
    if (!this.user) return;
    await followUser(this.user.id);
    this.followed = true;
  }

  async reloadPosts() {
    if (!this.user) return;
    this.loadingPosts = true;
    const postsData = await getUsersPosts(this.user.id, this.activeSegment);
    console.log(postsData);

    this.posts = postsData;
    this.loadingPosts = false;
  }

  async handleSegmentChange(e: CustomEvent<{ value: string }>) {
    const newSegment = e.detail.value as ProfilePostsFilter;
    if (newSegment === this.activeSegment) return;

    this.activeSegment = newSegment;
    await this.reloadPosts();
  }

  async unfollow() {
    if (!this.user) return;
    await unfollowUser(this.user.id);
    this.followed = false;
  }

  async mute() {
    if (!this.user) return;
    await muteUser(this.user.id);
    this.muted = true;
  }

  async unmute() {
    if (!this.user) return;
    await unmuteUser(this.user.id);
    this.muted = false;
  }

  async block() {
    if (!this.user) return;
    await blockUser(this.user.id);
    this.blocked = true;
  }

  async unblock() {
    if (!this.user) return;
    await unblockUser(this.user.id);
    this.blocked = false;
  }

  openReportDialog() {
    this.showReportDialog = true;
  }

  async handleReportSubmit(e: CustomEvent<ReportSubmitDetail>) {
    const detail = e.detail;

    try {
      await reportUser(detail.accountId, {
        comment: detail.comment,
        category: detail.category,
        forward: detail.forward,
      });

      this.showReportDialog = false;
    } catch (error) {
      console.error('Failed to submit report:', error);
    }
  }

  handleReportCancel() {
    this.showReportDialog = false;
  }

  editPost(tweet: Post) {
    console.log('edit post', tweet);

    this.selectedPost = tweet;

    if (this.previewContent) {
      this.previewContent.innerHTML = tweet.content;
    }

    this.editDialog?.show();
  }

  async confirmEdit() {
    const newContent = this.contentTextArea?.value;

    if (newContent && this.selectedPost) {
      await editPost(this.selectedPost.id, newContent);
    }

    this.editDialog?.hide();
  }

  private goToFollowers() {
    if (this.user) {
      window.location.href = `/followers?id=${this.user.id}`;
    }
  }

  private goToFollowing() {
    if (this.user) {
      window.location.href = `/following?id=${this.user.id}`;
    }
  }

  render() {
    // Show offline fallback if profile couldn't be loaded
    if (this.profileLoadFailed) {
      return html`
        <app-header ?enableBack="${true}"></app-header>
        <div id="offline-message">
          <md-icon name="cloud-offline"></md-icon>
          <h2>Profile unavailable</h2>
          <p>
            This profile hasn't been viewed before and can't be loaded while
            offline.
          </p>
          <md-button variant="filled" @click="${() => window.location.reload()}"
            >Try again</md-button
          >
        </div>
      `;
    }

    return html`
      <app-header ?enableBack="${true}"></app-header>

      <md-dialog id="edit" label="Edit Post">
        <span id="preview-content"></span>

        <div id="edit-input-block">
          <md-text-area id="content"></md-text-area>

          <md-button @click=${() => this.confirmEdit()}>Save</md-button>
        </div>
      </md-dialog>

      <!-- Banner -->
      <div id="banner">
        ${this.user?.header
          ? html`<img
              id="banner-img"
              src="${this.user.header}"
              alt="Profile banner"
            />`
          : html`<md-skeleton id="banner-skeleton"></md-skeleton>`}
      </div>

      <!-- Profile Header -->
      <div id="profile-header">
        <!-- Avatar (overlapping banner) -->
        <div id="avatar-container">
          ${this.user?.avatar
            ? html`<img
                id="avatar"
                src="${this.user.avatar}"
                alt="${this.user.display_name}'s avatar"
              />`
            : html`<md-skeleton id="avatar-skeleton"></md-skeleton>`}
        </div>

        <!-- Actions row (follow, menu) -->
        <div id="actions-row">
          ${!this.isOwnProfile && this.user
            ? html`
                ${this.followed
                  ? html`<md-button
                      variant="outlined"
                      @click="${() => this.unfollow()}"
                      >Following</md-button
                    >`
                  : html`<md-button
                      variant="filled"
                      @click="${() => this.follow()}"
                      >Follow</md-button
                    >`}
                <md-dropdown placement="bottom-end">
                  <md-icon-button
                    slot="trigger"
                    name="ellipsis-vertical"
                    label="More options"
                  ></md-icon-button>
                  <md-menu>
                    ${this.muted
                      ? html`<md-menu-item @click="${() => this.unmute()}">
                          <md-icon slot="prefix" name="volume-mute"></md-icon>
                          Unmute @${this.user?.acct}
                        </md-menu-item>`
                      : html`<md-menu-item @click="${() => this.mute()}">
                          <md-icon slot="prefix" name="volume-mute"></md-icon>
                          Mute @${this.user?.acct}
                        </md-menu-item>`}
                    ${this.blocked
                      ? html`<md-menu-item @click="${() => this.unblock()}">
                          <md-icon slot="prefix" name="ban"></md-icon>
                          Unblock @${this.user?.acct}
                        </md-menu-item>`
                      : html`<md-menu-item @click="${() => this.block()}">
                          <md-icon slot="prefix" name="ban"></md-icon>
                          Block @${this.user?.acct}
                        </md-menu-item>`}
                    <md-menu-item @click="${() => this.openReportDialog()}">
                      <md-icon slot="prefix" name="flag"></md-icon>
                      Report @${this.user?.acct}
                    </md-menu-item>
                  </md-menu>
                </md-dropdown>
              `
            : null}
        </div>

        <!-- Profile Info -->
        <div id="profile-info">
          ${this.user
            ? html`
                <h1 id="display-name">${this.user.display_name}</h1>
                <p id="handle">@${this.user.acct}</p>

                ${this.followed && this.following
                  ? html`<span id="mutuals-badge">
                      <md-icon name="people" style="font-size: 14px;"></md-icon>
                      Mutuals
                    </span>`
                  : null}
                ${this.user.note
                  ? html`<div id="bio" .innerHTML=${this.user.note}></div>`
                  : null}

                <div id="stats-row">
                  <span class="stat" @click="${() => this.goToFollowing()}">
                    <span class="stat-count"
                      >${(
                        this.user.following_count ?? 0
                      ).toLocaleString()}</span
                    >
                    <span class="stat-label">Following</span>
                  </span>
                  <span class="stat" @click="${() => this.goToFollowers()}">
                    <span class="stat-count"
                      >${(
                        this.user.followers_count ?? 0
                      ).toLocaleString()}</span
                    >
                    <span class="stat-label">Followers</span>
                  </span>
                </div>

                ${this.user.fields && this.user.fields.length > 0
                  ? html`
                      <div id="fields">
                        ${this.user.fields.map(
                          (field) => html`
                            <div class="field-row">
                              <span
                                class="field-name"
                                .innerHTML="${field.name}"
                              ></span>
                              <span
                                class="field-value"
                                .innerHTML="${field.value}"
                              ></span>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : null}
              `
            : html`
                <md-skeleton id="display-name-skeleton"></md-skeleton>
                <md-skeleton id="handle-skeleton"></md-skeleton>
                <div id="bio-skeleton">
                  <md-skeleton></md-skeleton>
                  <md-skeleton></md-skeleton>
                  <md-skeleton></md-skeleton>
                </div>
              `}
        </div>
      </div>

      <!-- Tabs -->
      <div id="tabs-container">
        <md-segmented-button
          .value="${this.activeSegment}"
          @segment-change="${(e: CustomEvent) => this.handleSegmentChange(e)}"
        >
          <md-segment value="posts">Posts</md-segment>
          <md-segment value="posts_replies">Replies</md-segment>
          <md-segment value="media">Media</md-segment>
        </md-segmented-button>
      </div>

      <!-- Posts -->
      <div id="posts-container">
        <ul class="${this.loadingPosts ? 'posts-loading' : ''}">
          ${this.posts.map(
            (post) => html`
              <li>
                <timeline-item
                  @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                    this.editPost(e.detail.tweet)}"
                  @delete="${() => this.reloadPosts()}"
                  .tweet=${post}
                ></timeline-item>
              </li>
            `
          )}
        </ul>
      </div>

      <report-dialog
        .open=${this.showReportDialog}
        .accountId=${this.user?.id || ''}
        .accountAcct=${this.user?.acct || ''}
        @report-submit=${this.handleReportSubmit}
        @report-cancel=${this.handleReportCancel}
      ></report-dialog>
    `;
  }
}
