import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
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

import '../components/md/md-skeleton';

import '../components/md/md-badge';
import { Post } from '../interfaces/Post';
import { editPost } from '../services/posts';

@customElement('app-profile')
export class AppProfile extends LitElement {
  @state() user: any | undefined;
  @state() posts: any[] = [];
  @state() followed: boolean = false;
  @state() following: boolean = false;
  @state() muted: boolean = false;
  @state() blocked: boolean = false;
  @state() showMiniProfile: boolean = false;
  @state() selectedPost: Post | undefined = undefined;
  @state() isOwnProfile: boolean = false;
  @state() showReportDialog: boolean = false;

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
        height: 100vh;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      #profile {
        view-transition-name: profile-image;
        contain: paint;
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

      #edit-input-block md-text-area::part(textarea) {
        height: 200px;
      }

      h3 md-skeleton {
        width: 186px;
        height: 22px;
      }

      #user-url md-skeleton {
        width: 300px;
      }

      #bio-placeholder {
        display: flex;
        width: 60%;
        flex-direction: column;
        gap: 8px;
        height: 100px;
      }

      #bio-placeholder md-skeleton {
        height: 12px;
        width: 100%;
      }

      #avatar-block md-skeleton {
        height: -webkit-fill-available;
        width: -webkit-fill-available;
      }

      sl-badge {
        cursor: pointer;
      }

      #avatarSkel {
        width: 80px;
        height: 80px;
        border-radius: 50%;
      }

      #follower-info {
        display: flex;
        gap: 4px;
      }

      #fields {
        display: flex;
        overflow-x: auto;
        margin-top: 12px;

        flex-direction: row;
        flex-wrap: wrap;
        margin-top: 1em;
        gap: 12px;
      }

      #mutuals {
        color: white;
        background: var(--sl-color-primary-600);
        border-radius: 3px;
        padding: 6px;
        font-size: var(--md-sys-typescale-body-medium-font-size);
      }

      #mini-profile {
        position: fixed;
        top: 44px;
        background: rgb(98 99 105 / 19%);
        left: 15vw;
        right: 15vw;
        border-radius: 6px;
        backdrop-filter: blur(40px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px;

        z-index: 100;

        animation-name: slidedown;
        animation-duration: 0.3s;
      }

      #mini-profile p {
        padding: 8px;
        margin: 0;
        font-weight: bold;
      }

      #avatar-mini {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      #avatar-mini img {
        height: 40px;
        border-radius: 50%;
        border: solid 2px var(--sl-color-primary-600);
      }

      .field-name {
        font-weight: bold;
        margin-right: 4px;
        border-right: solid white 2px;
        padding-right: 6px;
      }

      .field-value a {
        max-width: 12em;
        overflow-x: hidden;
        display: block;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      main {
        padding-top: 60px;
        display: grid;
        gap: 14px;
        grid-template-columns: auto;
        padding-left: 22vw;
        padding-right: 22vw;
      }

      #profile-card-actions {
        margin-top: 2em;
        gap: 4px;

        display: flex;
        justify-content: flex-end;
        align-items: center;
        flex-direction: row;
      }

      #unfollow::part(control) {
        background: indianred;
      }

      #profile-card-actions sl-button::part(base) {
        width: 110px;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0px;
        padding: 0px;
        list-style: none;
        overflow: hidden scroll;

        border-radius: 6px;
      }

      #profile {
        padding-top: 0;
        border-radius: 6px;

        display: flex;
        flex-direction: column;
        justify-content: space-between;

        // animation-name: slideup;
        // animation-duration: 0.3s;
      }

      #fake-profile {
        padding: 12px;
        padding-top: 0;
        border-radius: 6px;

        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 400px;
      }

      #fake-profile md-skeleton {
        display: block;
        height: 400px;
      }

      #username-block {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: 8px;
      }

      #profile #avatar-block img {
        height: 5em;
        border: solid var(--sl-color-primary-600) 4px;
        position: relative;
        top: 6px;
        right: 2px;
        width: 5em;
        border-radius: 4px;
        object-fit: cover;
      }

      #fields sl-badge span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 400px;
      }

      #fields img {
        height: 22px;
      }

      #profile-top {
        padding: 0px;
        padding-left: 8px;
        padding-right: 8px;
        padding-bottom: 8px;
        padding-top: 8px;
        border-radius: 4px;

        background: rgb(32 32 35);

        overflow-x: hidden;
        text-overflow: ellipsis;

        min-height: 587px;
      }

      #avatar-block {
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        padding: 6px;
        border-radius: 4px;
        height: 280px;

        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-end;
        padding-bottom: 10px;
      }

      #profile-top h3 {
        margin-bottom: 0;
        margin-top: 0;
      }

      #profile-top p {
        color: white;
        font-size: var(--md-sys-typescale-body-large-font-size);
      }

      #user-url {
        margin-top: 4px;
        font-size: var(--md-sys-typescale-body-small-font-size);
      }

      @media (min-width: 1250px) {
        main {
          padding-left: 26vw;
          padding-right: 26vw;
        }

        #mini-profile {
          left: 26vw;
          right: 26vw;
        }
      }

      @media (max-width: 820px) {
        main {
          display: flex;
          flex-direction: column;

          padding-left: 10px;
          padding-right: 10px;
          padding-top: 60px;
        }

        ul {
          height: initial;
        }

        #mini-profile {
          right: 14px;
          left: 14px;
          bottom: 10px;
          top: initial;

          animation-name: slideup;
          animation-duration: 0.3s;
        }
      }

      @media (prefers-color-scheme: light) {
        #profile-top {
          background: white;
          color: black;
        }

        #profile-top p {
          color: black;
        }
      }

      @keyframes slideup {
        from {
          transform: translateY(30%);
          opacity: 0;
        }

        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slidedown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }

        to {
          transform: translateY(0);
          opacity: 1;
        }
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

      const accountData = await getAccount(id);
      console.log(accountData);
      this.user = accountData;

      const postsData = await getUsersPosts(id);
      console.log(postsData);

      this.posts = postsData;

      // Only check follow status if not viewing own profile
      if (!this.isOwnProfile) {
        const followCheck = await checkFollowing(id);
        console.log('followCheck', followCheck);
        this.followed = followCheck[0].following;

        const followedCheck = await isFollowingMe(id);
        console.log('followedCheck', followedCheck);
        this.following = followedCheck[0].followed_by;
        this.muted = followedCheck[0].muting;
        this.blocked = followedCheck[0].blocking;
      }
    }

    window.requestIdleCallback(() => {
      // set up intersection observer
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.8,
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          console.log('entry', entry);
          if (entry.isIntersecting) {
            console.log('intersecting', entry);

            window.requestIdleCallback(async () => {
              this.showMiniProfile = false;
            });
          } else {
            this.showMiniProfile = true;
          }
        });
      }, options);

      // get second child element of postsList
      const profileDiv = this.shadowRoot?.getElementById('profile');

      observer.observe(profileDiv!);
    });
  }

  async follow() {
    await followUser(this.user.id);
    this.followed = true;
  }

  async reloadPosts() {
    const postsData = await getUsersPosts(this.id);
    console.log(postsData);

    this.posts = postsData;
  }

  async unfollow() {
    await unfollowUser(this.user.id);
    this.followed = false;
  }

  async mute() {
    await muteUser(this.user.id);
    this.muted = true;
  }

  async unmute() {
    await unmuteUser(this.user.id);
    this.muted = false;
  }

  async block() {
    await blockUser(this.user.id);
    this.blocked = true;
  }

  async unblock() {
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
    const preview = this.shadowRoot?.getElementById('preview-content') as any;

    this.selectedPost = tweet;

    preview.innerHTML = tweet.content;

    const dialog = this.shadowRoot?.getElementById('edit') as any;
    dialog.show();
  }

  async confirmEdit() {
    const textArea = this.shadowRoot?.getElementById('content') as any;
    const newContent = textArea.value;

    await editPost(this.selectedPost!.id, newContent);

    const dialog = this.shadowRoot?.getElementById('edit') as any;
    dialog.hide();
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <md-dialog id="edit" label="Edit Post">
        <span id="preview-content"></span>

        <div id="edit-input-block">
          <md-text-area id="content"></md-text-area>

          <md-button @click=${() => this.confirmEdit()}>Save</md-button>
        </div>
      </md-dialog>

      <main>
        <div id="profile">
          <div id="profile-top">
            ${this.user
              ? html`
                  <div
                    id="avatar-block"
                    style=${styleMap({
                      backgroundImage: `url(${this.user.header})`,
                    })}
                  >
                    <img src="${this.user.avatar}" />
                  </div>
                `
              : html`<div id="avatar-block"><md-skeleton></md-skeleton></div>`}
            <div id="username-block">
              <h3>
                ${this.user
                  ? this.user.display_name
                  : html`<md-skeleton></md-skeleton>`}
              </h3>
            </div>

            <p id="user-url">
              ${this.user ? this.user.url : html`<md-skeleton></md-skeleton>`}
            </p>

            ${this.user && this.user.note
              ? html`
                  <div .innerHTML=${this.user ? this.user.note : ''}></div>
                `
              : html`
                  <div id="bio-placeholder">
                    <md-skeleton></md-skeleton>
                    <md-skeleton></md-skeleton>
                    <md-skeleton></md-skeleton>
                  </div>
                `}

            <div id="follower-info">
              <md-badge variant="filled"
                >${this.user ? this.user.followers_count : 0}
                followers</md-badge
              >
              <md-badge variant="filled"
                >${this.user ? this.user.following_count : 0}
                following</md-badge
              >
            </div>

            <div id="fields">
              ${this.user
                ? this.user.fields.map(
                    (field: any) => html`
                      <div>
                        <md-badge variant="outlined">
                          <span
                            class="field-name"
                            .innerHTML="${field.name}"
                          ></span>
                          <span
                            class="field-value"
                            .innerHTML="${field.value}"
                          ></span>
                        </md-badge>
                      </div>
                    `
                  )
                : null}
            </div>

            <div id="profile-card-actions">
              ${!this.isOwnProfile
                ? html`
                    ${this.followed && this.following
                      ? html`<md-button
                          variant="filled"
                          id="unfollow"
                          @click="${() => this.unfollow()}"
                          >Mutuals</md-button
                        >`
                      : this.followed
                        ? html`<md-button
                            id="unfollow"
                            @click="${() => this.unfollow()}"
                            variant="filled"
                            pill
                            >Unfollow</md-button
                          >`
                        : html`<md-button
                            pill
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
                              <md-icon
                                slot="prefix"
                                name="volume-mute"
                              ></md-icon>
                              Unmute @${this.user?.acct}
                            </md-menu-item>`
                          : html`<md-menu-item @click="${() => this.mute()}">
                              <md-icon
                                slot="prefix"
                                name="volume-mute"
                              ></md-icon>
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
          </div>
        </div>

        ${this.showMiniProfile && this.user
          ? html`
              <div id="mini-profile">
                <div id="avatar-mini">
                  <img src="${this.user.avatar}" />

                  <p>${this.user.display_name}</p>
                </div>

                ${!this.isOwnProfile
                  ? this.followed
                    ? html`<md-button pill disabled>Following</md-button>`
                    : html`<md-button
                        pill
                        variant="filled"
                        @click="${() => this.follow()}"
                        >Follow</md-button
                      >`
                  : null}
              </div>
            `
          : null}

        <ul class="scrollbar-hidden">
          ${this.posts.map(
            (post) => html`
              <li>
                <timeline-item
                  @edit="${($event: any) => this.editPost($event.detail.tweet)}"
                  @delete="${() => this.reloadPosts()}"
                  .tweet=${post}
                ></timeline-item>
              </li>
            `
          )}
        </ul>

        <report-dialog
          .open=${this.showReportDialog}
          .accountId=${this.user?.id || ''}
          .accountAcct=${this.user?.acct || ''}
          @report-submit=${this.handleReportSubmit}
          @report-cancel=${this.handleReportCancel}
        ></report-dialog>
      </main>
    `;
  }
}
