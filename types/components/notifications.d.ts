import { LitElement, nothing } from 'lit';
import '@lit-labs/virtualizer';
import './user-profile';
import './timeline-item';
import './md/md-dialog';
import './md/md-switch';
import './md/md-button';
import './md/md-segmented-button';
import { Post } from '../interfaces/Post';
import { Notification } from '../interfaces/Notification';
import type { Account } from '../mastodon/types';
export declare class Notifications extends LitElement {
  notifications: Notification[];
  subbed: boolean;
  activeSegment: string;
  followingMap: Map<string, boolean>;
  loadingFollowMap: Map<string, boolean>;
  loadingMore: boolean;
  hasMoreNotifications: boolean;
  static styles: import('lit').CSSResult[];
  firstUpdated(): Promise<void>;
  checkFollowStatuses(): Promise<void>;
  private _handleVisibilityChanged;
  private getFilteredNotifications;
  private loadMore;
  clear(): Promise<void>;
  sub(flag: boolean): Promise<void>;
  openPost(tweet: Post | undefined): Promise<void>;
  openProfile(account: Account): Promise<void>;
  openLinkCard(url: string, e: Event): void;
  followBack(accountId: string, e: Event): Promise<void>;
  formatTimeAgo(dateString: string): string;
  getNotificationIcon(type: string): import('lit-html').TemplateResult<1>;
  getNotificationActionText(type: string): string;
  renderPostPreview(
    status: Post | undefined
  ): import('lit-html').TemplateResult<1> | typeof nothing;
  renderFollowNotification(
    notification: Notification
  ): import('lit-html').TemplateResult<1>;
  renderStatusNotification(
    notification: Notification
  ): import('lit-html').TemplateResult<1>;
  renderNotification(
    notification: Notification
  ): import('lit-html').TemplateResult<1>;
  private _renderNotificationItem;
  render(): import('lit-html').TemplateResult<1>;
}
