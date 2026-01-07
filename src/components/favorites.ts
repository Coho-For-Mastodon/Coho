import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';

import './timeline-item';
import './md/md-skeleton-card';
import './md/md-divider';

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

        gap: 16px;

        height: 90vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }
    `,
  ];

  private observer: IntersectionObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.setupObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.observer = null;
  }

  private setupObserver() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          await this.loadFavorites();
          this.observer?.disconnect();
        }
      });
    }, options);

    this.observer.observe(this);
  }

  private async loadFavorites() {
    this.isLoading = true;

    // First, check for preloaded data for instant display
    const { getPreloadedFavorites } = await import('../services/preload');
    const preloaded = getPreloadedFavorites();

    if (preloaded && preloaded.length > 0) {
      console.log('[Favorites] Using preloaded data');
      this.favorites = preloaded;
    }

    // Always fetch fresh data to ensure we have the latest
    const { getFavorites } = await import('../services/favorites');
    const favoritesData = await getFavorites();
    this.favorites = favoritesData;

    this.isLoading = false;
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
