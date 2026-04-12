import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import type { Post } from '../interfaces/Post';
import { parseEmojis } from '../utils/emoji-parser';
import { router } from '../router/routes';

import './user-profile';

/**
 * Renders an embedded quote post card.
 * Max 1 level deep — nested quotes show a placeholder.
 */
@customElement('quoted-post')
export class QuotedPost extends LitElement {
  @property({ type: Object }) post: Post | undefined;

  static styles = css`
    :host {
      display: block;
      margin-top: 10px;
    }

    .quote-card {
      display: flex;
      flex-direction: column;
      border: 1px solid
        color-mix(
          in srgb,
          var(--md-sys-color-outline-variant, #2b2930) 60%,
          transparent
        );
      border-radius: var(--md-sys-shape-corner-small, 8px);
      overflow: hidden;
      cursor: pointer;
      background: var(--md-sys-color-surface-container-low, #ffffff0d);
      transition: background 0.15s ease;
    }

    .quote-card:hover {
      background: var(
        --md-sys-color-surface-container,
        rgba(255, 255, 255, 0.08)
      );
    }

    .quote-body {
      padding: 10px 14px;
    }

    .quote-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .quote-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
    }

    .quote-author {
      font-size: 13px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .quote-handle {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #938f99);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .quote-content {
      font-size: 14px;
      line-height: 1.4;
      color: var(--md-sys-color-on-surface, #fff);
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Strip excessive margins from HTML content */
    .quote-content p {
      margin: 0 0 4px 0;
    }

    .quote-content p:last-child {
      margin-bottom: 0;
    }

    .quote-media {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      border-radius: var(--md-sys-shape-corner-extra-small, 4px);
      overflow: hidden;
    }

    .quote-media img {
      width: 100%;
      max-height: 150px;
      object-fit: cover;
      border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    }

    .quote-media--multi img {
      flex: 1;
      min-width: 0;
    }

    .quote-placeholder {
      padding: 12px 14px;
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #938f99);
      font-style: italic;
    }

    .nested-quote-notice {
      margin-top: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #938f99);
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    }

    @media (prefers-color-scheme: light) {
      .quote-card {
        background: rgba(0, 0, 0, 0.04);
      }

      .quote-card:hover {
        background: rgba(0, 0, 0, 0.07);
      }

      .nested-quote-notice {
        background: rgba(0, 0, 0, 0.04);
      }
    }
  `;

  private _navigate() {
    if (!this.post) return;
    router.navigate(`/post/${this.post.id}`);
  }

  render() {
    if (!this.post) return nothing;

    const account = this.post.account;
    const displayName = account.display_name || account.username;
    const handle = account.acct.includes('@')
      ? `@${account.acct}`
      : `@${account.acct}`;
    const hasMedia =
      !this.post.sensitive &&
      this.post.media_attachments &&
      this.post.media_attachments.length > 0;
    const hasNestedQuote =
      this.post.quote &&
      'state' in this.post.quote &&
      this.post.quote.state === 'accepted';

    return html`
      <div
        class="quote-card"
        @click=${(e: Event) => {
          e.stopPropagation();
          this._navigate();
        }}
        role="article"
        aria-label=${msg('Quoted post')}
      >
        <div class="quote-body">
          <div class="quote-header">
            <img
              class="quote-avatar"
              src=${account.avatar}
              alt=""
              loading="lazy"
            />
            <span class="quote-author">${displayName}</span>
            <span class="quote-handle">${handle}</span>
          </div>

          <div
            class="quote-content"
            .innerHTML=${parseEmojis(
              this.post.content || '',
              this.post.emojis || []
            )}
          ></div>

          ${hasMedia
            ? html`
                <div
                  class="quote-media ${this.post.media_attachments.length > 1
                    ? 'quote-media--multi'
                    : ''}"
                >
                  ${this.post.media_attachments
                    .slice(0, 2)
                    .map(
                      (att) => html`
                        <img
                          src=${att.preview_url || att.url}
                          alt=${att.description || ''}
                          loading="lazy"
                        />
                      `
                    )}
                </div>
              `
            : nothing}
          ${hasNestedQuote
            ? html`<div class="nested-quote-notice">
                ${msg('Contains a quote post')}
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }
}

/**
 * Renders a placeholder for non-displayable quote states.
 */
export function renderQuotePlaceholder(
  state: string
): ReturnType<typeof html> | typeof nothing {
  switch (state) {
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
    case 'blocked_account':
    case 'blocked_domain':
    case 'muted_account':
      return html`<div class="quote-placeholder">
        ${msg('Hidden due to your filters')}
      </div>`;
    case 'unauthorized':
    default:
      return nothing;
  }
}
