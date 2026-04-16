import { html, nothing, type TemplateResult } from 'lit';
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
import '../components/md/md-button';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';

// Lazy-loaded: only needed when posts have media or polls
let _carouselLoaded = false;
let _pollLoaded = false;
let _quotedPostLoaded = false;

function ensureCarousel(): void {
  if (!_carouselLoaded) {
    _carouselLoaded = true;
    import('../components/image-carousel');
  }
}

function ensurePoll(): void {
  if (!_pollLoaded) {
    _pollLoaded = true;
    import('../components/timeline-poll');
  }
}

function ensureQuotedPost(): void {
  if (!_quotedPostLoaded) {
    _quotedPostLoaded = true;
    import('../components/quoted-post');
  }
}

/**
 * Returns a provider label for display, preferring the explicit providerName
 * when available and otherwise deriving it from the URL hostname (without a
 * leading "www.").
 */
function getProviderDomain(url: string, providerName?: string): string {
  if (providerName) return providerName;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Renders a link preview card for a post.
 * Shows a vertical layout with large image when an image is present,
 * or a compact horizontal layout when there is no image.
 */
export function renderLinkCard(
  card: Post['card'] | null | undefined,
  openLinkCard: (url: string) => void,
  hasMediaAttachments: boolean = false
): TemplateResult | typeof nothing {
  // Don't render card if there's no card data
  if (!card) return nothing;

  // Suppress card when media attachments already exist (avoids redundancy)
  if (hasMediaAttachments) return nothing;

  const provider = getProviderDomain(card.url, card.provider_name);
  const hasImage = !!card.image;

  if (hasImage) {
    // Vertical "large" card layout: image on top, content below
    return html`
      <a
        href="${card.url}"
        target="_blank"
        rel="noopener noreferrer"
        @click="${(e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          openLinkCard(card.url || '');
        }}"
        class="link-card link-card--large link-card-link"
      >
        <img
          class="link-card-hero"
          src="${card.image}"
          alt="${card.title}"
          loading="lazy"
        />
        <div class="link-card-content">
          <h4>${card.title}</h4>
          ${card.description ? html`<p>${card.description}</p>` : nothing}
          ${provider
            ? html`<span class="link-card-provider">${provider}</span>`
            : nothing}
        </div>
      </a>
    `;
  }

  // Compact horizontal layout: no image
  return html`
    <a
      href="${card.url}"
      target="_blank"
      rel="noopener noreferrer"
      @click="${(e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        openLinkCard(card.url || '');
      }}"
      class="link-card link-card-link"
    >
      <div class="link-card-icon">
        <img src="/assets/bookmark-outline.svg" alt="" />
      </div>
      <div class="link-card-content">
        <h4>${card.title}</h4>
        ${card.description ? html`<p>${card.description}</p>` : nothing}
        ${provider
          ? html`<span class="link-card-provider">${provider}</span>`
          : nothing}
      </div>
    </a>
  `;
}

/**
 * Renders a quoted post embed (or placeholder) for a status that has a quote.
 * Only displays the full embed when the quote state is "accepted".
 */
function renderQuote(post: Post | undefined): TemplateResult | typeof nothing {
  if (!post?.quote) return nothing;

  const quote = post.quote;
  if (!('state' in quote)) return nothing;

  if (
    quote.state === 'accepted' &&
    'quoted_status' in quote &&
    quote.quoted_status
  ) {
    ensureQuotedPost();
    return html`<quoted-post .post=${quote.quoted_status}></quoted-post>`;
  }

  // Placeholders for non-displayable quote states
  switch (quote.state) {
    case 'accepted':
      // Accepted but no quoted_status — should not happen normally
      return nothing;
    case 'pending':
      return html`<div class="quote-placeholder">
        ${msg('Quote pending approval')}
      </div>`;
    case 'rejected':
      return html`<div class="quote-placeholder">
        ${msg('Quote was rejected')}
      </div>`;
    case 'revoked':
      return html`<div class="quote-placeholder">
        ${msg('Quote was revoked')}
      </div>`;
    case 'deleted':
      return html`<div class="quote-placeholder">
        ${msg('Quoted post was deleted')}
      </div>`;
    case 'unauthorized':
    case 'blocked_account':
    case 'blocked_domain':
    case 'muted_account':
      return html`<div class="quote-placeholder">
        ${msg('Hidden due to your filters')}
      </div>`;
  }
}

export interface TimelineItemHandlers {
  viewSensitive: () => void;
  viewThreadSensitive: (id: string) => void;
  viewReplySensitive: () => void;
  replies: (post?: Post) => void;
  bookmark: (id: string) => void;
  favorite: (id: string) => void;
  reblog: (id: string) => void;
  quotePost: (post: Post) => void;
  togglePin: () => void;
  muteConversation: () => void;
  addToList: (account: Account) => void;
  translatePost: (content: string | null, statusId?: string) => void;
  shareStatus: (tweet: Post | null) => void;
  deleteStatus: () => void;
  initEditStatus: () => void;
  viewEditHistory: (id: string) => void;
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
  blockDomain: (domain: string) => void;
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
  isMuted: boolean;
  canPin: boolean;
  loadingThread: boolean;
  threadExpanded: boolean;
  threadPosts: Post[];
  threadAncestors: Post[];
  threadDescendants: Post[];
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
    <md-card
      part="card"
      class="connected-bottom"
      @click="${() => handlers.openParentPost()}"
      style="cursor: pointer;"
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
      ${!state.tweet?.reply_to?.sensitive && state.tweet?.reply_to?.poll
        ? (ensurePoll(),
          html`<timeline-poll .post=${state.tweet.reply_to}></timeline-poll>`)
        : null}
      ${!state.tweet?.reply_to?.sensitive &&
      state.tweet?.reply_to?.media_attachments &&
      state.tweet.reply_to.media_attachments.length > 0
        ? (ensureCarousel(),
          html`
            <image-carousel
              .images="${state.tweet.reply_to.media_attachments}"
              .mediaArtist="${state.tweet.reply_to.account.display_name}"
              .mediaArtwork="${state.tweet.reply_to.account.avatar}"
            >
            </image-carousel>
          `)
        : html``}

      <div class="actions" slot="footer">
        ${state.show === true
          ? html`<md-button
              variant="text"
              pill
              size="small"
              style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
              aria-label="Reply"
              @click="${(e: Event) => {
                e.stopPropagation();
                handlers.replies(state.tweet?.reply_to);
              }}"
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
          @click="${(e: Event) => {
            e.stopPropagation();
            handlers.bookmark(state.tweet?.reply_to?.id || '');
          }}"
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
              @click="${(e: Event) => {
                e.stopPropagation();
                handlers.favorite(state.tweet?.reply_to?.id || '');
              }}"
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
              size="small"
              @click="${(e: Event) => {
                e.stopPropagation();
                handlers.reblog(state.tweet?.reply_to?.id || '');
              }}"
              >${state.tweet?.reply_to?.reblogs_count}
              <md-icon slot="suffix" name="repeat"></md-icon
            ></md-button>`
          : null}
      </div>
    </md-card>
    <div class="thread-connector-bar">
      <div class="thread-connector-line"></div>
    </div>
  `;
}

export function renderRegularTweet(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  const hasReplyTo = !!state.tweet?.reply_to;
  const hasContinuation = (state.tweet?.thread_continuation?.length ?? 0) > 0;

  return html`
    ${renderReplyContext(state, handlers)}

    <md-card
      part="card"
      class="${classMap({
        'connected-top': hasReplyTo,
        'connected-bottom': hasContinuation,
      })}"
    >
      <div class="header-actions-block" slot="header">
        <user-profile .account="${state.tweet?.account}"></user-profile>

        <div class="actions-right">
          <md-dropdown placement="bottom-end">
            <md-icon-button slot="trigger" name="ellipsis-vertical" label="${msg('More options')}" size="small"></md-icon-button>
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
                state.tweet?.edited_at
                  ? html`
                      <md-menu-item
                        @click="${() =>
                          handlers.viewEditHistory(state.tweet?.id || '')}"
                      >
                        <md-icon slot="prefix" name="time"></md-icon>
                        ${msg('View edit history')}
                      </md-menu-item>
                    `
                  : null
              }
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
                !state.guestMode
                  ? html`
                      <md-menu-item
                        @click="${() => handlers.muteConversation()}"
                      >
                        <md-icon
                          slot="prefix"
                          name="${state.isMuted || state.tweet?.muted
                            ? 'notifications'
                            : 'notifications-off'}"
                        ></md-icon>
                        ${state.isMuted || state.tweet?.muted
                          ? msg('Unmute conversation')
                          : msg('Mute conversation')}
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
                      ${state.tweet?.account.acct?.includes('@')
                        ? html`
                            <md-menu-item
                              @click="${() =>
                                handlers.blockDomain(
                                  state.tweet?.account.acct?.split('@')[1] || ''
                                )}"
                            >
                              <md-icon slot="prefix" name="ban"></md-icon>
                              ${msg(
                                str`Block domain ${state.tweet?.account.acct?.split('@')[1]}`
                              )}
                            </md-menu-item>
                          `
                        : null}
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
              ${
                state.tweet?.account.acct === state.currentUser?.acct
                  ? html`
                      <md-menu-item @click="${() => handlers.initEditStatus()}">
                        <md-icon slot="prefix" name="brush"></md-icon>
                        ${msg('Edit')}
                      </md-menu-item>
                      <md-menu-item @click="${() => handlers.deleteStatus()}">
                        <md-icon slot="prefix" name="trash"></md-icon>
                        ${msg('Delete')}
                      </md-menu-item>
                    `
                  : null
              }
            </md-menu>
          </md-dropdown>
        </div>
        </div>
      </div>

      <div
        @click="${(e: Event) =>
          handlers.handleContentClick(e, state.tweet, true)}"
        .innerHTML="${parseEmojis(state.tweet?.content || '', state.tweet?.emojis || [])}"
      ></div>

      ${
        state.tweet?.edited_at
          ? html`<button
              class="edited-indicator"
              @click="${(e: Event) => {
                e.stopPropagation();
                handlers.viewEditHistory(state.tweet?.id || '');
              }}"
            >
              ${msg('(edited)')}
            </button>`
          : null
      }

      ${
        !state.tweet?.sensitive && state.tweet?.poll
          ? (ensurePoll(),
            html`<timeline-poll .post=${state.tweet}></timeline-poll>`)
          : null
      }

      ${
        !state.tweet?.sensitive &&
        state.tweet &&
        state.tweet.media_attachments &&
        state.tweet.media_attachments.length > 0
          ? (ensureCarousel(),
            html`
              <image-carousel
                .images="${state.tweet.media_attachments}"
                mediaArtist="${state.tweet.account.display_name}"
                mediaArtwork="${state.tweet.account.avatar}"
              >
              </image-carousel>
            `)
          : html``
      }
      ${
        !state.tweet?.sensitive
          ? renderLinkCard(
              state.tweet?.card,
              handlers.openLinkCard,
              (state.tweet?.media_attachments?.length ?? 0) > 0
            )
          : null
      }
      ${renderQuote(state.tweet)}

      <div class="actions" slot="footer">
        ${
          state.show === true
            ? html`<md-button
                variant="text"
                pill
                size="small"
                style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
                aria-label="${msg('Reply')}"
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
          aria-pressed="${state.isBookmarked || state.tweet?.bookmarked ? 'true' : 'false'}"
          aria-label="${state.isBookmarked || state.tweet?.bookmarked ? 'Remove bookmark' : 'Bookmark'}"
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
                aria-pressed="${state.isBoosted || state.tweet?.favourited
                  ? 'true'
                  : 'false'}"
                aria-label="${state.isBoosted || state.tweet?.favourited
                  ? 'Unfavourite'
                  : 'Favourite'}"
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
                aria-pressed="${state.isReblogged || state.tweet?.reblogged
                  ? 'true'
                  : 'false'}"
                aria-label="${state.isReblogged || state.tweet?.reblogged
                  ? 'Undo boost'
                  : 'Boost'}"
                @click="${() => handlers.reblog(state.tweet?.id || '')}"
                >${state.tweet?.reblogs_count}
                <md-icon slot="suffix" name="repeat"></md-icon
              ></md-button>`
            : null
        }
        ${
          !state.guestMode &&
          state.tweet?.quote_approval?.current_user !== 'denied' &&
          state.tweet?.quote_approval?.current_user !== 'unknown'
            ? html`<md-button
                variant="text"
                style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
                pill
                size="small"
                aria-label="${state.tweet?.quote_approval?.current_user ===
                'manual'
                  ? msg('Request to quote')
                  : msg('Quote')}"
                title="${state.tweet?.quote_approval?.current_user === 'manual'
                  ? msg('Author will manually review')
                  : ''}"
                @click="${() => {
                  if (state.tweet) handlers.quotePost(state.tweet);
                }}"
              >
                <md-icon
                  slot="suffix"
                  src="/assets/quote-outline.svg"
                ></md-icon>
              </md-button>`
            : null
        }
      </div>
    </md-card>
    ${hasContinuation ? html`<div class="thread-connector-bar"><div class="thread-connector-line"></div></div>` : null}
    ${renderThreadContinuation(state, handlers)}
  `;
}

