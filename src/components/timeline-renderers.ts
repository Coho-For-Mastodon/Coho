import { html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { msg, str } from '@lit/localize';
import { Post } from '../interfaces/Post';
import { parseEmojis } from '../utils/emoji-parser';
import type { Settings } from '../services/settings';
import type { Account } from '../mastodon/types';
import { router } from '../router/routes';

import '../components/user-profile';
import '../components/md/md-card';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/image-carousel';
import '../components/md/md-button';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/timeline-poll';

export interface TimelineItemHandlers {
  viewSensitive: () => void;
  viewThreadSensitive: (id: string) => void;
  viewReplySensitive: () => void;
  replies: () => void;
  bookmark: (id: string) => void;
  favorite: (id: string) => void;
  reblog: (id: string) => void;
  togglePin: () => void;
  addToList: (account: Account) => void;
  translatePost: (content: string | null, statusId?: string) => void;
  shareStatus: (tweet: Post | null) => void;
  deleteStatus: () => void;
  initEditStatus: () => void;
  openPost: () => void;
  openParentPost: () => void;
  openLinkCard: (url: string) => void;
  handleContentClick: (
    event: Event,
    post: Post | null | undefined,
    openPostOnNonLink?: boolean
  ) => void;
  showThread: () => void;
  muteUser: (accountId: string) => void;
  blockUser: (accountId: string) => void;
  reportUser: (
    accountId: string,
    accountAcct: string,
    statusId?: string
  ) => void;
}

export interface TimelineItemState {
  tweet: Post | undefined;
  show: boolean;
  currentUser: Account | null;
  settings: Settings | undefined;
  isBookmarked: boolean;
  isBoosted: boolean;
  isReblogged: boolean;
  canPin: boolean;
  loadingThread: boolean;
  threadExpanded: boolean;
  threadPosts: Post[];
  isOnDeviceTranslateAvailable: boolean;
  guestMode?: boolean;
}

export function renderSensitive(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  return html`
    <div class="sensitive">
      <span>${msg('Sensitive Content')}</span>
      <p>
        ${state.tweet?.reblog
          ? state.tweet.reblog.spoiler_text
          : state.tweet?.spoiler_text || msg('No spoiler text provided')}
      </p>

      <md-button variant="text" pill @click="${() => handlers.viewSensitive()}">
        ${msg('View')}
        <md-icon slot="suffix" name="eye"></md-icon>
      </md-button>
    </div>
  `;
}

export function renderReplyContext(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.tweet?.reply_to || !state.show) return null;

  return html`
    <div
      id="reply-to"
      @click="${() => handlers.openParentPost()}"
      style="cursor: pointer; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: var(--md-sys-color-primary);"
    >
      <md-icon name="chatbox"></md-icon>
      ${msg('Thread')}
    </div>

    <md-card
      part="card"
      @click="${() => handlers.openParentPost()}"
      style="margin-bottom: 16px;"
    >
      <user-profile .account="${state.tweet?.reply_to?.account}"></user-profile>
      ${state.tweet?.reply_to?.sensitive
        ? html`
            <div class="sensitive">
              <span>${msg('Sensitive Content')}</span>
              <p>
                ${state.tweet?.reply_to?.spoiler_text ||
                msg('No spoiler text provided')}
              </p>

              <md-button
                variant="text"
                pill
                @click="${(e: Event) => {
                  e.stopPropagation();
                  handlers.viewReplySensitive();
                }}"
              >
                ${msg('View')}
                <md-icon slot="suffix" name="eye"></md-icon>
              </md-button>
            </div>
          `
        : html`<div
            @click="${(e: Event) =>
              handlers.handleContentClick(e, state.tweet?.reply_to)}"
            .innerHTML="${parseEmojis(
              state.tweet?.reply_to?.content || '',
              state.tweet?.reply_to?.emojis || []
            )}"
          ></div>`}
      ${state.tweet?.reply_to?.poll
        ? html`<timeline-poll .post=${state.tweet.reply_to}></timeline-poll>`
        : null}
      ${state.tweet?.reply_to?.media_attachments &&
      state.tweet.reply_to.media_attachments.length > 0
        ? html`
            <image-carousel .images="${state.tweet.reply_to.media_attachments}">
            </image-carousel>
          `
        : html``}

      <div class="actions" slot="footer">
        ${state.show === true
          ? html`<md-button
              variant="text"
              pill
              size="small"
              style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
              @click="${() => handlers.replies()}"
            >
              <md-icon slot="suffix" name="chatbox"></md-icon>
            </md-button>`
          : null}

        <md-button
          variant="text"
          style="--md-sys-color-primary: ${state.isBookmarked ||
          state.tweet?.reply_to?.bookmarked
            ? 'var(--sl-color-primary-600)'
            : 'var(--md-sys-color-on-surface-variant)'}"
          pill
          size="small"
          @click="${() => handlers.bookmark(state.tweet?.reply_to?.id || '')}"
          ><md-icon slot="suffix" name="bookmark"></md-icon
        ></md-button>
        ${state.settings && state.settings.wellness === false
          ? html`<md-button
              variant="text"
              style="--md-sys-color-primary: ${state.isBoosted ||
              state.tweet?.reply_to?.favourited
                ? 'var(--sl-color-primary-600)'
                : 'var(--md-sys-color-on-surface-variant)'}"
              pill
              size="small"
              @click="${() =>
                handlers.favorite(state.tweet?.reply_to?.id || '')}"
              >${state.tweet?.reply_to?.favourites_count}
              <md-icon slot="suffix" name="heart"></md-icon
            ></md-button>`
          : null}
        ${state.settings && state.settings.wellness === false
          ? html`<md-button
              variant="text"
              style="--md-sys-color-primary: ${state.isReblogged ||
              state.tweet?.reply_to?.reblogged
                ? 'var(--sl-color-primary-600)'
                : 'var(--md-sys-color-on-surface-variant)'}"
              pill
              @click="${() => handlers.reblog(state.tweet?.reply_to?.id || '')}"
              >${state.tweet?.reply_to?.reblogs_count}
              <md-icon slot="suffix" name="repeat"></md-icon
            ></md-button>`
          : null}
      </div>
    </md-card>
  `;
}

