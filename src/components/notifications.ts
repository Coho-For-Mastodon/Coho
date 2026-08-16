import {
  LitElement,
  html,
  nothing,
  PropertyValues,
  type TemplateResult,
} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';
import { router } from '../router/routes';
import { parseEmojis } from '../utils/emoji-parser';
import { handleStatusContentClick } from '../utils/content-links';
import { renderLinkCard } from './timeline-renderers';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';
import { spinAnimation } from '../styles/animations';
import { notificationsStyles } from '../styles/notifications-styles';

import './user-profile';
import './timeline-item';
import './md/md-dialog';
import './md/md-switch';
import './md/md-button';
import './md/md-icon-button';

import './md/md-segmented-button';
import { Post } from '../interfaces/Post';
import { Notification } from '../interfaces/Notification';
import type { Account } from '../mastodon/types';
import { getConversations } from '../services/messages';

@localized()
@customElement('app-notifications')
export class Notifications extends LitElement {
  @state() notifications: Notification[] = [];
  @state() subbed: boolean = false;
  @state() activeSegment: string = 'all';
  @state() followingMap: Map<string, boolean> = new Map();
  @state() loadingFollowMap: Map<string, boolean> = new Map();
  @state() loadingRequestMap: Map<string, boolean> = new Map();
  @state() private handledRequests: Set<string> = new Set();
  @state() followRequests: Account[] = [];
  @state() loadingMore: boolean = false;
  @state() hasMoreNotifications: boolean = true;
  @state() private isCheckingForNew: boolean = false;
  @state() private openingDMId: string | null = null;

  private _observer: IntersectionObserver | null = null;
  private _loadObserver: IntersectionObserver | null = null;
  private _activeRoot: Element | null = null;

  private _applyFollowStatuses(
    results: Array<{ id: string; following: boolean }>
  ) {
    const followById = new Map(
      results.map(({ id, following }) => [id, following])
    );
    let hasChanges = false;

    const updatedNotifications = this.notifications.map((notification) => {
      if (notification.type !== 'follow') return notification;

      const following = followById.get(notification.account.id);
      if (following === undefined) return notification;

      const currentFollowing = (
        notification as Notification & { _cohoFollowing?: boolean }
      )._cohoFollowing;
      if (currentFollowing === following) return notification;

      hasChanges = true;
      return {
        ...notification,
        _cohoFollowing: following,
      } as Notification;
    });

    if (hasChanges) {
      this.notifications = updatedNotifications;
    }
  }

  private _setFollowStatusForAccount(accountId: string, following: boolean) {
    this._applyFollowStatuses([{ id: accountId, following }]);
  }

  static styles = [spinAnimation, notificationsStyles];

  async firstUpdated() {
    //load notifications when this component is visible using intersectionObserver

    disconnectIntersectionObserver(this._loadObserver);
    this._loadObserver = createIntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          if ('scheduler' in window) {
            await scheduler.yield();
          }
          // First, check for preloaded data for instant display
          const { getPreloadedNotifications } =
            await import('../services/preload');
          const preloaded = getPreloadedNotifications();

          if (preloaded && preloaded.length > 0) {
            if ('scheduler' in window) {
              await scheduler.yield();
            }
            this.notifications = preloaded;
          } else {
            // Fallback to fetching if no preloaded data
            if ('scheduler' in window) {
              await scheduler.yield();
            }
            const { getNotifications } =
              await import('../services/notifications');
            const notificationsData = await getNotifications();
            if ('scheduler' in window) {
              await scheduler.yield();
            }
            this.notifications = notificationsData;
          }

          if ('scheduler' in window) {
            await scheduler.yield();
          }
          // Check follow status for all follow notifications
          await this.checkFollowStatuses();

          // Fire-and-forget: loads in parallel, updates state reactively when ready
          void this._loadFollowRequests();

          if ('scheduler' in window) {
            await scheduler.yield();
          }
          // check push reg
          const { isNativePlatform } = await import('../utils/platform.js');
          if (isNativePlatform()) {
            const { isNativePushSubscribed } =
              await import('../services/push-native.js');
            this.subbed = isNativePushSubscribed();
          } else {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.pushManager) {
              const sub = await reg.pushManager.getSubscription();
              if (sub) {
                this.subbed = true;
              }
            }
          }

          if ('clearAppBadge' in navigator) {
            if ('scheduler' in window) {
              await scheduler.yield();
            }
            navigator.clearAppBadge?.();
          }