/**
 * Renders self-thread continuation posts with connector bars between cards.
 * Shown automatically when thread_continuation is populated by groupSelfThreads().
 */
export function renderThreadContinuation(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  const continuation = state.tweet?.thread_continuation;
  if (!continuation || continuation.length === 0) return null;

  return html`
    ${continuation.map((threadPost: Post, index: number) => {
      const isLast =
        index === continuation.length - 1 && !state.tweet?.thread_truncated;
      const hasMore = !isLast;

      return html`
        <md-card
          part="card"
          class="${classMap({
            'thread-continuation-card': true,
            'connected-top': true,
            'connected-bottom': hasMore,
          })}"
          @click="${(e: Event) =>
            handlers.handleContentClick(e, threadPost, true)}"
        >
          <user-profile .account="${threadPost.account}"></user-profile>
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
                    @click="${(e: Event) => {
                      e.stopPropagation();
                      handlers.viewThreadSensitive(threadPost.id);
                    }}"
                  >
                    ${msg('View')}
                    <md-icon slot="suffix" name="eye"></md-icon>
                  </md-button>
                </div>
              `
            : html`<div
                @click="${(e: Event) =>
                  handlers.handleContentClick(e, threadPost)}"
                .innerHTML="${parseEmojis(
                  threadPost.content || '',
                  threadPost.emojis || []
                )}"
              ></div>`}
          ${!threadPost.sensitive && threadPost.poll
            ? (ensurePoll(),
              html`<timeline-poll .post=${threadPost}></timeline-poll>`)
            : null}
          ${!threadPost.sensitive &&
          threadPost.media_attachments &&
          threadPost.media_attachments.length > 0
            ? (ensureCarousel(),
              html`
                <image-carousel
                  .images="${threadPost.media_attachments}"
                  mediaArtist="${threadPost.account.display_name}"
                  mediaArtwork="${threadPost.account.avatar}"
                >
                </image-carousel>
              `)
            : html``}
          ${!threadPost.sensitive
            ? renderLinkCard(
                threadPost.card,
                handlers.openLinkCard,
                (threadPost.media_attachments?.length ?? 0) > 0
              )
            : null}
          ${renderQuote(threadPost)}
          <div class="actions" slot="footer">
            <md-button
              variant="text"
              style="--md-sys-color-primary: ${threadPost.bookmarked
                ? 'var(--sl-color-primary-600)'
                : 'var(--md-sys-color-on-surface-variant)'}"
              pill
              size="small"
              aria-pressed="${threadPost.bookmarked ? 'true' : 'false'}"
              aria-label="${threadPost.bookmarked
                ? msg('Remove bookmark')
                : msg('Bookmark')}"
              @click="${(e: Event) => {
                e.stopPropagation();
                handlers.bookmark(threadPost.id);
              }}"
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
                  aria-pressed="${threadPost.favourited ? 'true' : 'false'}"
                  aria-label="${threadPost.favourited
                    ? msg('Unfavourite')
                    : msg('Favourite')}"
                  @click="${(e: Event) => {
                    e.stopPropagation();
                    handlers.favorite(threadPost.id);
                  }}"
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
                  aria-pressed="${threadPost.reblogged ? 'true' : 'false'}"
                  aria-label="${threadPost.reblogged
                    ? msg('Undo boost')
                    : msg('Boost')}"
                  @click="${(e: Event) => {
                    e.stopPropagation();
                    handlers.reblog(threadPost.id);
                  }}"
                  >${threadPost.reblogs_count}
                  <md-icon slot="suffix" name="repeat"></md-icon
                ></md-button>`
              : null}
            ${!state.guestMode &&
            threadPost.quote_approval?.current_user !== 'denied' &&
            threadPost.quote_approval?.current_user !== 'unknown'
              ? html`<md-button
                  variant="text"
                  style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
                  pill
                  size="small"
                  aria-label="${threadPost.quote_approval?.current_user ===
                  'manual'
                    ? msg('Request to quote')
                    : msg('Quote')}"
                  title="${threadPost.quote_approval?.current_user === 'manual'
                    ? msg('Author will manually review')
                    : ''}"
                  @click="${(e: Event) => {
                    e.stopPropagation();
                    handlers.quotePost(threadPost);
                  }}"
                >
                  <md-icon
                    slot="suffix"
                    src="/assets/quote-outline.svg"
                  ></md-icon>
                </md-button>`
              : null}
          </div>
        </md-card>
        ${hasMore
          ? html`<div class="thread-connector-bar">
              <div class="thread-connector-line"></div>
            </div>`
          : null}
      `;
    })}
    ${state.tweet?.thread_truncated && !state.threadExpanded
      ? html`
          <button
            type="button"
            class="thread-show-more button-reset"
            @click="${() => handlers.openPost()}"
          >
            <md-icon name="chatbox"></md-icon>
            ${msg('Show thread')}
          </button>
        `
      : null}
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
      <button
        type="button"
        class="boost-indicator button-reset"
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
      </button>
      <div class="header-block" slot="header">
        <user-profile
          ?small="${true}"
          .account="${state.tweet.reblog.account}"
        ></user-profile>
        <md-dropdown placement="bottom-end">
          <md-icon-button
            slot="trigger"
            name="ellipsis-vertical"
            label="${msg('More options')}"
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
            ${!state.guestMode
              ? html`
                  <md-menu-item @click="${() => handlers.muteConversation()}">
                    <md-icon
                      slot="prefix"
                      name="${state.isMuted || state.tweet?.reblog?.muted
                        ? 'notifications'
                        : 'notifications-off'}"
                    ></md-icon>
                    ${state.isMuted || state.tweet?.reblog?.muted
                      ? msg('Unmute conversation')
                      : msg('Mute conversation')}
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
                  ${state.tweet?.reblog?.account.acct?.includes('@')
                    ? html`
                        <md-menu-item
                          @click="${() =>
                            handlers.blockDomain(
                              state.tweet?.reblog?.account.acct?.split(
                                '@'
                              )[1] || ''
                            )}"
                        >
                          <md-icon slot="prefix" name="ban"></md-icon>
                          ${msg(
                            str`Block domain ${state.tweet?.reblog?.account.acct?.split('@')[1]}`
                          )}
                        </md-menu-item>
                      `
                    : null}
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

      ${!state.tweet.reblog.sensitive && state.tweet.reblog.poll
        ? (ensurePoll(),
          html`<timeline-poll .post=${state.tweet.reblog}></timeline-poll>`)
        : null}
      ${!state.tweet.reblog.sensitive &&
      state.tweet.reblog.media_attachments &&
      state.tweet.reblog.media_attachments.length > 0
        ? (ensureCarousel(),
          html`
            <image-carousel
              .images="${state.tweet.reblog.media_attachments}"
              mediaArtist="${state.tweet.reblog.account.display_name}"
              mediaArtwork="${state.tweet.reblog.account.avatar}"
            >
            </image-carousel>
          `)
        : html``}
      ${!state.tweet.reblog.sensitive
        ? renderLinkCard(
            state.tweet.reblog.card,
            handlers.openLinkCard,
            (state.tweet.reblog.media_attachments?.length ?? 0) > 0
          )
        : null}
      ${renderQuote(state.tweet?.reblog)}

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
        ${!state.guestMode &&
        state.tweet?.reblog?.quote_approval?.current_user !== 'denied' &&
        state.tweet?.reblog?.quote_approval?.current_user !== 'unknown'
          ? html`<md-button
              variant="text"
              style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
              pill
              size="small"
              aria-label="${state.tweet?.reblog?.quote_approval
                ?.current_user === 'manual'
                ? msg('Request to quote')
                : msg('Quote')}"
              title="${state.tweet?.reblog?.quote_approval?.current_user ===
              'manual'
                ? msg('Author will manually review')
                : ''}"
              @click="${() => {
                if (state.tweet?.reblog) handlers.quotePost(state.tweet.reblog);
              }}"
            >
              <md-icon slot="suffix" src="/assets/quote-outline.svg"></md-icon>
            </md-button>`
          : null}
      </div>
    </md-card>
  `;
}

export function renderThreadAncestors(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.threadExpanded || state.threadAncestors.length === 0) return null;

  return html`
    <div class="thread-continuation thread-ancestors">
      ${state.threadAncestors.map(
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
                  .innerHTML="${parseEmojis(
                    threadPost.content || '',
                    threadPost.emojis || []
                  )}"
                ></div>`}
            ${!threadPost.sensitive && threadPost.poll
              ? (ensurePoll(),
                html`<timeline-poll .post=${threadPost}></timeline-poll>`)
              : null}
            ${!threadPost.sensitive &&
            threadPost.media_attachments &&
            threadPost.media_attachments.length > 0
              ? (ensureCarousel(),
                html`
                  <image-carousel
                    .images="${threadPost.media_attachments}"
                    mediaArtist="${threadPost.account.display_name}"
                    mediaArtwork="${threadPost.account.avatar}"
                  >
                  </image-carousel>
                `)
              : html``}
            ${!threadPost.sensitive
              ? renderLinkCard(
                  threadPost.card,
                  handlers.openLinkCard,
                  (threadPost.media_attachments?.length ?? 0) > 0
                )
              : null}
          </md-card>
        `
      )}
    </div>
    <div class="thread-line"></div>
  `;
}

export function renderThread(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.threadExpanded || state.threadDescendants.length === 0)
    return null;
  const descendants = state.threadDescendants;

  return html`
    <div class="thread-line"></div>
    <div class="thread-continuation">
      ${descendants.map(
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
                  .innerHTML="${parseEmojis(
                    threadPost.content || '',
                    threadPost.emojis || []
                  )}"
                ></div>`}
            ${!threadPost.sensitive && threadPost.poll
              ? html`<timeline-poll .post=${threadPost}></timeline-poll>`
              : null}
            ${!threadPost.sensitive &&
            threadPost.media_attachments &&
            threadPost.media_attachments.length > 0
              ? html`
                  <image-carousel
                    .images="${threadPost.media_attachments}"
                    mediaArtist="${threadPost.account.display_name}"
                    mediaArtwork="${threadPost.account.avatar}"
                  >
                  </image-carousel>
                `
              : html``}
            ${!threadPost.sensitive
              ? renderLinkCard(
                  threadPost.card,
                  handlers.openLinkCard,
                  (threadPost.media_attachments?.length ?? 0) > 0
                )
              : null}
            <div class="actions" slot="footer">
              ${state.show === true
                ? html`<md-button
                    variant="text"
                    pill
                    size="small"
                    style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
                    aria-label="${msg('Reply')}"
                    @click="${(e: Event) => {
                      e.stopPropagation();
                      handlers.replies(threadPost);
                    }}"
                  >
                    <md-icon
                      slot="suffix"
                      src="/assets/chatbox-outline.svg"
                    ></md-icon>
                  </md-button>`
                : null}
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
