import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import type { ThreadNode } from '../utils/thread-tree';
import { MAX_THREAD_DEPTH } from '../utils/thread-tree';
import { parseEmojis } from '../utils/emoji-parser';
import type { Post } from '../interfaces/Post';

import './user-profile';
import './md/md-card';
import './md/md-icon';
import './md/md-button';
import './image-carousel';
import './timeline-poll';

/**
 * Recursive component that renders a single branch of a thread tree.
 * Shows a post with visual indentation and connector lines, then
 * renders child branches below it.
 *
 * At depths >= MAX_THREAD_DEPTH a "Continue this thread" link is
 * shown instead of rendering deeper replies inline.
 */
@localized()
@customElement('thread-branch')
export class ThreadBranch extends LitElement {
  @property({ type: Object }) node!: ThreadNode;
  @property({ type: Boolean }) guestMode = false;

  static styles = css`
    :host {
      display: block;
    }

    .branch {
      position: relative;
    }

    /* Indentation via left padding based on depth.
       Depths 0-2 get 0/24/48 px on desktop; capped at depth 2 indent. */
    .branch[data-depth='1'] {
      padding-left: 24px;
    }
    .branch[data-depth='2'] {
      padding-left: 48px;
    }
    .branch[data-depth='3'],
    .branch[data-depth='deep'] {
      padding-left: 48px;
    }

    @media (max-width: 820px) {
      .branch[data-depth='1'] {
        padding-left: 16px;
      }
      .branch[data-depth='2'] {
        padding-left: 32px;
      }
      .branch[data-depth='3'],
      .branch[data-depth='deep'] {
        padding-left: 32px;
      }
    }

    /* Vertical connector line along left edge for nested branches */
    .branch[data-depth='1']::before,
    .branch[data-depth='2']::before,
    .branch[data-depth='3']::before,
    .branch[data-depth='deep']::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--md-sys-color-outline-variant, #2b2930);
      border-radius: 1px;
    }

    @media (max-width: 820px) {
      .branch[data-depth='1']::before,
      .branch[data-depth='2']::before,
      .branch[data-depth='3']::before,
      .branch[data-depth='deep']::before {
        left: 6px;
      }
    }

    /* Shift the second-level connector line to account for nesting */
    .branch[data-depth='2']::before {
      left: 34px;
    }
    @media (max-width: 820px) {
      .branch[data-depth='2']::before {
        left: 22px;
      }
    }

    md-card {
      cursor: pointer;
      margin-bottom: 4px;
    }

    md-card div {
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
      min-width: 0;
    }

    .actions {
      display: flex;
      gap: 4px;
    }

    .continue-thread {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      color: var(--md-sys-color-primary, #6750a4);
      font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
      cursor: pointer;
      border-radius: var(--md-sys-shape-corner-medium);
      margin-bottom: 8px;
    }

    .continue-thread:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 8%,
        transparent
      );
    }

    .more-replies {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      color: var(--md-sys-color-on-surface-variant, #999);
      font-size: var(--md-sys-typescale-body-small-font-size, 12px);
      cursor: pointer;
      border-radius: var(--md-sys-shape-corner-medium);
      margin-bottom: 4px;
    }

    .more-replies:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 8%,
        transparent
      );
      color: var(--md-sys-color-primary, #6750a4);
    }

    .children {
      margin-top: 2px;
    }

    .sensitive {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      text-align: center;
    }

    .sensitive span {
      font-weight: 600;
    }

    .sensitive p {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant, #999);
    }
  `;

  private handlePostClick(post: Post) {
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: { tweet: post },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.node) return nothing;

    const { post, children, depth } = this.node;
    const depthAttr =
      depth === 0
        ? '0'
        : depth === 1
          ? '1'
          : depth === 2
            ? '2'
            : depth === 3
              ? '3'
              : 'deep';

    // Beyond max depth, show a "Continue this thread" link
    if (depth >= MAX_THREAD_DEPTH) {
      return html`
        <div class="branch" data-depth="${depthAttr}">
          <button
            class="continue-thread"
            style="background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 8px;"
            @click=${() => this.handlePostClick(post)}
          >
            <md-icon name="arrow-forward"></md-icon>
            ${msg('Continue this thread')}
          </button>
        </div>
      `;
    }

    return html`
      <div class="branch" data-depth="${depthAttr}">
        <md-card @click=${() => this.handlePostClick(post)}>
          <user-profile
            ?small=${depth > 0}
            .account=${post.account}
          ></user-profile>

          ${post.sensitive
            ? html`
                <div class="sensitive">
                  <span>${msg('Sensitive Content')}</span>
                  <p>${post.spoiler_text || msg('No spoiler text provided')}</p>
                </div>
              `
            : html`<div
                .innerHTML=${parseEmojis(post.content || '', post.emojis || [])}
              ></div>`}
          ${!post.sensitive && post.poll
            ? html`<timeline-poll .post=${post}></timeline-poll>`
            : nothing}
          ${!post.sensitive &&
          post.media_attachments &&
          post.media_attachments.length > 0
            ? html`<image-carousel
                .images=${post.media_attachments}
              ></image-carousel>`
            : nothing}

          <div class="actions" slot="footer">
            <md-button variant="text" pill size="small">
              ${post.replies_count || ''}
              <md-icon
                slot="suffix"
                src="/assets/chatbox-outline.svg"
              ></md-icon>
            </md-button>
          </div>
        </md-card>

        ${children.length > 0
          ? html` <div class="children">${this.renderChildren(children)}</div> `
          : nothing}
      </div>
    `;
  }

  private renderChildren(children: ThreadNode[]) {
    // At depth >= 2 with multiple children: show first child inline,
    // collapse remaining with "N more replies" link
    if (this.node.depth >= 2 && children.length > 1) {
      const firstChild = children[0];
      const remainingCount = children.length - 1;

      return html`
        <thread-branch
          .node=${firstChild}
          ?guestMode=${this.guestMode}
          @open=${(e: CustomEvent) => this.handlePostClick(e.detail.tweet)}
        ></thread-branch>
        <button
          class="more-replies"
          style="background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 8px;"
          @click=${() => this.handlePostClick(this.node.post)}
        >
          <md-icon name="chatbubbles"></md-icon>
          ${remainingCount === 1
            ? msg('1 more reply')
            : msg(str`${remainingCount} more replies`)}
        </button>
      `;
    }

    // Otherwise render all children
    return children.map(
      (child) => html`
        <thread-branch
          .node=${child}
          ?guestMode=${this.guestMode}
          @open=${(e: CustomEvent) => this.handlePostClick(e.detail.tweet)}
        ></thread-branch>
      `
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'thread-branch': ThreadBranch;
  }
}