          disconnectIntersectionObserver(this._loadObserver);
          this._loadObserver = null;
        }
      });
    });

    this._loadObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectIntersectionObserver(this._observer);
    disconnectIntersectionObserver(this._loadObserver);
    this._observer = null;
    this._loadObserver = null;
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    this._setupInfiniteScroll();
  }

  private _setupInfiniteScroll() {
    const root = this.shadowRoot?.querySelector(
      '.panel.active .scroller-fallback'
    );
    if (!root) {
      disconnectIntersectionObserver(this._observer);
      this._observer = null;
      this._activeRoot = null;
      return;
    }

    const items = root.querySelectorAll('.notification-wrapper');
    const lastItem = items[items.length - 1];
    if (!lastItem) {
      // Disconnect observer when no items to prevent stale state
      disconnectIntersectionObserver(this._observer);
      this._observer = null;
      this._activeRoot = null;
      return;
    }

    // Rebuild the observer when the active panel changes
    if (this._activeRoot !== root) {
      disconnectIntersectionObserver(this._observer);
      this._observer = createIntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingMore &&
            this.hasMoreNotifications
          ) {
            this.loadMore();
          }
        },
        {
          root: root,
          rootMargin: '500px',
          threshold: 0,
        }
      );
      this._activeRoot = root;
    }

    // Re-observe the current last item after each render
    this._observer!.disconnect();
    this._observer!.observe(lastItem);
  }

  async checkFollowStatuses() {
    const followNotifications = this.notifications.filter(
      (n) => n.type === 'follow'
    );

    if (followNotifications.length === 0) return;

    const { isFollowingMe } = await import('../services/account');

    // Check all follow statuses in parallel
    const results = await Promise.all(
      followNotifications.map(async (n) => {
        try {
          const relationships = await isFollowingMe(n.account.id);
          return {
            id: n.account.id,
            following: relationships[0]?.following ?? false,
          };
        } catch {
          return { id: n.account.id, following: false };
        }
      })
    );

    // Update the map
    const newMap = new Map(this.followingMap);
    results.forEach(({ id, following }) => {
      newMap.set(id, following);
    });
    this.followingMap = newMap;
    this._applyFollowStatuses(results);
  }

  private getFilteredNotifications(): Notification[] {
    const allNotifications = this.notifications || [];
    switch (this.activeSegment) {
      case 'mentions':
        return allNotifications.filter((n) => n.type === 'mention');
      case 'follows':
        return allNotifications.filter((n) => n.type === 'follow');
      default:
        return allNotifications;
    }
  }

  private async loadMore() {
    if (this.loadingMore || !this.hasMoreNotifications) return;

    this.loadingMore = true;

    try {
      const lastId =
        this.notifications.length > 0
          ? this.notifications[this.notifications.length - 1]?.id
          : undefined;

      const { getNotifications } = await import('../services/notifications');
      const moreNotifications = await getNotifications(lastId, 20);

      // Deduplicate
      const existingIds = new Set(this.notifications.map((n) => n.id));
      const newNotifications = moreNotifications.filter(
        (n) => !existingIds.has(n.id)
      );

      if (newNotifications.length === 0) {
        this.hasMoreNotifications = false;
      } else {
        this.notifications = [...this.notifications, ...newNotifications];
        // Check follow statuses for new follow notifications
        await this.checkFollowStatuses();
      }
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      this.loadingMore = false;
    }
  }

  /**
   * Check for new notifications and prepend any that are newer than the current first.
   * Called by app-home when the notifications tab is re-selected.
   */
  async checkForNewNotifications(): Promise<void> {
    if (this.isCheckingForNew || this.notifications.length === 0) {
      return;
    }

    this.isCheckingForNew = true;

    try {
      const { getNotifications } = await import('../services/notifications');
      const freshNotifications = await getNotifications();

      if (freshNotifications.length === 0) {
        return;
      }

      const currentFirstId = this.notifications[0]?.id;
      if (!currentFirstId) {
        return;
      }

      // Mastodon IDs are Snowflake-like; lexicographic comparison works for ordering
      const existingIds = new Set(this.notifications.map((n) => n.id));
      const newNotifications = freshNotifications.filter(
        (n) => n.id > currentFirstId && !existingIds.has(n.id)
      );

      if (newNotifications.length > 0) {
        this.notifications = [...newNotifications, ...this.notifications];
        // Check follow statuses for any new follow notifications
        await this.checkFollowStatuses();
      }
    } catch (error) {
      // Silently fail — user still has cached content
      console.error('Background check for new notifications failed:', error);
    } finally {
      this.isCheckingForNew = false;
    }
  }

  async clear() {
    const { getNotifications, clearNotifications } =
      await import('../services/notifications');
    await clearNotifications();

    const notificationsData = await getNotifications();

    this.notifications = notificationsData;
  }

  async sub(flag: boolean) {
    const { subToPush, unsubToPush } =
      await import('../services/notifications');

    if (flag === false) {
      await unsubToPush();
    } else {
      try {
        await subToPush();
        this.subbed = true;
      } catch (err) {
        console.warn('[Notifications] Push subscription failed:', err);
      }
    }
  }

  private async _openNotificationPreferences() {
    const { NotificationPreferencesDialog } =
      await import('./notification-preferences-dialog.js');

    // Ensure the element is registered
    void NotificationPreferencesDialog;

    let dialog = this.shadowRoot?.querySelector(
      'notification-preferences-dialog'
    ) as
      | import('./notification-preferences-dialog').NotificationPreferencesDialog
      | null;

    if (!dialog) {
      dialog = document.createElement(
        'notification-preferences-dialog'
      ) as import('./notification-preferences-dialog').NotificationPreferencesDialog;
      this.shadowRoot?.appendChild(dialog);
    }

    await dialog.show();
  }

  async openPost(tweet: Post | undefined) {
    if (!tweet) return;

    // If this is a direct message, open in the messages UI instead
    if (tweet.visibility === 'direct') {
      this.openingDMId = tweet.id;
      try {
        const convs = await getConversations();
        // Prefer exact status match, fall back to 1:1 account match
        const conv =
          convs.find((c) => c.last_status?.id === tweet.id) ||
          convs.find(
            (c) =>
              c.accounts.length === 1 && c.accounts[0].id === tweet.account.id
          );
        if (conv) {
          await router.navigate(`/messages/${conv.id}`, {
            state: { conversation: conv },
          });
          return;
        }
      } catch (err) {
        console.error('[Notifications] Failed to find DM conversation:', err);
      } finally {
        this.openingDMId = null;
      }
    }

    // Dispatch event so parent can handle opening in dialog
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: { tweet },
        bubbles: true,
        composed: true,
      })
    );
  }

  async openProfile(account: Account) {
    if (!account) return;
    await router.navigate(`/account?id=${account.id}`, { state: { account } });
  }

  openLinkCard(url: string, e: Event) {
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async followBack(accountId: string, e: Event) {
    e.stopPropagation();

    // Set loading state
    const newLoadingMap = new Map(this.loadingFollowMap);
    newLoadingMap.set(accountId, true);
    this.loadingFollowMap = newLoadingMap;

    try {
      const { followUser } = await import('../services/account');
      await followUser(accountId);

      // Update following map
      const newFollowingMap = new Map(this.followingMap);
      newFollowingMap.set(accountId, true);
      this.followingMap = newFollowingMap;
      this._setFollowStatusForAccount(accountId, true);
    } catch (err) {
      console.error('Failed to follow user:', err);
    } finally {
      // Clear loading state
      const finalLoadingMap = new Map(this.loadingFollowMap);
      finalLoadingMap.set(accountId, false);
      this.loadingFollowMap = finalLoadingMap;
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return msg('just now');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  getNotificationIcon(type: string) {
    switch (type) {
      case 'favourite':
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>`;
      case 'reblog':
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
          />
        </svg>`;
      case 'mention':
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
          />
        </svg>`;
      case 'follow':
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>`;
      case 'update':
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          />
        </svg>`;
      default:
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
          />
        </svg>`;
    }
  }

  getNotificationActionText(type: string): string {
    switch (type) {
      case 'favourite':
        return msg('liked your post');
      case 'reblog':
        return msg('boosted your post');
      case 'mention':
        return msg('mentioned you');
      case 'follow':
        return msg('followed you');
      case 'follow_request':
        return msg('requested to follow you');
      case 'update':
        return msg('edited a post');
      default:
        return msg('interacted with you');
    }
  }

  renderPostPreview(status: Post | undefined) {
    if (!status) return nothing;

    const content = status.content || '';
    const mediaAttachments = status.media_attachments || [];
    const card = status.card;

    return html`
      <div class="post-preview">
        <div
          class="post-preview-content"
          @click="${(e: Event) => handleStatusContentClick(e, status)}"
          .innerHTML="${parseEmojis(content, status.emojis || [])}"
        ></div>
        ${
          mediaAttachments.length > 0
            ? html`
                <div class="post-preview-media">
                  ${mediaAttachments
                    .slice(0, 4)
                    .map(
                      (media) => html`
                        <img
                          src="${media.preview_url}"
                          alt="${media.description || 'Media attachment'}"
                        />
                      `
                    )}
                </div>
              `
            : nothing
        }
        ${renderLinkCard(
          card,
          (url: string) => {
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          },
          mediaAttachments.length > 0
        )}
      </div>
    `;
  }

  private async _loadFollowRequests() {
    try {
      const { getFollowRequests } =
        await import('../mastodon/api/follow-requests');
      this.followRequests = await getFollowRequests();
    } catch (err) {
      console.error('Failed to load follow requests:', err);
    }
  }

  private async _handleFollowRequest(
    accountId: string,
    e: Event,
    action: 'authorize' | 'reject'
  ) {
    e.stopPropagation();

    const newLoadingMap = new Map(this.loadingRequestMap);
    newLoadingMap.set(accountId, true);
    this.loadingRequestMap = newLoadingMap;

    try {
      const { authorizeFollowRequest, rejectFollowRequest } =
        await import('../mastodon/api/follow-requests');

      if (action === 'authorize') {
        await authorizeFollowRequest(accountId);
      } else {
        await rejectFollowRequest(accountId);
      }

      const newHandled = new Set(this.handledRequests);
      newHandled.add(accountId);
      this.handledRequests = newHandled;
      this.followRequests = this.followRequests.filter(
        (a) => a.id !== accountId
      );
    } catch (err) {
      console.error(`Failed to ${action} follow request:`, err);
    } finally {
      const finalLoadingMap = new Map(this.loadingRequestMap);
      finalLoadingMap.set(accountId, false);
      this.loadingRequestMap = finalLoadingMap;
    }
  }

  renderFollowRequestCard(account: Account) {
    const isLoading = this.loadingRequestMap.get(account.id) ?? false;
    const bioText = account.note?.replace(/<[^>]*>/g, '') || '';

    return html`
      <li
        class="notification-card follow"
        @click="${() => this.openProfile(account)}"
      >
        <div class="notification-header">
          <div class="notification-icon follow">
            ${this.getNotificationIcon('follow')}
          </div>
          <div class="notification-meta">
            <div class="notification-meta-top">
              <span class="notification-action"
                >${this.getNotificationActionText('follow_request')}</span
              >
            </div>
          </div>
        </div>

        <div class="follow-card">
          <div class="follow-user-info">
            <img
              class="follow-avatar"
              src="${account.avatar}"
              alt="${account.display_name}'s avatar"
              @click="${(e: Event) => {
                e.stopPropagation();
                this.openProfile(account);
              }}"
            />
            <div class="follow-details">
              <p
                class="follow-name"
                .innerHTML="${parseEmojis(
                  account.display_name || account.username,
                  account.emojis || []
                )}"
                @click="${(e: Event) => {
                  e.stopPropagation();
                  this.openProfile(account);
                }}"
              ></p>
              <p class="follow-handle">@${account.acct}</p>
              ${bioText ? html`<p class="follow-bio">${bioText}</p>` : nothing}
              <div class="follow-stats">
                <span class="follow-stat">
                  <strong
                    >${account.followers_count?.toLocaleString() || 0}</strong
                  >
                  ${msg('followers')}
                </span>
                <span class="follow-stat">
                  <strong
                    >${account.following_count?.toLocaleString() || 0}</strong
                  >
                  ${msg('following')}
                </span>
              </div>
            </div>
          </div>

          <div class="follow-actions">
            <md-button
              variant="filled"
              pill
              size="small"
              ?disabled="${isLoading}"
              @click="${(e: Event) =>
                this._handleFollowRequest(account.id, e, 'authorize')}"
            >
              ${isLoading ? msg('...') : msg('Accept')}
            </md-button>
            <md-button
              variant="outlined"
              pill
              size="small"
              ?disabled="${isLoading}"
              @click="${(e: Event) =>
                this._handleFollowRequest(account.id, e, 'reject')}"
            >
              ${msg('Reject')}
            </md-button>
          </div>
        </div>
      </li>
    `;
  }

  renderFollowNotification(notification: Notification) {
    const account = notification.account;
    const isFollowing =
      (notification as Notification & { _cohoFollowing?: boolean })
        ._cohoFollowing ??
      this.followingMap.get(account.id) ??
      false;
    const isLoading = this.loadingFollowMap.get(account.id) ?? false;

    // Strip HTML tags from bio for cleaner preview
    const bioText = account.note?.replace(/<[^>]*>/g, '') || '';

    return html`
      <li
        class="notification-card follow"
        @click="${() => this.openProfile(account)}"
      >
        <div class="notification-header">
          <div class="notification-icon follow">
            ${this.getNotificationIcon('follow')}
          </div>
          <div class="notification-meta">
            <div class="notification-meta-top">
              <span class="notification-action"
                >${this.getNotificationActionText('follow')}</span
              >
            </div>
            <div class="notification-time">
              ${this.formatTimeAgo(notification.created_at)}
            </div>
          </div>
        </div>

        <div class="follow-card">
          <div class="follow-user-info">
            <img
              class="follow-avatar"
              src="${account.avatar}"
              alt="${account.display_name}'s avatar"
              @click="${(e: Event) => {
                e.stopPropagation();
                this.openProfile(account);
              }}"
            />
            <div class="follow-details">
              <p
                class="follow-name"
                .innerHTML="${parseEmojis(
                  account.display_name || account.username,
                  account.emojis || []
                )}"
                @click="${(e: Event) => {
                  e.stopPropagation();
                  this.openProfile(account);
                }}"
              ></p>
              <p class="follow-handle">@${account.acct}</p>
              ${bioText ? html`<p class="follow-bio">${bioText}</p>` : nothing}
              <div class="follow-stats">
                <span class="follow-stat">
                  <strong
                    >${account.followers_count?.toLocaleString() || 0}</strong
                  >
                  ${msg('followers')}
                </span>
                <span class="follow-stat">
                  <strong
                    >${account.following_count?.toLocaleString() || 0}</strong
                  >
                  ${msg('following')}
                </span>
              </div>
            </div>
          </div>

          <div class="follow-actions">
            ${
              isFollowing
                ? html`
                    <md-button variant="outlined" pill size="small" disabled>
                      ${msg('Following')}
                    </md-button>
                  `
                : html`
                    <md-button
                      variant="filled"
                      pill
                      size="small"
                      class="follow-back-btn"
                      ?disabled="${isLoading}"
                      @click="${(e: Event) => this.followBack(account.id, e)}"
                    >
                      ${isLoading ? msg('Following...') : msg('Follow Back')}
                    </md-button>
                  `
            }
          </div>
        </div>
      </li>
    `;
  }

  renderStatusNotification(notification: Notification) {
    const account = notification.account;
    const type = notification.type;

    const isDMLoading = this.openingDMId === notification.status?.id;

    return html`
      <li
        class="notification-card ${type} ${isDMLoading ? 'dm-loading' : ''}"
        @click="${() => this.openPost(notification.status)}"
      >
        ${
          isDMLoading
            ? html`<div class="dm-loading-overlay">
                <div class="dm-loading-spinner"></div>
                <span>${msg('Opening conversation…')}</span>
              </div>`
            : nothing
        }
        <div class="notification-header">
          <div class="notification-icon ${type}">
            ${this.getNotificationIcon(type)}
          </div>
          <img
            class="notification-avatar"
            src="${account.avatar}"
            alt="${account.display_name}'s avatar"
            @click="${(e: Event) => {
              e.stopPropagation();
              this.openProfile(account);
            }}"
          />
          <div class="notification-meta">
            <div class="notification-meta-top">
              <span
                class="notification-user"
                .innerHTML="${parseEmojis(
                  account.display_name || account.username,
                  account.emojis || []
                )}"
                @click="${(e: Event) => {
                  e.stopPropagation();
                  this.openProfile(account);
                }}"
              ></span>
              <span class="notification-action"
                >${this.getNotificationActionText(type)}</span
              >
            </div>
            <div class="notification-time">
              ${this.formatTimeAgo(notification.created_at)}
            </div>
          </div>
        </div>
        ${this.renderPostPreview(notification.status)}
      </li>
    `;
  }

  renderNotification(notification: Notification) {
    if (notification.type === 'follow') {
      return this.renderFollowNotification(notification);
    }
    if (notification.type === 'follow_request') {
      if (this.handledRequests.has(notification.account.id)) {
        return nothing;
      }
      return this.renderFollowRequestCard(notification.account);
    }
    return this.renderStatusNotification(notification);
  }

  private _renderNotificationItem = (
    notification: Notification,
    index: number
  ): TemplateResult => {
    const filteredNotifications = this.getFilteredNotifications();
    const isLastItem = index === filteredNotifications.length - 1;

    return html`
      <div class="notification-wrapper">
        ${this.renderNotification(notification)}
        ${
          isLastItem && this.loadingMore
            ? html`
                <div id="load-more-indicator">
                  <md-icon src="/assets/refresh-circle-outline.svg"></md-icon>
                  <span>${msg('Loading more...')}</span>
                </div>
              `
            : nothing
        }
      </div>
    `;
  };

  render() {
    const allNotifications = this.notifications || [];
    const mentionNotifications = allNotifications.filter(
      (n) => n.type === 'mention'
    );
    const followNotifications = allNotifications.filter(
      (n) => n.type === 'follow'
    );

    return html`
      <div id="notify-actions">
        <div id="notify-inner">
          <md-switch
            ?checked="${this.subbed}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              this.sub(e.detail.checked)}"
            >${msg('Push Notifications')}</md-switch
          >
        </div>
        ${
          this.subbed
            ? html`<md-icon-button
                src="/assets/options-outline.svg"
                label="${msg('Notification settings')}"
                @click="${() => this._openNotificationPreferences()}"
              ></md-icon-button>`
            : nothing
        }
      </div>

      <md-segmented-button
        .value="${this.activeSegment}"
        aria-label="${msg('Notification filters')}"
        @segment-change="${(e: CustomEvent) =>
          (this.activeSegment = e.detail.value)}"
      >
        <md-segment value="all">${msg('All')}</md-segment>
        <md-segment value="mentions">${msg('Mentions')}</md-segment>
        <md-segment value="follows">${msg('Follows')}</md-segment>
        <md-segment value="requests"
          >${msg('Requests')}${
            this.followRequests.length > 0
              ? html` (${this.followRequests.length})`
              : nothing
          }</md-segment
        >
      </md-segmented-button>

      <div class="panel ${this.activeSegment === 'all' ? 'active' : ''}">
        ${
          allNotifications.length > 0
            ? html`<div class="scroller-fallback">
                ${allNotifications.map((n, i) =>
                  this._renderNotificationItem(n, i)
                )}
              </div>`
            : html`
                <div id="no">
                  <img src="/assets/notify-done.svg" alt="no notifications" />
                  <p>${msg('No notifications yet')}</p>
                </div>
              `
        }
      </div>

      <div class="panel ${this.activeSegment === 'mentions' ? 'active' : ''}">
        ${
          mentionNotifications.length > 0
            ? html`<div class="scroller-fallback">
                ${mentionNotifications.map((n, i) =>
                  this._renderNotificationItem(n, i)
                )}
              </div>`
            : html`
                <div id="no">
                  <img src="/assets/notify-done.svg" alt="no mentions" />
                  <p>${msg('No mentions yet')}</p>
                </div>
              `
        }
      </div>

      <div class="panel ${this.activeSegment === 'follows' ? 'active' : ''}">
        ${
          followNotifications.length > 0
            ? html`<div class="scroller-fallback">
                ${followNotifications.map((n, i) =>
                  this._renderNotificationItem(n, i)
                )}
              </div>`
            : html`
                <div id="no">
                  <img src="/assets/notify-done.svg" alt="no followers" />
                  <p>${msg('No new followers yet')}</p>
                </div>
              `
        }
      </div>

      <div class="panel ${this.activeSegment === 'requests' ? 'active' : ''}">
        ${
          this.followRequests.length > 0
            ? html`<div class="scroller-fallback">
                ${this.followRequests.map(
                  (account) =>
                    html`<div class="notification-wrapper">
                      ${this.renderFollowRequestCard(account)}
                    </div>`
                )}
              </div>`
            : html`
                <div id="no">
                  <img src="/assets/notify-done.svg" alt="no follow requests" />
                  <p>${msg('No pending follow requests')}</p>
                </div>
              `
        }
      </div>
    `;
  }
}
