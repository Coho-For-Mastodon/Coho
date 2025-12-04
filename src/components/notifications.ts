import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router } from '../utils/router';
import { parseEmojis } from '../utils/emoji-parser';

import './user-profile';
import './timeline-item';
import './md/md-dialog';
import './md/md-switch';
import './md/md-button';

import './md/md-segmented-button';
import { Post } from '../interfaces/Post';

@customElement('app-notifications')
export class Notifications extends LitElement {
  @state() notifications = [];
  @state() subbed: boolean = false;
  @state() activeSegment: string = 'all';

  static styles = [
    css`
      :host {
        height: 91vh;
        display: flex;
        flex-direction: column;
        gap: 8px;

        contain: paint layout style;
        content-visibility: auto;
      }

      md-dialog#open-tweet-dialog {
        --md-dialog-max-width: 60vw;
        --md-dialog-max-height: 92vh;
      }

      md-segmented-button {
        margin-bottom: 16px;
      }

      .panel {
        display: none;
      }

      .panel.active {
        display: block;
      }

      @media (prefers-color-scheme: dark) {
        li {
          color: white;
        }
      }

      #notify-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      md-switch {
        font-size: var(--md-sys-typescale-body-medium-font-size);
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0;
        list-style: none;
        margin-top: 0px;

        height: 87.5vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }

      ul::-webkit-scrollbar {
        display: none;
      }

      .notify-header img {
        border-radius: 50%;
        height: 62px;
      }

      li {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
        cursor: pointer;

        background: var(--sl-panel-background-color);
        border-radius: 6px;
        padding: 10px;
        padding-right: 15px;
        padding-left: 15px;
      }

      li.follow {
        gap: 20p;
        justify-content: space-between;
        font-weight: bold;
      }

      li.follow div {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      li.reblog,
      li.favourite,
      li.mention,
      li.edit {
        display: flex;
        flex-direction: column;
      }

      li.reblog div,
      li.favourite div,
      li.mention div,
      li.edit div {
        display: flex;
        align-items: center;
        gap: 20px;
        width: 100%;
        font-weight: bold;
      }

      li.reblog timeline-item,
      li.favourite timeline-item,
      li.mention timeline-item,
      li.edit timeline-item {
        width: 100%;
      }

      #no {
        flex-direction: column;
        font-size: 1.4em;
        margin-top: 40px;
      }

      #no img {
        height: 400px;
      }

      #notify-actions {
        padding: 8px;
        border-radius: 6px;
        background: transparent;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      li .content-item {
        align-items: flex-start !important;
        flex-direction: column;
        font-weight: normal;
      }

      li .content-item p {
        font-weight: normal;
      }

            @media (max-width: 820px) {
        .notification-item {
          border-radius: 0;
    `,
  ];

