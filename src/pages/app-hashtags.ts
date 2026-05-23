import { LitElement, html, css, nothing, PropertyValueMap } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getHashtagTimeline } from '../services/timeline';
import { getTag, followTag, unfollowTag } from '../mastodon/api/tags';
import type { Post } from '../interfaces/Post';
import '../components/post-detail-dialog';
import '../components/md/md-button';
import '../components/md/md-skeleton-card';
import type { PostDetailDialog } from '../components/post-detail-dialog';

@localized()
@customElement('app-hashtags')
export class AppHashtags extends LitElement {
  @state() data: Post[] | undefined;
  @state() tag: string | null | undefined;
  @state() private _following: boolean | null = null;
  @state() private _toggling = false;

  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;

  static styles = [
    css`
      :host {
        display: block;
        height: 100vh;
      }

      main {
        padding: 10px;
        padding-top: calc(60px + env(safe-area-inset-top, 0px));
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        margin-top: 12px;
        align-items: center;
        max-width: var(--layout-max-width, 1200px);
        margin-left: auto;
        margin-right: auto;
      }

      .tag-header {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        max-width: 600px;
        margin-bottom: 8px;
      }

      .tag-header h3 {
        flex: 1;
        margin: 0;
      }

      app-timeline {
        flex: 1;
        overflow: hidden;
        width: 100%;
        max-width: 600px;
      }

      .skeletons {
        width: 100%;
        max-width: 600px;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 12px;
          padding-right: 12px;
        }
      }
    `,
  ];

  protected async firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ) {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');

    this.tag = tag;

    if (tag) {
      const [hashtagData] = await Promise.all([
        getHashtagTimeline(tag),
        this._loadFollowState(tag),
      ]);
      this.data = hashtagData;
    }
  }

  private async _loadFollowState(tag: string) {
    try {
      const info = await getTag(tag);
      this._following = info.following ?? false;
    } catch {
      this._following = null;
    }
  }

  private async _toggleFollow() {
    if (!this.tag || this._following === null) return;
    this._toggling = true;
    try {
      const result = this._following
        ? await unfollowTag(this.tag)
        : await followTag(this.tag);
      this._following = result.following ?? !this._following;
    } catch (error) {
      console.error('Failed to toggle tag follow', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: this._following
              ? msg('Failed to unfollow hashtag.')
              : msg('Failed to follow hashtag.'),
            variant: 'error',
          },
        })
      );
    } finally {
      this._toggling = false;
    }
  }

  private handleOpenPost(tweet: Post) {
    this.postDetailDialog?.open(tweet);
  }

  render() {
    return html`
      <app-header ?enableBack=${true}></app-header>

      <main>
        <div class="tag-header">
          <h3>${this.tag ? `#${this.tag}` : ''}</h3>
          ${this._following !== null
            ? html`
                <md-button
                  variant=${this._following ? 'outlined' : 'filled'}
                  size="small"
                  ?disabled=${this._toggling}
                  @click=${() => this._toggleFollow()}
                >
                  ${this._toggling
                    ? msg('...')
                    : this._following
                      ? msg('Unfollow')
                      : msg('Follow')}
                </md-button>
              `
            : nothing}
        </div>

        ${this.data === undefined
          ? html`<div class="skeletons">
              <md-skeleton-card count="5"></md-skeleton-card>
            </div>`
          : html`<app-timeline
              .data=${this.data}
              .header=${false}
              .autoLoad=${false}
              @open="${(e: CustomEvent<{ tweet: Post }>) =>
                this.handleOpenPost(e.detail.tweet)}"
            ></app-timeline>`}
      </main>

      <!-- Post Detail Dialog -->
      <post-detail-dialog></post-detail-dialog>
    `;
  }
}
