import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { parseEmojis } from '../utils/emoji-parser';
import type { StatusEdit } from '../mastodon/types/status';
import { getEditHistory } from '../services/posts';

import './md/md-dialog';
import './md/md-skeleton';
import './md/md-icon';

@customElement('post-edit-history-dialog')
export class PostEditHistoryDialog extends LitElement {
  @state() private open = false;
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private history: StatusEdit[] = [];

  static styles = css`
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 8px 0;
    }

    .history-item {
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #444746);
      padding-bottom: 16px;
    }

    .history-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .version-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface-variant, #c4c7c5);
      font-size: 0.85rem;
    }

    .version-badge {
      background: var(--md-sys-color-secondary-container, #4a4458);
      color: var(--md-sys-color-on-secondary-container, #e8def8);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .version-date {
      flex: 1;
    }

    .sensitive-badge {
      background: var(--md-sys-color-error-container, #93000a);
      color: var(--md-sys-color-on-error-container, #ffdad6);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
    }

    .spoiler-text {
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-high, #2b2930);
      color: var(--md-sys-color-on-surface-variant, #c4c7c5);
      font-size: 0.85rem;
      font-style: italic;
    }

    .version-content {
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .version-content a {
      color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    }

    .media-thumbnails {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .media-thumbnail {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--md-sys-color-surface-container, #1e1e24);
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 8px 0;
    }

    .skeleton-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .error-message {
      text-align: center;
      padding: 24px;
      color: var(--md-sys-color-error, #f2b8b5);
    }

    .empty-message {
      text-align: center;
      padding: 24px;
      color: var(--md-sys-color-on-surface-variant, #c4c7c5);
    }
  `;

  async show(postId: string) {
    this.open = true;
    this.loading = true;
    this.error = null;
    this.history = [];

    try {
      this.history = await getEditHistory(postId);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  private hide() {
    this.open = false;
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateString;
    }
  }

  render() {
    return html`
      <md-dialog
        .open=${this.open}
        label=${msg('Edit history')}
        @md-dialog-hide=${() => this.hide()}
      >
        ${this.loading
          ? this.renderSkeleton()
          : this.error
            ? html`<div class="error-message">${this.error}</div>`
            : this.history.length === 0
              ? html`<div class="empty-message">
                  ${msg('No edit history available.')}
                </div>`
              : this.renderHistory()}
      </md-dialog>
    `;
  }

  private renderSkeleton() {
    return html`
      <div class="skeleton-list">
        ${[1, 2, 3].map(
          () => html`
            <div class="skeleton-item">
              <md-skeleton width="40%" height="1em"></md-skeleton>
              <md-skeleton width="100%" height="3em"></md-skeleton>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderHistory() {
    return html`
      <div class="history-list">
        ${this.history.map((version, index) => {
          const versionNum = this.history.length - index;
          const isOriginal = index === this.history.length - 1;

          return html`
            <div class="history-item">
              <div class="version-header">
                <span class="version-badge">
                  ${isOriginal ? msg('Original') : msg(`Version ${versionNum}`)}
                </span>
                <span class="version-date"
                  >${this.formatDate(version.created_at)}</span
                >
                ${version.sensitive
                  ? html`<span class="sensitive-badge"
                      >${msg('Sensitive')}</span
                    >`
                  : nothing}
              </div>
              ${version.spoiler_text
                ? html`<div class="spoiler-text">${version.spoiler_text}</div>`
                : nothing}
              <div
                class="version-content"
                .innerHTML=${parseEmojis(version.content, version.emojis || [])}
              ></div>
              ${version.media_attachments &&
              version.media_attachments.length > 0
                ? html`
                    <div class="media-thumbnails">
                      ${version.media_attachments.map(
                        (media) => html`
                          <img
                            class="media-thumbnail"
                            src=${media.preview_url || media.url}
                            alt=${media.description || ''}
                            loading="lazy"
                          />
                        `
                      )}
                    </div>
                  `
                : nothing}
            </div>
          `;
        })}
      </div>
    `;
  }
}