  async firstUpdated() {
    //load notifications when this component is visible using intersectionObserver

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const { getNotifications } =
            await import('../services/notifications');
          const notificationsData = await getNotifications();
          console.log(notificationsData);

          this.notifications = notificationsData;

          // check push reg
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.pushManager) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              this.subbed = true;
            }
          }

          if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge();
          }

          observer.disconnect();
        }
      });
    }, options);

    observer.observe(this);
  }

  async clear() {
    const { getNotifications, clearNotifications } =
      await import('../services/notifications');
    await clearNotifications();

    const notificationsData = await getNotifications();
    console.log(notificationsData);

    this.notifications = notificationsData;
  }

  async sub(flag: boolean) {
    console.log('flag', flag);
    const { subToPush, unsubToPush } =
      await import('../services/notifications');

    if (flag === false) {
      await unsubToPush();
    } else {
      try {
        console.log('subscribing to push');
        await subToPush();
        this.subbed = true;
      } catch (err) {
        console.log(err);
      }
    }
  }

  async openPost(tweet: Post) {
    const serialized = encodeURIComponent(JSON.stringify(tweet));
    await router.navigate(`/home/post?${serialized}`);
  }

  render() {
    return html`
      <div id="notify-actions">
        <div id="notify-inner">
          <md-switch
            ?checked="${this.subbed}"
            @change="${($event: any) => this.sub($event.target.checked)}"
            >Notifications</md-switch
          >
        </div>
        <md-button
          variant="filled"
          pill
          size="small"
          @click="${() => this.clear()}"
          >Clear</md-button
        >
      </div>

      <md-segmented-button
        .value="${this.activeSegment}"
        @segment-change="${(e: CustomEvent) => this.activeSegment = e.detail.value}"
      >
        <md-segment value="all">All</md-segment>
        <md-segment value="mentions">Mentions</md-segment>
        <md-segment value="follows">Follows</md-segment>
      </md-segmented-button>

      <div class="panel ${this.activeSegment === 'all' ? 'active' : ''}">
        <ul>
          ${this.notifications && this.notifications.length > 0
        ? this.notifications.map((notification: any) => {
          return html`
                  ${notification.type === 'follow'
              ? html`
                        <li class="follow">
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>followed you</p>
                          </div>
                        </li>
                      `
              : null}
                  ${notification.type === 'reblog'
              ? html`
                        <li
                          class="reblog"
                          @click="${() => this.openPost(notification.status)}"
                        >
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>boosted your post</p>
                          </div>

                          <div
                            class="content-item"
                            .innerHTML="${parseEmojis(notification.status.content || '', notification.status.emojis || [])}"
                          ></div>
                        </li>
                      `
              : null}
                  ${notification.type === 'favourite'
              ? html`
                        <li
                          class="favourite"
                          @click="${() => this.openPost(notification.status)}"
                        >
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>liked your post</p>
                          </div>

                          <div
                            class="content-item"
                            .innerHTML="${parseEmojis(notification.status.content || '', notification.status.emojis || [])}"
                          ></div>
                        </li>
                      `
              : null}
                  ${notification.type === 'mention'
              ? html`
                        <li
                          class="mention"
                          @click="${() => this.openPost(notification.status)}"
                        >
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>mentioned you</p>
                          </div>

                          <div
                            class="content-item"
                            .innerHTML="${parseEmojis(notification.status.content || '', notification.status.emojis || [])}"
                          ></div>
                        </li>
                      `
              : null}
                  ${notification.type === 'update'
              ? html`
                        <li
                          class="edit"
                          @click="${() => this.openPost(notification.status)}"
                        >
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>edited a post</p>
                          </div>

                          <div
                            class="content-item"
                            .innerHTML="${parseEmojis(notification.status.content || '', notification.status.emojis || [])}"
                          ></div>
                        </li>
                      `
              : null}
                `;
        })
        : html`
                <li id="no">
                  <img src="/assets/notify-done.svg" alt="no notifications" />
                  <p>No notifications</p>
                </li>
              `}
        </ul>
      </div>

      <div class="panel ${this.activeSegment === 'mentions' ? 'active' : ''}">
        <ul>
          ${this.notifications && this.notifications.length > 0
        ? this.notifications.map((notification: any) => {
          return html`
                  ${notification.type === 'mention'
              ? html`
                        <li
                          class="mention"
                          @click="${() => this.openPost(notification.status)}"
                        >
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>mentioned you</p>
                          </div>

                          <div
                            class="content-item"
                            .innerHTML="${parseEmojis(notification.status.content || '', notification.status.emojis || [])}"
                          ></div>
                        </li>
                      `
              : null}
                `;
        })
        : html`
                <li id="no">
                  <img src="/assets/notify-done.svg" alt="no notifications" />
                  <p>No notifications</p>
                </li>
              `}
        </ul>
      </div>

      <div class="panel ${this.activeSegment === 'follows' ? 'active' : ''}">
        <ul>
          ${this.notifications && this.notifications.length > 0
        ? this.notifications.map((notification: any) => {
          return html`
                  ${notification.type === 'follow'
              ? html`
                        <li class="follow">
                          <div>
                            <user-profile
                              small
                              .account=${notification.account}
                            ></user-profile>

                            <p>followed you</p>
                          </div>
                        </li>
                      `
              : null}
                `;
        })
        : html`
                <li id="no">
                  <img src="/assets/notify-done.svg" alt="no notifications" />
                  <p>No notifications</p>
                </li>
              `}
        </ul>
      </div>
    `;
  }
}
