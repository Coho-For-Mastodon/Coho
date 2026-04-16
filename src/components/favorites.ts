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

@customElement('app-favorites')
export class Favorites extends LitElement {
  @state() favorites: Post[] = [];
  @state() isLoading = true;

  static styles = css`
    :host {
      display: block;
    }
  `;

  private _observer: IntersectionObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.setupObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectIntersectionObserver(this._observer);
    this._observer = null;
  }

  private setupObserver() {
    disconnectIntersectionObserver(this._observer);
    this._observer = createIntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          await this.loadFavorites();
          disconnectIntersectionObserver(this._observer);
          this._observer = null;
        }
      });
    });

    this._observer.observe(this);
  }

  private async loadFavorites() {
    this.isLoading = true;

    // First, check for preloaded data for instant display
    const { getPreloadedFavorites } = await import('../services/preload');
    const preloaded = getPreloadedFavorites();

    if (preloaded && preloaded.length > 0) {
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
      <timeline-list>
        ${this.isLoading
          ? html`<md-skeleton-card count="5"></md-skeleton-card>`
          : this.favorites.map((favorite: Post) => {
              return html` <timeline-item .tweet=${favorite}></timeline-item> `;
            })}
      </timeline-list>
    `;
  }
}
