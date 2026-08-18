import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { msg, str } from '@lit/localize';
import { Post } from '../interfaces/Post';
import { parseEmojis } from '../utils/emoji-parser';
import type { Settings } from '../services/settings';
import type { Account } from '../mastodon/types';
import { router } from '../router/routes';
import {
  handleMentionMouseOver,
  handleMentionMouseLeave,
} from '../utils/content-links';

import '../components/user-profile';
import '../components/md/md-card';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-button';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';

// Lazy-loaded: only needed when posts have media or polls
let _imageGridLoaded = false;
let _pollLoaded = false;
let _quotedPostLoaded = false;

function ensureImageGrid(): void {
  if (!_imageGridLoaded) {
    _imageGridLoaded = true;
    import('../components/image-grid');
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
 * Renders the Material-styled "Sensitive Content" block with an icon,
 * spoiler text, and a tonal "View" action.
 */
function renderSensitiveBlock(
  spoilerText: string | undefined | null,
  onView: (e: Event) => void
) {
  const hasSpoiler = !!spoilerText && spoilerText.trim().length > 0;
  return html`
    <div
      class="sensitive"
      role="group"
      aria-label="${msg('Sensitive Content')}"
    >
      <div class="sensitive-icon" aria-hidden="true">
        <md-icon name="eye-off"></md-icon>
      </div>
      <div class="sensitive-title">${msg('Sensitive Content')}</div>
      <p class="sensitive-text ${hasSpoiler ? '' : 'sensitive-text--muted'}">
        ${hasSpoiler ? spoilerText : msg('No spoiler text provided')}
      </p>
      <md-button
        class="sensitive-action"
        variant="tonal"
        pill
        @click="${onView}"
      >
        ${msg('View')}
        <md-icon slot="suffix" name="eye"></md-icon>
      </md-button>
    </div>
  `;
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
  const cardWidth =
    typeof card.width === 'number' && card.width > 0 ? card.width : 16;
  const cardHeight =
    typeof card.height === 'number' && card.height > 0 ? card.height : 9;
  const heroAspectRatio = `${cardWidth} / ${cardHeight}`;

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
          decoding="async"
          width="${cardWidth}"
          height="${cardHeight}"
          style="aspect-ratio: ${heroAspectRatio};"
        />
        <div class="link-card-content">
          <h4>${card.title}</h4>
          ${card.description ? html`<p>${card.description}</p>` : nothing}
          ${
            provider
              ? html`<span class="link-card-provider">${provider}</span>`
              : nothing
          }
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
        ${
          provider
            ? html`<span class="link-card-provider">${provider}</span>`
            : nothing
        }
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

interface PostContentConfig {
  post: Post;
  handlers: TimelineItemHandlers;
}

interface ActionsConfig {
  post: Post;
  state: TimelineItemState;
  handlers: TimelineItemHandlers;
}

/**
 * Returns the appropriate CSS variable for an action button based on active state.
 */
function getActionButtonColor(isActive: boolean): string {
  return isActive
    ? 'var(--sl-color-primary-600)'
    : 'var(--md-sys-color-on-surface-variant)';
}

/**
 * Returns the count for an action (e.g., favorites_count, reblogs_count),
 * respecting wellness settings that hide counts.
 */
function getActionCount(
  post: Post,
  field: 'favourites_count' | 'reblogs_count',
  settings?: Settings
): string {
  if (settings?.wellness) return '';
  return post[field]?.toString() || '0';
}

/**
 * Check if a post is bookmarked (considers both optimistic and server state).
 */
function isBookmarked(post: Post, state: TimelineItemState): boolean {
  return state.isBookmarked || post.bookmarked;
}

/**
 * Check if a post is favorited (considers both optimistic and server state).
 */
function isFavorited(post: Post, state: TimelineItemState): boolean {
  return state.isBoosted || post.favourited;
}

/**
 * Check if a post is reblogged (considers both optimistic and server state).
 */
function isReblogged(post: Post, state: TimelineItemState): boolean {
  return state.isReblogged || post.reblogged;
}

/**
 * Renders the media content pipeline for a post: poll → media → link card → quote.
 * Called after the post's text content, only when the post is not sensitive.
 */
function renderPostMediaContent(
  config: PostContentConfig
): TemplateResult | typeof nothing {
  const { post, handlers } = config;

  if (post.sensitive) return nothing;

  return html`
    ${
      post.poll
        ? (ensurePoll(), html`<timeline-poll .post=${post}></timeline-poll>`)
        : null
    }
    ${
      post.media_attachments && post.media_attachments.length > 0
        ? (ensureImageGrid(),
          html`
            <image-grid
              .images="${post.media_attachments}"
              mediaArtist="${post.account.display_name}"
              mediaArtwork="${post.account.avatar}"
            >
            </image-grid>
          `)
        : html``
    }
    ${renderLinkCard(
      post.card,
      handlers.openLinkCard,
      (post.media_attachments?.length ?? 0) > 0
    )}
    ${renderQuote(post)}
  `;
}

/**
 * Renders the unified social action buttons: Reply, Bookmark, Favorite, Reblog, Quote.
 */
function renderSocialActions(config: ActionsConfig): TemplateResult {
  const { post, state, handlers } = config;

  return html`
    ${
      state.show === true
        ? html`<md-button
            variant="text"
            pill
            size="small"
            style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
            aria-label="${msg('Reply')}"
            @click="${() => handlers.replies(post)}"
          >
            <md-icon slot="suffix" src="/assets/chatbox-outline.svg"></md-icon>
          </md-button>`
        : null
    }
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(
        isBookmarked(post, state)
      )}"
      pill
      size="small"
      aria-pressed="${isBookmarked(post, state) ? 'true' : 'false'}"
      aria-label="${
        isBookmarked(post, state) ? msg('Remove bookmark') : msg('Bookmark')
      }"
      @click="${() => handlers.bookmark(post.id)}"
      ><md-icon slot="suffix" src="/assets/bookmark-outline.svg"></md-icon
    ></md-button>
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(
        isFavorited(post, state)
      )}"
      pill
      size="small"
      aria-pressed="${isFavorited(post, state) ? 'true' : 'false'}"
      aria-label="${
        isFavorited(post, state) ? msg('Unfavourite') : msg('Favourite')
      }"
      @click="${() => handlers.favorite(post.id)}"
      >${getActionCount(post, 'favourites_count', state.settings)}
      <md-icon slot="suffix" name="heart"></md-icon
    ></md-button>
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(
        isReblogged(post, state)
      )}"
      pill
      size="small"
      aria-pressed="${isReblogged(post, state) ? 'true' : 'false'}"
      aria-label="${
        isReblogged(post, state) ? msg('Undo boost') : msg('Boost')
      }"
      @click="${() => handlers.reblog(post.id)}"
      >${getActionCount(post, 'reblogs_count', state.settings)}
      <md-icon slot="suffix" name="repeat"></md-icon
    ></md-button>
    ${
      !state.guestMode &&
      post.quote_approval?.current_user !== 'denied' &&
      post.quote_approval?.current_user !== 'unknown'
        ? html`<md-button
            variant="text"
            style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
            pill
            size="small"
            aria-label="${
              post.quote_approval?.current_user === 'manual'
                ? msg('Request to quote')
                : msg('Quote')
            }"
            title="${
              post.quote_approval?.current_user === 'manual'
                ? msg('Author will manually review')
                : ''
            }"
            @click="${() => handlers.quotePost(post)}"
          >
            <md-icon slot="suffix" src="/assets/quote-outline.svg"></md-icon>
          </md-button>`
        : null
    }
  `;
}

/**
 * Renders the three-dots dropdown menu for a post
 */
function renderPostDropdown(
  post: Post,
  state: TimelineItemState,
  handlers: TimelineItemHandlers,
  shareTarget: Post | null = post
): TemplateResult {
  return html`
    <div class="actions-right" @click="${(e: Event) => e.stopPropagation()}">
      <md-dropdown placement="bottom-end" close-on-scroll>
        <md-icon-button
          slot="trigger"
          name="ellipsis-vertical"
          label="${msg('More options')}"
          size="small"
        ></md-icon-button>
        <md-menu>
          <md-menu-item
            @click="${() => handlers.translatePost(post.content || null, post.id)}"
            title=${ifDefined(state.isOnDeviceTranslateAvailable ? 'On-device AI' : undefined)}
          >
            <md-icon slot="prefix" name="language"></md-icon>
            ${msg('Translate')}
          </md-menu-item>
          ${
            !state.guestMode &&
            post.account &&
            post.account.id !== state.currentUser?.id
              ? html`
                  <md-menu-item
                    @click=${() => handlers.addToList(post.account)}
                  >
                    <md-icon slot="prefix" name="albums"></md-icon>
                    ${msg('Add to list')}
                  </md-menu-item>
                `
              : null
          }
          <md-menu-item @click="${() => handlers.shareStatus(shareTarget)}">
            <md-icon slot="prefix" name="share"></md-icon>
            ${msg('Share')}
          </md-menu-item>
          ${
            post.edited_at
              ? html`
                  <md-menu-item
                    @click="${() => handlers.viewEditHistory(post.id)}"
                  >
                    <md-icon slot="prefix" name="time"></md-icon>
                    ${msg('View edit history')}
                  </md-menu-item>
                `
              : null
          }
          ${
            state.canPin && post === state.tweet
              ? html`
                  <md-menu-item @click="${() => handlers.togglePin()}">
                    <md-icon slot="prefix" name="bookmark"></md-icon>
                    ${post.pinned ? msg('Unpin from profile') : msg('Pin to profile')}
                  </md-menu-item>
                `
              : null
          }
          ${
            !state.guestMode && post === state.tweet
              ? html`
                  <md-menu-item @click="${() => handlers.muteConversation()}">
                    <md-icon
                      slot="prefix"
                      name="${
                        state.isMuted || post.muted
                          ? 'notifications'
                          : 'notifications-off'
                      }"
                    ></md-icon>
                    ${
                      state.isMuted || post.muted
                        ? msg('Unmute conversation')
                        : msg('Mute conversation')
                    }
                  </md-menu-item>
                `
              : null
          }
          ${
            post.account.id !== state.currentUser?.id
              ? html`
                  <md-menu-item
                    @click="${() => handlers.muteUser(post.account.id)}"
                  >
                    <md-icon slot="prefix" name="volume-mute"></md-icon>
                    ${msg(str`Mute @${post.account.acct}`)}
                  </md-menu-item>
                  <md-menu-item
                    @click="${() => handlers.blockUser(post.account.id)}"
                  >
                    <md-icon slot="prefix" name="ban"></md-icon>
                    ${msg(str`Block @${post.account.acct}`)}
                  </md-menu-item>
                  ${
                    post.account.acct?.includes('@')
                      ? html`
                          <md-menu-item
                            @click="${() =>
                              handlers.blockDomain(
                                post.account.acct?.split('@')[1] || ''
                              )}"
                          >
                            <md-icon slot="prefix" name="ban"></md-icon>
                            ${msg(str`Block domain ${post.account.acct?.split('@')[1]}`)}
                          </md-menu-item>
                        `
                      : null
                  }
                  <md-menu-item
                    @click="${() =>
                      handlers.reportUser(
                        post.account.id,
                        post.account.acct,
                        post.id
                      )}"
                  >
                    <md-icon slot="prefix" name="flag"></md-icon>
                    ${msg(str`Report @${post.account.acct}`)}
                  </md-menu-item>
                `
              : null
          }
          ${
            post.account.acct === state.currentUser?.acct
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
  `;
}