export function renderRegularTweet(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  return html`
    ${renderReplyContext(state, handlers)}

    <md-card
      part="card"
      class="${classMap({
        replyCard: state.tweet?.reply_to ? true : false,
      })}"
    >
      <div class="header-actions-block" slot="header">
        <user-profile .account="${state.tweet?.account}"></user-profile>

        <div class="actions-right">
          <md-dropdown placement="bottom-end">
            <md-icon-button slot="trigger" name="ellipsis-vertical" label="More options" size="small"></md-icon-button>
            <md-menu>
              <md-menu-item @click="${() => handlers.translatePost(state.tweet?.content || null, state.tweet?.id)}" title=${ifDefined(state.isOnDeviceTranslateAvailable ? 'On-device AI' : undefined)}>
                <md-icon slot="prefix" name="language"></md-icon>
                ${msg('Translate')}
              </md-menu-item>
              ${
                !state.guestMode &&
                state.tweet?.account &&
                state.tweet?.account.id !== state.currentUser?.id
                  ? html`
                      <md-menu-item
                        @click=${() => handlers.addToList(state.tweet!.account)}
                      >
                        <md-icon slot="prefix" name="albums"></md-icon>
                        ${msg('Add to list')}
                      </md-menu-item>
                    `
                  : null
              }
              <md-menu-item @click="${() => handlers.shareStatus(state.tweet || null)}">
                <md-icon slot="prefix" name="share"></md-icon>
                ${msg('Share')}
              </md-menu-item>
              ${
                state.canPin
                  ? html`
                      <md-menu-item @click="${() => handlers.togglePin()}">
                        <md-icon slot="prefix" name="bookmark"></md-icon>
                        ${state.tweet?.pinned
                          ? msg('Unpin from profile')
                          : msg('Pin to profile')}
                      </md-menu-item>
                    `
                  : null
              }
              ${
                state.tweet?.account.id !== state.currentUser?.id
                  ? html`
                      <md-menu-item
                        @click="${() =>
                          handlers.muteUser(state.tweet?.account.id || '')}"
                      >
                        <md-icon slot="prefix" name="volume-mute"></md-icon>
                        ${msg(str`Mute @${state.tweet?.account.acct}`)}
                      </md-menu-item>
                      <md-menu-item
                        @click="${() =>
                          handlers.blockUser(state.tweet?.account.id || '')}"
                      >
                        <md-icon slot="prefix" name="ban"></md-icon>
                        ${msg(str`Block @${state.tweet?.account.acct}`)}
                      </md-menu-item>
                      <md-menu-item
                        @click="${() =>
                          handlers.reportUser(
                            state.tweet?.account.id || '',
                            state.tweet?.account.acct || '',
                            state.tweet?.id
                          )}"
                      >
                        <md-icon slot="prefix" name="flag"></md-icon>
                        ${msg(str`Report @${state.tweet?.account.acct}`)}
                      </md-menu-item>
                    `
                  : null
              }
            </md-menu>
          </md-dropdown>

          ${
            state.tweet?.account.acct === state.currentUser?.acct
              ? html`
                  <md-icon-button
                    @click="${() => handlers.deleteStatus()}"
                    name="trash"
                    label="Delete"
                  >
                  </md-icon-button>

                  <md-icon-button
                    @click="${() => handlers.initEditStatus()}"
                    name="brush"
                    label="Edit"
                  >
                  </md-icon-button>
                `
              : null
          }
        </div>
        </div>
      </div>

      <div
        @click="${(e: Event) =>
          handlers.handleContentClick(e, state.tweet, true)}"
        .innerHTML="${parseEmojis(state.tweet?.content || '', state.tweet?.emojis || [])}"
      ></div>

      ${
        state.tweet?.poll
          ? html`<timeline-poll .post=${state.tweet}></timeline-poll>`
          : null
      }

      ${
        state.tweet &&
        state.tweet.media_attachments &&
        state.tweet.media_attachments.length > 0
          ? html`
              <image-carousel .images="${state.tweet.media_attachments}">
              </image-carousel>
            `
          : html``
      }
      ${
        state.tweet && state.tweet.card
          ? html`
              <div
                @click="${() =>
                  handlers.openLinkCard(state.tweet?.card?.url || '')}"
                class="link-card"
              >
                <img
                  src="${state.tweet.card.image ||
                  '/assets/bookmark-outline.svg'}"
                  alt="${state.tweet.card.title}"
                />

                <div class="link-card-content">
                  <h4>${state.tweet.card.title}</h4>
                  <p>${state.tweet.card.description}</p>
                </div>
              </div>
            `
          : null
      }

      <div class="actions" slot="footer">
        ${
          state.show === true
            ? html`<md-button
                variant="text"
                pill
                size="small"
                style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
                @click="${() => handlers.replies()}"
              >
                <md-icon
                  slot="suffix"
                  src="/assets/chatbox-outline.svg"
                ></md-icon>
              </md-button>`
            : null
        }
        <md-button
          variant="text"
          style="--md-sys-color-primary: ${
            state.isBookmarked || state.tweet?.bookmarked
              ? 'var(--sl-color-primary-600)'
              : 'var(--md-sys-color-on-surface-variant)'
          }"
          pill
          size="small"
          @click="${() => handlers.bookmark(state.tweet?.id || '')}"
          ><md-icon slot="suffix" src="/assets/bookmark-outline.svg"></md-icon
        ></md-button>
        ${
          state.settings && state.settings.wellness === false
            ? html`<md-button
                variant="text"
                style="--md-sys-color-primary: ${state.isBoosted ||
                state.tweet?.favourited
                  ? 'var(--sl-color-primary-600)'
                  : 'var(--md-sys-color-on-surface-variant)'}"
                pill
                size="small"
                @click="${() => handlers.favorite(state.tweet?.id || '')}"
                >${state.tweet?.favourites_count}
                <md-icon slot="suffix" name="heart"></md-icon
              ></md-button>`
            : null
        }
        ${
          state.settings && state.settings.wellness === false
            ? html`<md-button
                variant="text"
                style="--md-sys-color-primary: ${state.isReblogged ||
                state.tweet?.reblogged
                  ? 'var(--sl-color-primary-600)'
                  : 'var(--md-sys-color-on-surface-variant)'}"
                pill
                size="small"
                @click="${() => handlers.reblog(state.tweet?.id || '')}"
                >${state.tweet?.reblogs_count}
                <md-icon slot="suffix" name="repeat"></md-icon
              ></md-button>`
            : null
        }
      </div>
    </md-card>
  `;
}

