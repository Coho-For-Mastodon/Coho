import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';

import './md/md-skeleton-card';

@customElement('app-favorites')
export class Favorites extends LitElement {
  @state() favorites: Post[] = [];
  @state() isLoading = true;

  static styles = [
    css`
      :host {
        display: block;

        content-visibility: auto;
        contain: layout style paint;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;

        height: 90vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }
    `,
  ];

  async firstUpdated() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          this.isLoading = true;
          const { getFavorites } = await import('../services/favorites');
          const favoritesData = await getFavorites();
          console.log(favoritesData);

          this.favorites = favoritesData;
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
          : this.favorites.map((favorite: Post) => {
              return html` <timeline-item .tweet=${favorite}></timeline-item> `;
            })}
      </ul>
    `;
  }
}