/**
 * Renders social action buttons for thread continuation posts (no reply button).
 */
function renderSocialActionsForThread(config: ActionsConfig): TemplateResult {
  const { post, state, handlers } = config;

  return html`
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(post.bookmarked)}"
      pill
      size="small"
      aria-pressed="${post.bookmarked ? 'true' : 'false'}"
      aria-label="${post.bookmarked ? msg('Remove bookmark') : msg('Bookmark')}"
      @click="${(e: Event) => {
        e.stopPropagation();
        handlers.bookmark(post.id);
      }}"
      ><md-icon slot="suffix" name="bookmark"></md-icon
    ></md-button>
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(post.favourited)}"
      pill
      size="small"
      aria-pressed="${post.favourited ? 'true' : 'false'}"
      aria-label="${post.favourited ? msg('Unfavourite') : msg('Favourite')}"
      @click="${(e: Event) => {
        e.stopPropagation();
        handlers.favorite(post.id);
      }}"
      >${getActionCount(post, 'favourites_count', state.settings)}
      <md-icon slot="suffix" name="heart"></md-icon
    ></md-button>
    <md-button
      variant="text"
      style="--md-sys-color-primary: ${getActionButtonColor(post.reblogged)}"
      pill
      size="small"
      aria-pressed="${post.reblogged ? 'true' : 'false'}"
      aria-label="${post.reblogged ? msg('Undo boost') : msg('Boost')}"
      @click="${(e: Event) => {
        e.stopPropagation();
        handlers.reblog(post.id);
      }}"
      >${getActionCount(post, 'reblogs_count', state.settings)}
      <md-icon slot="suffix" name="repeat"></md-icon
    ></md-button>
    ${
      !state.guestMode &&
      post.quote_approval?.current_user !== 'denied' &&
      post.quote_approval?.current_user !== 'unknown'
        ? html`<md-button
            variant="text"
            style="--md-sys-color-primary: var(--md-sys-color-on-surface-variant)"
            pill
            size="small"
            aria-label="${
              post.quote_approval?.current_user === 'manual'
                ? msg('Request to quote')
                : msg('Quote')
            }"
            title="${
              post.quote_approval?.current_user === 'manual'
                ? msg('Author will manually review')
                : ''
            }"
            @click="${(e: Event) => {
              e.stopPropagation();
              handlers.quotePost(post);
            }}"
          >
            <md-icon slot="suffix" src="/assets/quote-outline.svg"></md-icon>
          </md-button>`
        : null
    }
  `;
}

