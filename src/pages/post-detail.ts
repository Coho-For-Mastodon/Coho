import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import '../components/header';
import '../components/timeline-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-text-area';
import { Post } from '../interfaces/Post';
import { getReplies } from '../services/timeline';

import { replyToPost } from '../services/posts';
import { classMap } from 'lit/directives/class-map.js';
import type { MdTextArea } from '../components/md/md-text-area';

@customElement('post-detail')
export class PostDetail extends LitElement {
  @state() tweet: Post | null = null;
  @state() replies: Post[] = [];
  @state() replyingTo: Post | null = null;

  @property({ type: Object }) passed_tweet: Post | null = null;

  @query('md-text-area') private replyTextArea!: MdTextArea;

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
      }

      main {
        padding-top: 60px;

        display: flex;
        flex-direction: column;
        padding-left: 20px;
        justify-content: space-between;
        align-items: flex-start;
        padding-right: 20px;
        gap: 0px;
        overflow-y: auto;
        height: calc(100vh - 60px);
      }

      #replies ul {
        list-style: none;
        padding: 0;
        margin: 0;

        display: flex;
        flex-direction: column;
      }

      md-button::part(control) {
        border: none;
      }

      #main-block {
        display: flex;
        flex-direction: column;
        flex: 1.5;
        /* position: sticky;
        top: 60px; */

        /* overflow-x: hidden; */

        width: 100%;

        margin-bottom: 4em;
      }

      #post-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        flex-direction: column;
      }

      #replying-to-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--md-sys-color-on-surface-variant);
        padding: 4px 8px;
        background: var(--md-sys-color-surface-container-high);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      #replies {
        width: 100%;
      }

      #replies h2 {
        margin-top: 0;
        margin-left: 15px;
      }

      #reply-button {
        place-self: flex-end;
      }

      #main {
        min-height: 230px;

        view-transition-name: card;
      }

      .standalone {
        padding: 0;
      }

      .standalone #main-block {
        top: 0;
      }

      @media (prefers-color-scheme: dark) {
        md-text-area::part(textarea),
        md-button[variant='outlined']::part(control) {
          background: #1e1e1e;
          color: white;
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

      @media (min-width: 1250px) {
        main {
          padding-left: 26vw;
          padding-right: 26vw;
        }
      }

      @media (min-width: 820px) {
        main {
          padding-left: 22vw;
          padding-right: 22vw;
        }
      }

      @media (max-width: 820px) {
        main {
          flex-direction: column;
          display: flex;
          height: 79vh;
          overflow-y: auto;
        }

        #post-actions {
          position: fixed;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: #f8f8f80f;
          padding: 8px;
          border-radius: 6px;
          z-index: 999;
          backdrop-filter: blur(42px);
        }

        #main-block {
          display: initial;
          position: initial;
          width: 100%;
          overflow-x: initial;
        }

        #main {
          position: initial;
          flex: 1;
        }

        #replies {
          width: 100%;
        }
      }
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();

    if (this.passed_tweet) {
      this.tweet = this.passed_tweet;
      return;
    }

    // remove ? from beginning of window.location.search
    const query = window.location.search.substring(1);

    const decoded = JSON.parse(decodeURIComponent(query));
    console.log('decoded', decoded);
    // remove + and - from decoded.content
    if (decoded.reblog) {
      decoded.reblog.content = decoded.reblog.content
        .replace(/\+/g, ' ')
        .replace(/-/g, '');
    }

    decoded.content = decoded.content.replace(/\+/g, ' ').replace(/-/g, '');

    this.tweet = decoded;
  }

  async firstUpdated() {
    // get id from query string
    await this.loadReplies();
  }

  private async loadReplies() {
    if (this.tweet && this.tweet.id) {
      // get post replies
      const replies = await getReplies(this.tweet.id);
      console.log('replies', replies);

      this.replies = replies.descendants;
    }
  }

  async shareStatus() {
    if (navigator.share) {
      // share the post
      await navigator.share({
        title: 'Coho',
        text: this.tweet?.content,
        url: this.tweet?.url,
      });
    } else {
      // fallback to clipboard api
      await navigator.clipboard.writeText(this.tweet?.url || '');
    }
  }

  async handleReply() {
    const tweetToReplyTo = this.replyingTo || this.tweet;

    if (this.replyTextArea?.value && tweetToReplyTo && tweetToReplyTo.id) {
      await replyToPost(tweetToReplyTo.id, this.replyTextArea.value);

      await this.loadReplies();

      this.replies = [...this.replies];

      this.replyTextArea.value = '';
      this.replyingTo = null;
    }
  }

  handleReplyClick(e: CustomEvent) {
    e.preventDefault();
    this.replyingTo = e.detail.tweet;

    if (this.replyTextArea) {
      this.replyTextArea.focus();
    }
  }

  render() {
    return html`
      ${!this.passed_tweet
        ? html`<app-header ?enableBack="${true}"></app-header>`
        : null}

      <main class=${classMap({ standalone: this.passed_tweet !== null })}>
        <div id="main-block">
          <timeline-item id="main" .tweet="${this.tweet!}"></timeline-item>
          <div id="post-actions">
            ${this.replyingTo
        ? html`
                  <div id="replying-to-indicator">
                    <span>Replying to @${this.replyingTo.account.acct}</span>
                    <md-icon-button
                      name="close"
                      @click=${() => (this.replyingTo = null)}
                    ></md-icon-button>
                  </div>
                `
        : nothing}
            <md-text-area
              variant="outlined"
              placeholder="Reply to this post..."
            ></md-text-area>
            <md-button
              @click="${() => this.handleReply()}"
              id="reply-button"
              variant="filled"
            >
              Reply

              <md-icon slot="suffix" src="/assets/add-outline.svg"></md-icon>
            </md-button>
          </div>
        </div>

        <div id="replies">
          ${this.replies.length > 0 ? html`<h2>Replies</h2>` : nothing}

          <ul>
            ${this.replies.map(
          (reply) => html`
                <timeline-item
                  .tweet="${reply}"
                  ?show="${true}"
                  @reply-clicked="${(e: CustomEvent) =>
              this.handleReplyClick(e)}"
                ></timeline-item>
              `
        )}
          </ul>
        </div>
      </main>
    `;
  }
}
