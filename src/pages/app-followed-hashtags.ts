import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getFollowedTags, unfollowTag } from '../mastodon/api/tags';
import type { TagInfo } from '../mastodon/types/tag';
import { userListStyles } from '../styles/user-list-styles';
import { router } from '../router/routes';

import '../components/md/md-skeleton';
import '../components/md/md-button';

@localized()
@customElement('app-followed-hashtags')
export class AppFollowedHashtags extends LitElement {
  @state() private tags: TagInfo[] = [];
  @state() private loading = true;
  @state() private _unfollowingNames = new Set<string>();

  static styles = [
    userListStyles,
    css`
      main {
        padding-left: 6em;
        padding-right: 6em;
        box-sizing: border-box;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 12px;
          padding-right: 12px;
        }
      }

      h2 {
        animation: slideInFromLeft 0.3s ease-in-out;
        padding-left: 0;
      }

      ul {
        padding-left: 0;
        padding-right: 0;
      }

      ul li {
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
      }

      .tag-name {
        font-size: 1rem;
        font-weight: 500;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  async firstUpdated() {
    await this._load();
  }

  private async _load() {
    this.loading = true;
    try {
      this.tags = await getFollowedTags();
    } catch (error) {
      console.error('Failed to load followed tags', error);
    } finally {
      this.loading = false;
    }
  }

  private _openTag(name: string) {
    router.navigate(`/hashtag?tag=${encodeURIComponent(name)}`);
  }

  private async _unfollow(name: string) {
    const next = new Set(this._unfollowingNames);
    next.add(name);
    this._unfollowingNames = next;

    try {
      await unfollowTag(name);
      this.tags = this.tags.filter((t) => t.name !== name);
    } catch (error) {
      console.error('Failed to unfollow tag', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to unfollow hashtag.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._unfollowingNames);
      updated.delete(name);
      this._unfollowingNames = updated;
    }
  }

  render() {
    return html`
      <app-header ?enableBack=${true}></app-header>

      <main>
        <h2>${msg('Followed Hashtags')}</h2>
        <ul class="scrollbar-hidden">
          ${
            this.loading && this.tags.length === 0
              ? Array.from({ length: 6 }, () => {
                  return html`
                    <li class="skeleton-row">
                      <div class="skeleton-lines">
                        <md-skeleton width="180px" height="16px"></md-skeleton>
                      </div>
                    </li>
                  `;
                })
              : this.tags.length === 0
                ? html`<li class="empty-state">
                    ${msg('You are not following any hashtags.')}
                  </li>`
                : this.tags.map((tag) => {
                    const processing = this._unfollowingNames.has(tag.name);
                    return html`
                      <li @click=${() => this._openTag(tag.name)}>
                        <span class="tag-name">#${tag.name}</span>
                        <md-button
                          variant="text"
                          size="small"
                          ?disabled=${processing}
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            this._unfollow(tag.name);
                          }}
                        >
                          ${processing ? msg('...') : msg('Unfollow')}
                        </md-button>
                      </li>
                    `;
                  })
          }
        </ul>
      </main>
    `;
  }
}
