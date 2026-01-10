import { LitElement } from 'lit';
import './md/md-skeleton';
import './md/md-badge';
import './md/md-button';
import './md/md-icon';
import './md/md-icon-button';
import './md/md-dropdown';
import './md/md-menu';
import './md/md-menu-item';
import type { Account } from '../mastodon/types/account';
import type { TrendingTag } from '../mastodon/types/instance';
/**
 * Right sidebar component for the home page.
 * Displays user profile card (or guest welcome) and trending tags.
 */
export declare class HomeSidebar extends LitElement {
  user: Account | null;
  trendingTags: TrendingTag[];
  isGuestMode: boolean;
  static styles: import('lit').CSSResult;
  private goToFollowers;
  private goToFollowing;
  private viewMyProfile;
  private shareMyProfile;
  private editMyProfile;
  private navigateToTag;
  render(): import('lit-html').TemplateResult<1>;
  private renderGuestCard;
  private renderProfileCard;
  private renderTrendingTags;
}
declare global {
  interface HTMLElementTagNameMap {
    'home-sidebar': HomeSidebar;
  }
}
