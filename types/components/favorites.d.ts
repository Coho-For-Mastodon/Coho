import { LitElement } from 'lit';
import { Post } from '../interfaces/Post';
import './timeline-item';
import './md/md-skeleton-card';
import './md/md-divider';
export declare class Favorites extends LitElement {
  favorites: Post[];
  isLoading: boolean;
  static styles: import('lit').CSSResult[];
  private observer;
  connectedCallback(): void;
  disconnectedCallback(): void;
  private setupObserver;
  private loadFavorites;
  render(): import('lit-html').TemplateResult<1>;
}
