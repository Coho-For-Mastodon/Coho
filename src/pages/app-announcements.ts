import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import {
  dismissAnnouncement,
  getAnnouncements,
  SERVER_ANNOUNCEMENTS_IDB_KEY,
} from '../mastodon/api/announcements';
import type { Announcement } from '../mastodon/types';
import { parseEmojis } from '../utils/emoji-parser';

import '../components/md/md-skeleton';
import '../components/md/md-button';
import '../components/md/md-card';

@localized()
@customElement('app-announcements')
export class AppAnnouncements extends LitElement {
  @state() private announcements: Announcement[] = [];
  @state() private loading = true;
  @state() private _dismissingIds = new Set<string>();

  static styles = css`
    :host {
      display: block;
      overflow-y: auto;
      height: 100vh;
    }

    main {
      padding-top: 50px;
      padding-left: 6em;
      padding-right: 6em;
      padding-bottom: 48px;
      box-sizing: border-box;
      max-width: 720px;
      margin: 0 auto;
    }

    @media (max-width: 820px) {
      main {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    h2 {
      animation: slideInFromLeft 0.3s ease-in-out;
      margin-bottom: 16px;
    }

    @keyframes slideInFromLeft {
      from {
        opacity: 0;
        transform: translateX(-12px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .announcement-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: var(--md-sys-typescale-body-small-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant, #878792);
    }

    .unread-badge {
      background: var(--md-sys-color-primary-container, #4f378b);
      color: var(--md-sys-color-on-primary-container, #eaddff);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .announcement-body {
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .announcement-body a {
      color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    }

    .announcement-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: var(--md-sys-color-on-surface-variant, #878792);
    }

    .skeleton-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `;

  async firstUpdated() {
    await this._loadCached();
    await this.refresh();
  }

  private async _loadCached() {
    try {
      const { get } = await import('idb-keyval');
      const cached = (await get(SERVER_ANNOUNCEMENTS_IDB_KEY)) as
        | Announcement[]
        | undefined;
      if (cached?.length) {
        this.announcements = this._sortAnnouncements(cached);
      }
    } catch {
      /* ignore */
    }
  }

  private _sortAnnouncements(list: Announcement[]): Announcement[] {
    return [...list].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }

  private async refresh() {
    this.loading = true;
    try {
      const fresh = await getAnnouncements();
      this.announcements = this._sortAnnouncements(fresh);
      const { set } = await import('idb-keyval');
      await set(SERVER_ANNOUNCEMENTS_IDB_KEY, fresh);
    } finally {
      this.loading = false;
    }
  }

  private _formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private async _dismiss(a: Announcement) {
    const next = new Set(this._dismissingIds);
    next.add(a.id);
    this._dismissingIds = next;

    const ok = await dismissAnnouncement(a.id);
    if (ok) {
      this.announcements = this.announcements.map((item) =>
        item.id === a.id ? { ...item, read: true } : item
      );
      try {
        const { set } = await import('idb-keyval');
        await set(SERVER_ANNOUNCEMENTS_IDB_KEY, this.announcements);
      } catch {
        /* ignore */
      }
    } else {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Could not dismiss announcement.'),
            variant: 'error',
          },
        })
      );
    }

    const updated = new Set(this._dismissingIds);
    updated.delete(a.id);
    this._dismissingIds = updated;
  }

  private renderSkeleton() {
    return html`
      <div class="skeleton-stack">
        ${[1, 2, 3].map(
          () => html`
            <md-card variant="filled">
              <md-skeleton width="35%" height="12px"></md-skeleton>
              <md-skeleton
                width="100%"
                height="72px"
                style="margin-top:12px;"
              ></md-skeleton>
            </md-card>
          `
        )}
      </div>
    `;
  }

  private renderAnnouncement(a: Announcement) {
    const dismissing = this._dismissingIds.has(a.id);
    const unread = a.read === false;
    return html`
      <md-card variant="filled">
        <div class="announcement-meta">
          <span>${this._formatDate(a.published_at)}</span>
          ${unread
            ? html`<span class="unread-badge">${msg('Unread')}</span>`
            : nothing}
        </div>
        <div
          class="announcement-body"
          .innerHTML=${parseEmojis(a.content, a.emojis ?? [])}
        ></div>
        ${unread
          ? html`
              <div class="announcement-actions">
                <md-button
                  variant="text"
                  size="small"
                  ?disabled=${dismissing}
                  @click=${() => this._dismiss(a)}
                >
                  ${dismissing ? msg('…') : msg('Dismiss')}
                </md-button>
              </div>
            `
          : nothing}
      </md-card>
    `;
  }

  render() {
    const showSkeleton = this.loading && this.announcements.length === 0;

    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Server announcements')}</h2>

        <div class="toolbar">
          <md-button
            variant="text"
            ?disabled=${this.loading}
            @click=${() => this.refresh()}
          >
            ${msg('Refresh')}
          </md-button>
        </div>

        ${showSkeleton
          ? this.renderSkeleton()
          : this.announcements.length === 0
            ? html`<p class="empty-state">
                ${msg('No announcements from your server right now.')}
              </p>`
            : html`
                <div class="list">
                  ${this.announcements.map((a) => this.renderAnnouncement(a))}
                </div>
              `}
      </main>
    `;
  }
}