export function renderReblog(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.tweet?.reblog) return null;

  const boosterName =
    state.tweet.account.display_name || state.tweet.account.acct;

  return html`
    <md-card slot="card">
      <div
        class="boost-indicator"
        @click="${(e: Event) => {
          e.stopPropagation();
          router.navigate(`/account?id=${state.tweet?.account.id}`, {
            state: { account: state.tweet?.account },
          });
        }}"
      >
        <md-icon name="repeat"></md-icon>
        <img
          src="${state.tweet.account.avatar_static ||
          '/assets/icons/new-icons/icon-72x72.png'}"
          alt="${boosterName}"
        />
        <span
          class="booster-name"
          .innerHTML="${parseEmojis(
            boosterName,
            state.tweet.account.emojis || [],
            true
          )}"
        ></span>
        <span>${msg('boosted')}</span>
      </div>
      <div class="header-block" slot="header">
        <user-profile
          ?small="${true}"
          .account="${state.tweet.reblog.account}"
        ></user-profile>
        <md-dropdown placement="bottom-end">
          <md-icon-button
            slot="trigger"
            name="ellipsis-vertical"
            label="More options"
            size="small"
          ></md-icon-button>
          <md-menu>
            <md-menu-item
              @click="${() =>
                handlers.translatePost(
                  state.tweet?.reblog?.content || null,
                  state.tweet?.reblog?.id
                )}"
              title=${ifDefined(
                state.isOnDeviceTranslateAvailable ? 'On-device AI' : undefined
              )}
            >
              <md-icon slot="prefix" name="language"></md-icon>
              ${msg('Translate')}
            </md-menu-item>
            ${!state.guestMode &&
            state.tweet?.reblog?.account &&
            state.tweet?.reblog?.account.id !== state.currentUser?.id
              ? html`
                  <md-menu-item
                    @click=${() =>
                      handlers.addToList(state.tweet!.reblog!.account)}
                  >
                    <md-icon slot="prefix" name="albums"></md-icon>
                    ${msg('Add to list')}
                  </md-menu-item>
                `
              : null}
            <md-menu-item
              @click="${() => handlers.shareStatus(state.tweet || null)}"
            >
              <md-icon slot="prefix" name="share"></md-icon>
              ${msg('Share')}
            </md-menu-item>
            ${state.canPin
              ? html`
                  <md-menu-item @click="${() => handlers.togglePin()}">
                    <md-icon slot="prefix" name="bookmark"></md-icon>
                    ${state.tweet?.pinned
                      ? msg('Unpin from profile')
                      : msg('Pin to profile')}
                  </md-menu-item>
                `
              : null}
            ${state.tweet?.reblog?.account.id !== state.currentUser?.id
              ? html`
                  <md-menu-item
                    @click="${() =>
                      handlers.muteUser(state.tweet?.reblog?.account.id || '')}"
                  >
                    <md-icon slot="prefix" name="volume-mute"></md-icon>
                    ${msg(str`Mute @${state.tweet?.reblog?.account.acct}`)}
                  </md-menu-item>
                  <md-menu-item
                    @click="${() =>
                      handlers.blockUser(
                        state.tweet?.reblog?.account.id || ''
                      )}"
                  >
                    <md-icon slot="prefix" name="ban"></md-icon>
                    ${msg(str`Block @${state.tweet?.reblog?.account.acct}`)}
                  </md-menu-item>
                  <md-menu-item
                    @click="${() =>
                      handlers.reportUser(
                        state.tweet?.reblog?.account.id || '',
                        state.tweet?.reblog?.account.acct || '',
                        state.tweet?.reblog?.id
                      )}"
                  >
                    <md-icon slot="prefix" name="flag"></md-icon>
                    ${msg(str`Report @${state.tweet?.reblog?.account.acct}`)}
                  </md-menu-item>
                `
              : null}
          </md-menu>
        </md-dropdown>
      </div>

      <div
        @click="${(e: Event) =>
          handlers.handleContentClick(e, state.tweet?.reblog, true)}"
        .innerHTML="${parseEmojis(
          state.tweet.reblog.content || '',
          state.tweet.reblog.emojis || []
        )}"
      ></div>

      ${state.tweet.reblog.poll
        ? html`<timeline-poll .post=${state.tweet.reblog}></timeline-poll>`
        : null}
      ${state.tweet.reblog.media_attachments &&
      state.tweet.reblog.media_attachments.length > 0
        ? html`
            <image-carousel .images="${state.tweet.reblog.media_attachments}">
            </image-carousel>
          `
        : html``}
      ${state.tweet.reblog.card
        ? html`
            <div
              @click="${() =>
                handlers.openLinkCard(state.tweet?.reblog?.card?.url || '')}"
              class="link-card"
            >
              <img
                src="${state.tweet.reblog.card.image ||
                '/assets/bookmark-outline.svg'}"
                alt="${state.tweet.reblog.card.title}"
              />

              <div class="link-card-content">
                <h4>${state.tweet.reblog.card.title}</h4>
                <p>${state.tweet.reblog.card.description}</p>
              </div>
            </div>
          `
        : null}

      <div class="actions" slot="footer">
        ${state.show === true
          ? html`<md-button
              variant="text"
              pill
              size="small"
              style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
              @click="${() => handlers.replies()}"
            >
              <md-icon slot="suffix" name="chatbox"></md-icon>
            </md-button>`
          : null}
        <md-button
          variant="text"
          style="--md-sys-color-primary: ${state.isBookmarked
            ? 'var(--sl-color-primary-600)'
            : 'var(--md-sys-color-on-surface-variant)'}"
          pill
          size="small"
          @click="${() => handlers.bookmark(state.tweet?.id || '')}"
          ><md-icon slot="suffix" name="bookmark"></md-icon
        ></md-button>
        ${state.settings && state.settings.wellness === false
          ? html`<md-button
              variant="text"
              style="--md-sys-color-primary: ${state.isBoosted ||
              state.tweet?.favourited
                ? 'var(--sl-color-primary-600)'
                : 'var(--md-sys-color-on-surface-variant)'}"
              pill
              size="small"
              @click="${() => handlers.favorite(state.tweet?.id || '')}"
              >${state.tweet.reblog.favourites_count}
              <md-icon slot="suffix" name="heart"></md-icon
            ></md-button>`
          : null}
        ${state.settings && state.settings.wellness === false
          ? html`<md-button
              variant="text"
              style="--md-sys-color-primary: ${state.isReblogged ||
              state.tweet?.reblogged
                ? 'var(--sl-color-primary-600)'
                : 'var(--md-sys-color-on-surface-variant)'}"
              pill
              size="small"
              @click="${() => handlers.reblog(state.tweet?.id || '')}"
              >${state.tweet.reblog.reblogs_count}
              <md-icon slot="suffix" name="repeat"></md-icon
            ></md-button>`
          : null}
      </div>
    </md-card>
  `;
}