export function renderSensitive(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  const spoiler = state.tweet?.reblog
    ? state.tweet.reblog.spoiler_text
    : state.tweet?.spoiler_text;
  return renderSensitiveBlock(spoiler, () => handlers.viewSensitive());
}

export function renderReplyContext(
  state: TimelineItemState,
  handlers: TimelineItemHandlers
) {
  if (!state.tweet?.reply_to || !state.show) return null;

  return html`
    <md-card
      part="card"
      connected-bottom
      @click="${() => handlers.openParentPost()}"
      style="cursor: pointer;"
    >
      <div class="header-block" slot="header">
        <user-profile
          .account="${state.tweet?.reply_to?.account}"
        ></user-profile>
        ${renderPostDropdown(state.tweet.reply_to!, state, handlers)}
      </div>
      ${
        state.tweet?.reply_to?.sensitive
          ? renderSensitiveBlock(
              state.tweet?.reply_to?.spoiler_text,
              (e: Event) => {
                e.stopPropagation();
                handlers.viewReplySensitive();
              }
            )
          : html`<div
              @click="${(e: Event) =>
                handlers.handleContentClick(e, state.tweet?.reply_to)}"
              @mouseover="${(e: Event) =>
                handleMentionMouseOver(e, state.tweet?.reply_to)}"
              @mouseleave="${() => handleMentionMouseLeave()}"
              .innerHTML="${parseEmojis(
                state.tweet?.reply_to?.content || '',
                state.tweet?.reply_to?.emojis || []
              )}"
            ></div>`
      }
      ${
        !state.tweet?.reply_to?.sensitive && state.tweet?.reply_to?.poll
          ? (ensurePoll(),
            html`<timeline-poll .post=${state.tweet.reply_to}></timeline-poll>`)
          : null
      }
      ${
        !state.tweet?.reply_to?.sensitive &&
        state.tweet?.reply_to?.media_attachments &&
        state.tweet.reply_to.media_attachments.length > 0
          ? (ensureImageGrid(),
            html`
              <image-grid
                .images="${state.tweet.reply_to.media_attachments}"
                .mediaArtist="${state.tweet.reply_to.account.display_name}"
                .mediaArtwork="${state.tweet.reply_to.account.avatar}"
              >
              </image-grid>
            `)
          : html``
      }

      <div class="actions" slot="footer">
        ${
          state.show === true
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
            : null
        }

        <md-button
          variant="text"
          style="--md-sys-color-primary: ${
            state.isBookmarked || state.tweet?.reply_to?.bookmarked
              ? 'var(--sl-color-primary-600)'
              : 'var(--md-sys-color-on-surface-variant)'
          }"
          pill
          size="small"
          @click="${(e: Event) => {
            e.stopPropagation();
            handlers.bookmark(state.tweet?.reply_to?.id || '');
          }}"
          ><md-icon slot="suffix" name="bookmark"></md-icon
        ></md-button>
        <md-button
          variant="text"
          style="--md-sys-color-primary: ${
            state.isBoosted || state.tweet?.reply_to?.favourited
              ? 'var(--sl-color-primary-600)'
              : 'var(--md-sys-color-on-surface-variant)'
          }"
          pill
          size="small"
          @click="${(e: Event) => {
            e.stopPropagation();
            handlers.favorite(state.tweet?.reply_to?.id || '');
          }}"
          >${
            state.settings?.wellness
              ? ''
              : state.tweet?.reply_to?.favourites_count
          } <md-icon slot="suffix" name="heart"></md-icon
        ></md-button>
        <md-button
          variant="text"
          style="--md-sys-color-primary: ${
            state.isReblogged || state.tweet?.reply_to?.reblogged
              ? 'var(--sl-color-primary-600)'
              : 'var(--md-sys-color-on-surface-variant)'
          }"
          pill
          size="small"
          @click="${(e: Event) => {
            e.stopPropagation();
            handlers.reblog(state.tweet?.reply_to?.id || '');
          }}"
          >${
            state.settings?.wellness ? '' : state.tweet?.reply_to?.reblogs_count
          } <md-icon slot="suffix" name="repeat"></md-icon
        ></md-button>
      </div>
    </md-card>
    <div class="thread-connector-bar"></div>
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
      ?connected-top="${hasReplyTo}"
      ?connected-bottom="${hasContinuation}"
    >
      <div class="header-actions-block" slot="header">
        <user-profile .account="${state.tweet?.account}"></user-profile>
        ${renderPostDropdown(state.tweet!, state, handlers)}
      </div>

      <div
        @click="${(e: Event) =>
          handlers.handleContentClick(e, state.tweet, true)}"
        @mouseover="${(e: Event) => handleMentionMouseOver(e, state.tweet)}"
        @mouseleave="${() => handleMentionMouseLeave()}"
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
      ${renderPostMediaContent({
        post: state.tweet!,
        handlers,
      })}

      <div class="actions" slot="footer">
        ${renderSocialActions({
          post: state.tweet!,
          state,
          handlers,
        })}
      </div>
    </md-card>
    ${hasContinuation ? html`<div class="thread-connector-bar"></div>` : null}
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
          class="thread-continuation-card"
          connected-top
          ?connected-bottom="${hasMore}"
          @click="${(e: Event) =>
            handlers.handleContentClick(e, threadPost, true)}"
        >
          <div class="header-block" slot="header">
            <user-profile .account="${threadPost.account}"></user-profile>
            ${renderPostDropdown(threadPost, state, handlers)}
          </div>
          ${
            threadPost.sensitive
              ? renderSensitiveBlock(threadPost.spoiler_text, (e: Event) => {
                  e.stopPropagation();
                  handlers.viewThreadSensitive(threadPost.id);
                })
              : html`<div
                  @click="${(e: Event) =>
                    handlers.handleContentClick(e, threadPost)}"
                  .innerHTML="${parseEmojis(
                    threadPost.content || '',
                    threadPost.emojis || []
                  )}"
                ></div>`
          }
          ${renderPostMediaContent({
            post: threadPost,
            handlers,
          })}
          <div class="actions" slot="footer">
            ${renderSocialActionsForThread({
              post: threadPost,
              state,
              handlers,
            })}
          </div>
        </md-card>
        ${hasMore ? html`<div class="thread-connector-bar"></div>` : null}
      `;
    })}
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
          src="${
            state.tweet.account.avatar_static ||
            '/assets/icons/new-icons/icon-72x72.png'
          }"
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
        ${renderPostDropdown(state.tweet.reblog, state, handlers, state.tweet)}
      </div>

      <div
        @click="${(e: Event) =>
          handlers.handleContentClick(e, state.tweet?.reblog, true)}"
        @mouseover="${(e: Event) =>
          handleMentionMouseOver(e, state.tweet?.reblog)}"
        @mouseleave="${() => handleMentionMouseLeave()}"
        .innerHTML="${parseEmojis(
          state.tweet.reblog.content || '',
          state.tweet.reblog.emojis || []
        )}"
      ></div>

      ${renderPostMediaContent({
        post: state.tweet.reblog,
        handlers,
      })}

      <div class="actions" slot="footer">
        ${renderSocialActions({
          post: state.tweet.reblog,
          state,
          handlers,
        })}
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
              ${renderPostDropdown(threadPost, state, handlers)}
            </div>
            ${
              threadPost.sensitive
                ? renderSensitiveBlock(threadPost.spoiler_text, () =>
                    handlers.viewThreadSensitive(threadPost.id)
                  )
                : html`<div
                    @click="${(e: Event) =>
                      handlers.handleContentClick(e, threadPost)}"
                    .innerHTML="${parseEmojis(
                      threadPost.content || '',
                      threadPost.emojis || []
                    )}"
                  ></div>`
            }
            ${renderPostMediaContent({
              post: threadPost,
              handlers,
            })}
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
              ${renderPostDropdown(threadPost, state, handlers)}
            </div>
            ${
              threadPost.sensitive
                ? renderSensitiveBlock(threadPost.spoiler_text, () =>
                    handlers.viewThreadSensitive(threadPost.id)
                  )
                : html`<div
                    @click="${(e: Event) =>
                      handlers.handleContentClick(e, threadPost)}"
                    .innerHTML="${parseEmojis(
                      threadPost.content || '',
                      threadPost.emojis || []
                    )}"
                  ></div>`
            }
            ${renderPostMediaContent({
              post: threadPost,
              handlers,
            })}
            <div class="actions" slot="footer">
              ${renderSocialActions({
                post: threadPost,
                state,
                handlers,
              })}
            </div>
          </md-card>
        `
      )}
    </div>
  `;
}
