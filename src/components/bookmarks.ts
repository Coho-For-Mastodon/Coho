import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';

import './timeline-item';
import './md/md-skeleton-card';
import './md/md-divider';

@customElement('app-bookmarks')
export class Bookmarks extends LitElement {
  @state() bookmarks: Post[] = [];
  @state() isLoading = true;

  static styles = [
    css`
      :host {
        display: block;

        contain: paint layout style;
        content-visibility: auto;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;

        gap: 16px;

        height: 90vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }

            @media (max-width: 820px) {
        .bookmarks-container {
          padding: 0;
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          this.isLoading = true;
          const { getBookmarks } = await import('../services/bookmarks');
          const bookmarksData = await getBookmarks();
          console.log(bookmarksData);

          this.bookmarks = bookmarksData;
          this.isLoading = false;

          observer.disconnect();
        }
      });
    }, options);

    observer.observe(this);
  }

  render() {
    return html`
      <ul class="scrollbar-hidden">
        ${this.isLoading
          ? html`<md-skeleton-card count="5"></md-skeleton-card>`
          : this.bookmarks.map((bookmark: Post) => {
              return html` <timeline-item .tweet=${bookmark}></timeline-item> `;
            })}
      </ul>
    `;
  }
}