export function renderThread(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.threadExpanded || state.threadPosts.length === 0) return null;

  return html`
    <div class="thread-line"></div>
    <div class="thread-continuation">
      ${state.threadPosts.map(
        (threadPost: Post) => html`
          <md-card>
            <div class="header-block" slot="header">
              <user-profile
                ?small="${true}"
                .account="${threadPost.account}"
              ></user-profile>
            </div>
            ${threadPost.sensitive
              ? html`
                  <div class="sensitive">
                    <span>${msg('Sensitive Content')}</span>
                    <p>
                      ${threadPost.spoiler_text ||
                      msg('No spoiler text provided')}
                    </p>

                    <md-button
                      variant="text"
                      pill
                      @click="${() =>
                        handlers.viewThreadSensitive(threadPost.id)}"
                    >
                      ${msg('View')}
                      <md-icon slot="suffix" name="eye"></md-icon>
                    </md-button>
                  </div>
                `
              : html`<div
                  @click="${(e: Event) =>
                    handlers.handleContentClick(e, threadPost)}"
                  .innerHTML="${threadPost.content}"
                ></div>`}
            ${threadPost.poll
              ? html`<timeline-poll .post=${threadPost}></timeline-poll>`
              : null}
            ${threadPost.media_attachments &&
            threadPost.media_attachments.length > 0
              ? html`
                  <image-carousel .images="${threadPost.media_attachments}">
                  </image-carousel>
                `
              : html``}
            ${threadPost.card
              ? html`
                  <div
                    @click="${() =>
                      handlers.openLinkCard(threadPost.card?.url || '')}"
                    class="link-card"
                  >
                    <img
                      src="${threadPost.card.image ||
                      '/assets/bookmark-outline.svg'}"
                      alt="${threadPost.card.title}"
                    />

                    <div class="link-card-content">
                      <h4>${threadPost.card.title}</h4>
                      <p>${threadPost.card.description}</p>
                    </div>
                  </div>
                `
              : null}
            <div class="actions" slot="footer">
              <md-button
                variant="text"
                style="--md-sys-color-primary: ${threadPost.bookmarked
                  ? 'var(--sl-color-primary-600)'
                  : 'var(--md-sys-color-on-surface-variant)'}"
                pill
                size="small"
                @click="${() => handlers.bookmark(threadPost.id)}"
                ><md-icon slot="suffix" name="bookmark"></md-icon
              ></md-button>
              ${state.settings && state.settings.wellness === false
                ? html`<md-button
                    variant="text"
                    style="--md-sys-color-primary: ${threadPost.favourited
                      ? 'var(--sl-color-primary-600)'
                      : 'var(--md-sys-color-on-surface-variant)'}"
                    pill
                    size="small"
                    @click="${() => handlers.favorite(threadPost.id)}"
                    >${threadPost.favourites_count}
                    <md-icon slot="suffix" name="heart"></md-icon
                  ></md-button>`
                : null}
              ${state.settings && state.settings.wellness === false
                ? html`<md-button
                    variant="text"
                    style="--md-sys-color-primary: ${threadPost.reblogged
                      ? 'var(--sl-color-primary-600)'
                      : 'var(--md-sys-color-on-surface-variant)'}"
                    pill
                    size="small"
                    @click="${() => handlers.reblog(threadPost.id)}"
                    >${threadPost.reblogs_count}
                    <md-icon slot="suffix" name="repeat"></md-icon
                  ></md-button>`
                : null}
            </div>
          </md-card>
        `
      )}
    </div>
  `;
}
