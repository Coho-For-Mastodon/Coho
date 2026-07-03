import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

import './timeline-item';
import './timeline-list';
import './md/md-skeleton-card';
import './md/md-divider';

@customElement('app-bookmarks')
export class Bookmarks extends LitElement {
  @state() bookmarks: Post[] = [];
  @state() isLoading = true;

  private _observer: IntersectionObserver | null = null;

  static styles = css`
    :host {
      display: block;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();

    disconnectIntersectionObserver(this._observer);
    this._observer = createIntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          this.isLoading = true;

          // First, check for preloaded data for instant display
          const { getPreloadedBookmarks } = await import('../services/preload');
          const preloaded = getPreloadedBookmarks();

          if (preloaded && preloaded.length > 0) {
            this.bookmarks = preloaded;
          } else {
            // Fallback to fetching if no preloaded data
            const { getBookmarks } = await import('../services/bookmarks');
            const bookmarksData = await getBookmarks();
            this.bookmarks = bookmarksData;
          }

          this.isLoading = false;
          disconnectIntersectionObserver(this._observer);
          this._observer = null;
        }
      });
    });

    this._observer.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectIntersectionObserver(this._observer);
    this._observer = null;
  }

  private handleBookmarkChange(
    event: CustomEvent<{ id: string; active: boolean }>
  ) {
    const { id, active } = event.detail;
    if (active) return;
    this.bookmarks = this.bookmarks.filter((bookmark) => bookmark.id !== id);
  }

  render() {
    return html`
      <timeline-list>
        ${
          this.isLoading
            ? html`<md-skeleton-card count="5"></md-skeleton-card>`
            : this.bookmarks.map((bookmark: Post) => {
                return html`
                  <timeline-item
                    .tweet=${bookmark}
                    @bookmark-change=${(event: CustomEvent) =>
                      this.handleBookmarkChange(
                        event as CustomEvent<{
                          id: string;
                          active: boolean;
                        }>
                      )}
                  ></timeline-item>
                `;
              })
        }
      </timeline-list>
    `;
  }
}
