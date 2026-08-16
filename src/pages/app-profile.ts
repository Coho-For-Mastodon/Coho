import { LitElement, html, PropertyValues } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import {
  followUser,
  getAccount,
  getPinnedPosts,
  getUsersPosts,
  isFollowingMe,
  unfollowUser,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
  reportUser,
  type ProfilePostsFilter,
} from '../services/account';
import { withOptimisticUpdate } from '../utils/optimistic-updates';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

import '../components/timeline-item';
import '../components/md/md-dialog';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/report-dialog';
import '../components/post-detail-dialog';
import type { ReportSubmitDetail } from '../components/report-dialog';
import type { PostDetailDialog } from '../components/post-detail-dialog';
import type { Account } from '../mastodon/types';
import { getFamiliarFollowers } from '../mastodon/api/accounts';

import '../components/md/md-skeleton';
import '../components/md/md-skeleton-card';
import '../components/md/md-segmented-button';
import '../components/md/md-divider';

import '../components/md/md-badge';
import { Post } from '../interfaces/Post';
import { fadeInAnimation } from '../styles/animations';
import { profileStyles } from '../styles/profile-styles';
import '../components/post-dialog';
import type { PostDialog } from '../components/post-dialog';
import { router, type AppNavigationState } from '../router/routes';
import {
  ensureListMembershipDialogLoaded,
  ensureListsDialogLoaded,
} from '../utils/list-dialogs';

@localized()
@customElement('app-profile')
export class AppProfile extends LitElement {
  @state() user: Account | undefined;
  @state() posts: Post[] = [];
  @state() pinnedPosts: Post[] = [];
  @state() followed: boolean = false;
  @state() following: boolean = false;
  @state() notifying: boolean = false;
  @state() muted: boolean = false;
  @state() blocked: boolean = false;
  @state() followStatusLoaded: boolean = false;
  @state() selectedPost: Post | undefined = undefined;
  @state() isOwnProfile: boolean = false;
  @state() showReportDialog: boolean = false;
  @state() activeSegment: ProfilePostsFilter = 'posts';
  @state() loadingPosts: boolean = false;
  @state() loadingMorePosts: boolean = false;
  @state() hasMorePosts: boolean = true;
  @state() loadingProfile: boolean = true;
  @state() profileLoadFailed: boolean = false;
  @state() bannerReady: boolean = false;
  @state() bannerFailed: boolean = false;
  @state() avatarReady: boolean = false;
  @state() isGuestMode: boolean = false;
  @state() avatarFailed: boolean = false;
  @state() familiarFollowers: Account[] = [];
  private _currentProfileId: string | null = null;
  private _loadRequestId = 0;
  @state() showListMembershipDialog: boolean = false;
  @state() showListsDialog: boolean = false;
  private _mediaObserver: IntersectionObserver | null = null;
  private _listObserver: IntersectionObserver | null = null;
  private _boundRouteChanged = () => {
    void this.handleRouteChange();
  };

  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;
  @query('post-dialog') private editPostDialog!: PostDialog;

  static styles = [fadeInAnimation, profileStyles];

  private _resetImageStates() {
    this.bannerReady = false;
    this.bannerFailed = false;
    this.avatarReady = false;
    this.avatarFailed = false;
  }

  private _handleBannerLoad() {
    this.bannerReady = true;
  }

  private _handleBannerError() {
    this.bannerFailed = true;
  }

  private _handleAvatarLoad() {
    this.avatarReady = true;
  }

  private _handleAvatarError() {
    this.avatarFailed = true;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectIntersectionObserver(this._mediaObserver);
    disconnectIntersectionObserver(this._listObserver);
    this._mediaObserver = null;
    this._listObserver = null;
    router.removeEventListener('route-changed', this._boundRouteChanged);
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has('activeSegment') ||
      changedProperties.has('posts')
    ) {
      if (this.activeSegment === 'media') {
        this.setupMediaObserver();
      } else {
        disconnectIntersectionObserver(this._mediaObserver);
      }
    }

    this._setupInfiniteScroll();
  }

  setupMediaObserver() {
    // Wait for render
    setTimeout(() => {
      const sentinel = this.renderRoot.querySelector('#media-sentinel');
      if (!sentinel) return;

      if (this._mediaObserver) this._mediaObserver.disconnect();

      this._mediaObserver = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingMorePosts &&
            this.hasMorePosts
          ) {
            this.loadMorePosts();
          }
        },
        { rootMargin: '400px' }
      );

      this._mediaObserver.observe(sentinel);
    }, 0);
  }

  async firstUpdated() {
    // Check guest mode
    const { isGuestMode } = await import('../services/auth-state');
    this.isGuestMode = isGuestMode();
    router.addEventListener('route-changed', this._boundRouteChanged);
    await this.loadProfileFromUrl();
  }

  private async handleRouteChange() {
    const path = window.location.pathname;
    if (path !== '/account') return;
    await this.loadProfileFromUrl();
  }

  private async loadProfileFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id || id === this._currentProfileId) return;

    this._currentProfileId = id;
    const requestId = ++this._loadRequestId;

    // Reset view state when switching profiles.
    this.user = undefined;
    this.posts = [];
    this.pinnedPosts = [];
    this.followed = false;
    this.following = false;
    this.notifying = false;
    this.muted = false;
    this.blocked = false;
    this.followStatusLoaded = false;
    this.familiarFollowers = [];

    // Check if viewing own profile (only matters for authenticated users)
    const currentUserID = localStorage.getItem('currentUserID');
    this.isOwnProfile = !this.isGuestMode && currentUserID === id;

    this.loadingProfile = true;
    this.profileLoadFailed = false;
    this.loadingPosts = true;
    this._resetImageStates();

    // Check if account was passed via Navigation API state (instant render path)
    const navState = router.getNavigationState<AppNavigationState>();
    const navigationAccount =
      navState?.account && navState.account.id === id ? navState.account : null;
    if (navigationAccount) {
      this.user = navigationAccount;
      this.loadingProfile = false;
    }

    // Determine if we need to fetch relationship data
    const shouldFetchRelationship = !this.isOwnProfile && !this.isGuestMode;

    // Fetch account (if not already from nav state), posts, and relationship data in parallel
    const [
      accountData,
      postsData,
      relationshipData,
      pinnedPostsData,
      familiarData,
    ] = await Promise.all([
      navigationAccount ? Promise.resolve(navigationAccount) : getAccount(id),
      getUsersPosts(id),
      shouldFetchRelationship
        ? isFollowingMe(id).catch(() => null)
        : Promise.resolve(null),
      getPinnedPosts(id),
      shouldFetchRelationship
        ? getFamiliarFollowers(id).catch((err) => {
            console.error('[Profile] Failed to fetch familiar followers', err);
            return [] as Account[];
          })
        : Promise.resolve([] as Account[]),
    ]);

    // Ignore stale async results after a newer profile load starts.
    if (requestId !== this._loadRequestId) return;

    if (accountData) {
      this.user = accountData;
    } else {
      // Profile couldn't be loaded (offline with no cache)
      this.profileLoadFailed = true;
      this.loadingProfile = false;
      this.loadingPosts = false;
      return;
    }

    this.posts = Array.isArray(postsData) ? postsData : [];
    this.pinnedPosts = Array.isArray(pinnedPostsData) ? pinnedPostsData : [];
    this.loadingProfile = false;
    this.loadingPosts = false;

    // Process relationship data if we fetched it
    if (shouldFetchRelationship && relationshipData) {
      if (Array.isArray(relationshipData) && relationshipData[0]) {
        this.followed = relationshipData[0].following;
        this.following = relationshipData[0].followed_by;
        this.notifying = Boolean(relationshipData[0].notifying);
        this.muted = relationshipData[0].muting;
        this.blocked = relationshipData[0].blocking;
      }
      this.followStatusLoaded = true;
    }

    this.familiarFollowers = familiarData;
  }

  async follow() {
    if (!this.user) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to follow users',
            variant: 'info',
          },
        })
      );
      return;
    }

    // Store original state for rollback
    const originalFollowed = this.followed;

    import('../utils/haptics').then(({ hapticImpact }) =>
      hapticImpact('light')
    );

    await withOptimisticUpdate(
      // Apply optimistic update
      () => {
        this.followed = true;
        this.requestUpdate();
      },
      // Execute actual API call
      () => followUser(this.user!.id),
      // Rollback on failure
      () => {
        this.followed = originalFollowed;
        this.requestUpdate();
      },
      { errorMessage: 'Failed to follow user.' }
    );
  }

  async reloadPosts() {
    if (!this.user) return;
    this.loadingPosts = true;
    this.hasMorePosts = true; // Reset pagination state
    const [postsData, pinnedPostsData] = await Promise.all([
      getUsersPosts(this.user.id, this.activeSegment),
      this.activeSegment === 'posts'
        ? getPinnedPosts(this.user.id)
        : Promise.resolve(this.pinnedPosts),
    ]);
    this.posts = postsData;
    if (this.activeSegment === 'posts') {
      this.pinnedPosts = Array.isArray(pinnedPostsData) ? pinnedPostsData : [];
    }
    this.loadingPosts = false;
  }

  private async loadMorePosts() {
    if (this.loadingMorePosts || !this.user || !this.hasMorePosts) return;
    this.loadingMorePosts = true;

    try {
      // Get the last post ID to use for pagination
      const lastPostId =
        this.posts.length > 0
          ? this.posts[this.posts.length - 1].id
          : undefined;

      if (!lastPostId) {
        this.loadingMorePosts = false;
        return;
      }

      const newPosts = await getUsersPosts(
        this.user.id,
        this.activeSegment,
        lastPostId
      );

      if (!Array.isArray(newPosts) || newPosts.length === 0) {
        // No more posts to load
        this.hasMorePosts = false;
        this.loadingMorePosts = false;
        return;
      }

      // Deduplicate posts by ID to prevent showing duplicates
      const existingIds = new Set(this.posts.map((post) => post.id));
      const uniqueNewPosts = newPosts.filter(
        (post) => !existingIds.has(post.id)
      );

      if (uniqueNewPosts.length === 0) {
        this.hasMorePosts = false;
        this.loadingMorePosts = false;
        return;
      }

      // Append new posts to existing list
      this.posts = [...this.posts, ...uniqueNewPosts];
    } catch (err) {
      console.error('[loadMorePosts] Failed to load more posts:', err);
    } finally {
      this.loadingMorePosts = false;
    }
  }

  async handleSegmentChange(e: CustomEvent<{ value: string }>) {
    const newSegment = e.detail.value as ProfilePostsFilter;
    if (newSegment === this.activeSegment) return;

    this.activeSegment = newSegment;
    await this.reloadPosts();
  }

  private _setupInfiniteScroll() {
    const list = this.shadowRoot?.querySelector('.scroller-fallback');
    if (!list) return;

    const items = list.querySelectorAll('.post-item');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    if (!this._listObserver) {
      this._listObserver = createIntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingMorePosts &&
            this.hasMorePosts
          ) {
            this.loadMorePosts();
          }
        },
        {
          root: this,
          rootMargin: '500px',
          threshold: 0,
        }
      );
    }

    // Re-observe the current last item after each render
    this._listObserver.disconnect();
    this._listObserver.observe(lastItem);
  }

  private handlePinChange(
    e: CustomEvent<{ post: Post; pinned: boolean }>
  ): void {
    const { post, pinned } = e.detail;
    if (!post) return;

    const updatedPost = { ...post, pinned };

    if (pinned) {
      if (!this.pinnedPosts.some((item) => item.id === post.id)) {
        this.pinnedPosts = [updatedPost, ...this.pinnedPosts];
      }
    } else if (this.pinnedPosts.length > 0) {
      this.pinnedPosts = this.pinnedPosts.filter((item) => item.id !== post.id);
    }

    if (this.posts.length > 0) {
      this.posts = this.posts.map((item) =>
        item.id === post.id ? { ...item, pinned } : item
      );
    }
  }

  async unfollow() {
    if (!this.user) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to unfollow users',
            variant: 'info',
          },
        })
      );
      return;
    }

    // Store original state for rollback
    const originalFollowed = this.followed;

    import('../utils/haptics').then(({ hapticImpact }) =>
      hapticImpact('light')
    );

    await withOptimisticUpdate(
      // Apply optimistic update
      () => {
        this.followed = false;
        this.requestUpdate();
      },
      // Execute actual API call
      () => unfollowUser(this.user!.id),
      // Rollback on failure
      () => {
        this.followed = originalFollowed;
        this.requestUpdate();
      },
      { errorMessage: 'Failed to unfollow user.' }
    );
  }

  async toggleNotify() {
    if (!this.user || !this.followed) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to manage post notifications',
            variant: 'info',
          },
        })
      );
      return;
    }

    const originalNotifying = this.notifying;
    const nextNotifying = !originalNotifying;

    import('../utils/haptics').then(({ hapticImpact }) =>
      hapticImpact('light')
    );

    await withOptimisticUpdate(
      () => {
        this.notifying = nextNotifying;
        this.requestUpdate();
      },
      () => followUser(this.user!.id, { notify: nextNotifying }),
      () => {
        this.notifying = originalNotifying;
        this.requestUpdate();
      },
      { errorMessage: 'Failed to update post notifications.' }
    );
  }

  async mute() {
    if (!this.user) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to mute users',
            variant: 'info',
          },
        })
      );
      return;
    }

    await muteUser(this.user.id);
    this.muted = true;
  }

  async unmute() {
    if (!this.user) return;
    await unmuteUser(this.user.id);
    this.muted = false;
  }

  async block() {
    if (!this.user) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to block users',
            variant: 'info',
          },
        })
      );
      return;
    }
    await blockUser(this.user.id);
    this.blocked = true;
  }

  async unblock() {
    if (!this.user) return;
    await unblockUser(this.user.id);
    this.blocked = false;
  }

  openReportDialog() {
    this.showReportDialog = true;
  }

  async openListMembershipDialog() {
    if (!this.user) return;

    if (this.isGuestMode) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Sign in to add users to lists',
            variant: 'info',
          },
        })
      );
      return;
    }

    await ensureListMembershipDialogLoaded();

    this.showListMembershipDialog = true;
  }

  async openListsDialog() {
    if (this.isGuestMode) return;

    await ensureListsDialogLoaded();

    this.showListsDialog = true;
  }

  async handleOpenManageListsFromMembership() {
    this.showListMembershipDialog = false;
    await this.openListsDialog();
  }

  async handleReportSubmit(e: CustomEvent<ReportSubmitDetail>) {
    const detail = e.detail;

    try {
      await reportUser(detail.accountId, {
        comment: detail.comment,
        category: detail.category,
        forward: detail.forward,
      });

      this.showReportDialog = false;
    } catch (error) {
      console.error('Failed to submit report:', error);
    }
  }

  handleReportCancel() {
    this.showReportDialog = false;
  }

  editPost(tweet: Post) {
    if (this.editPostDialog) {
      this.editPostDialog.openEditDialog(tweet);
    }
  }

  private _handleReplyClicked(e: CustomEvent<{ tweet: Post }>) {
    e.preventDefault();
    const post = e.detail.tweet;
    if (!post || !this.editPostDialog) return;
    this.editPostDialog.openReplyDialog(post);
  }

  private _handleQuoteClicked(e: CustomEvent<{ tweet: Post }>) {
    const post = e.detail.tweet;
    if (!post || !this.editPostDialog) return;
    this.editPostDialog.openQuoteDialog(post);
  }

  handleOpenPost(tweet: Post) {
    // Open post in a fullscreen dialog instead of navigating to a new page
    this.postDetailDialog?.open(tweet);
  }

  private goToFollowers() {
    if (this.user) {
      router.navigate(`/followers?id=${this.user.id}`);
    }
  }

  private goToFollowing() {
    if (this.user) {
      router.navigate(`/following?id=${this.user.id}`);
    }
  }

  private _navigateToAccount(account: Account) {
    router.navigate(`/account?id=${account.id}`, {
      state: { account },
    });
  }

  private _renderFamiliarFollowers() {
    const followers = this.familiarFollowers;
    if (followers.length === 0) return null;

    const MAX_AVATARS = 3;
    const displayAvatars = followers.slice(0, MAX_AVATARS);

    const nameLink = (account: Account) =>
      html`<a
        class="familiar-name"
        href="/account?id=${account.id}"
        @click="${(e: Event) => {
          e.preventDefault();
          this._navigateToAccount(account);
        }}"
        >${account.display_name || account.username}</a
      >`;

    let text;
    if (followers.length === 1) {
      text = html`${msg(str`Followed by`)} ${nameLink(followers[0])}`;
    } else if (followers.length === 2) {
      text = html`${msg(str`Followed by`)} ${nameLink(followers[0])}
      ${msg(str`and`)} ${nameLink(followers[1])}`;
    } else if (followers.length === 3) {
      text = html`${msg(str`Followed by`)} ${nameLink(followers[0])},
      ${nameLink(followers[1])}, ${msg(str`and`)} ${nameLink(followers[2])}`;
    } else {
      const othersCount = followers.length - 2;
      text = html`${msg(str`Followed by`)} ${nameLink(followers[0])},
      ${nameLink(followers[1])}, ${msg(str`and ${othersCount} others`)}`;
    }

    return html`
      <div id="familiar-followers">
        <div class="familiar-avatars">
          ${displayAvatars.map(
            (account) => html`
              <img
                class="familiar-avatar"
                src="${account.avatar}"
                alt="${account.display_name || account.username}"
                loading="lazy"
                @click="${() => this._navigateToAccount(account)}"
              />
            `
          )}
        </div>
        <span class="familiar-text">${text}</span>
      </div>
    `;
  }

  renderMediaGrid() {
    return html`
      <div class="media-grid">
        ${this.posts.map((post) => {
          const attachment = post.media_attachments?.[0];
          if (!attachment) return null;

          const isVideo =
            attachment.type === 'video' || attachment.type === 'gifv';
          const isAudio = attachment.type === 'audio';

          return html`
            <div class="media-item" @click=${() => this.handleOpenPost(post)}>
              ${
                isAudio
                  ? html`<div
                      style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: var(--md-sys-color-surface-container, #1e1e24);"
                    >
                      <md-icon
                        name="musical-notes"
                        style="font-size: 48px; color: var(--md-sys-color-primary, #c0c7ff);"
                      ></md-icon>
                    </div>`
                  : html`<img
                      src="${attachment.preview_url || attachment.url}"
                      alt="${attachment.description || ''}"
                      loading="lazy"
                    />`
              }
              ${
                isVideo
                  ? html`
                      <div class="media-indicator">
                        <md-icon name="play" style="font-size: 16px;"></md-icon>
                      </div>
                    `
                  : null
              }
              ${
                isAudio
                  ? html`
                      <div class="media-indicator">
                        <md-icon
                          name="musical-notes"
                          style="font-size: 16px;"
                        ></md-icon>
                      </div>
                    `
                  : null
              }
              ${
                post.media_attachments && post.media_attachments.length > 1
                  ? html`
                      <div
                        class="media-indicator"
                        style="right: auto; left: 6px;"
                      >
                        <md-icon
                          name="albums"
                          style="font-size: 16px;"
                        ></md-icon>
                      </div>
                    `
                  : null
              }
            </div>
          `;
        })}
      </div>

      <!-- Sentinel for infinite scroll -->
      <div id="media-sentinel" style="height: 20px; width: 100%;"></div>

      ${
        this.loadingMorePosts
          ? html`<div
              class="load-more-indicator"
              style="text-align: center; padding: 20px;"
            >
              <md-skeleton width="100px" height="20px"></md-skeleton>
            </div>`
          : null
      }
    `;
  }

  render() {
    // Show offline fallback if profile couldn't be loaded
    if (this.profileLoadFailed) {
      return html`
        <app-header ?enableBack="${true}"></app-header>
        <div id="offline-message">
          <md-icon name="cloud-offline"></md-icon>
          <h2>${msg('Profile unavailable')}</h2>
          <p>
            ${msg(
              "This profile hasn't been viewed before and can't be loaded while offline."
            )}
          </p>
          <md-button variant="filled" @click="${() => window.location.reload()}"
            >${msg('Try again')}</md-button
          >
        </div>
      `;
    }

    const showPinned =
      this.activeSegment === 'posts' && this.pinnedPosts.length > 0;
    const pinnedIds = showPinned
      ? new Set(this.pinnedPosts.map((post) => post.id))
      : null;
    const visiblePosts = showPinned
      ? this.posts.filter((post) => !pinnedIds!.has(post.id))
      : this.posts;

    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <post-dialog @published="${() => this.reloadPosts()}"></post-dialog>

        <!-- Banner -->
        <div id="banner">
          ${
            this.user?.header
              ? html`
                  ${
                    !this.bannerFailed
                      ? html`<img
                          id="banner-img"
                          src="${this.user.header}"
                          alt="Profile banner"
                          @load=${() => this._handleBannerLoad()}
                          @error=${() => this._handleBannerError()}
                          style="opacity: ${this.bannerReady ? 1 : 0};"
                        />`
                      : null
                  }
                  ${
                    !this.bannerReady || this.bannerFailed
                      ? html`<md-skeleton
                          id="banner-skeleton"
                          class="skeleton-overlay"
                        ></md-skeleton>`
                      : null
                  }
                `
              : html`<md-skeleton id="banner-skeleton"></md-skeleton>`
          }
        </div>

        <!-- Profile Header -->
        <div id="profile-header">
          <!-- Avatar (overlapping banner) -->
          <div id="avatar-container">
            <div id="avatar-stack">
              ${
                this.user?.avatar && !this.avatarFailed
                  ? html`<img
                      id="avatar"
                      src="${this.user.avatar}"
                      alt="${this.user.display_name}'s avatar"
                      @load=${() => this._handleAvatarLoad()}
                      @error=${() => this._handleAvatarError()}
                      style="opacity: ${this.avatarReady ? 1 : 0};"
                    />`
                  : null
              }
              ${
                !this.user?.avatar || !this.avatarReady || this.avatarFailed
                  ? html`<md-skeleton
                      id="avatar-skeleton"
                      class="skeleton-overlay"
                    ></md-skeleton>`
                  : null
              }
            </div>
          </div>

          <!-- Actions row (follow, menu) -->
          <div id="actions-row">
            ${
              !this.isOwnProfile && this.user
                ? html`
                    ${
                      this.followStatusLoaded
                        ? html`
                            ${
                              this.followed
                                ? html`<md-button
                                    variant="outlined"
                                    @click="${() => this.unfollow()}"
                                    >${msg('Following')}</md-button
                                  >`
                                : html`<md-button
                                    variant="filled"
                                    @click="${() => this.follow()}"
                                    >${msg('Follow')}</md-button
                                  >`
                            }
                            ${
                              this.followed
                                ? html`<md-icon-button
                                    name="${
                                      this.notifying
                                        ? 'notifications'
                                        : 'notifications-off'
                                    }"
                                    .label="${
                                      this.notifying
                                        ? msg(
                                            str`Turn off post notifications for @${this.user?.acct}`
                                          )
                                        : msg(
                                            str`Notify me when @${this.user?.acct} posts`
                                          )
                                    }"
                                    title="${
                                      this.notifying
                                        ? msg('Turn off post notifications')
                                        : msg('Notify me when this user posts')
                                    }"
                                    @click="${() => this.toggleNotify()}"
                                  ></md-icon-button>`
                                : null
                            }
                            <md-dropdown placement="bottom-end">
                              <md-icon-button
                                slot="trigger"
                                name="ellipsis-vertical"
                                .label="${msg('More options')}"
                              ></md-icon-button>
                              <md-menu>
                                ${
                                  this.muted
                                    ? html`<md-menu-item
                                        @click="${() => this.unmute()}"
                                      >
                                        <md-icon
                                          slot="prefix"
                                          name="volume-mute"
                                        ></md-icon>
                                        ${msg('Unmute')}
                                      </md-menu-item>`
                                    : html`<md-menu-item
                                        @click="${() => this.mute()}"
                                      >
                                        <md-icon
                                          slot="prefix"
                                          name="volume-mute"
                                        ></md-icon>
                                        ${msg('Mute')}
                                      </md-menu-item>`
                                }
                                ${
                                  this.blocked
                                    ? html`<md-menu-item
                                        @click="${() => this.unblock()}"
                                      >
                                        <md-icon
                                          slot="prefix"
                                          name="ban"
                                        ></md-icon>
                                        ${msg('Unblock')}
                                      </md-menu-item>`
                                    : html`<md-menu-item
                                        @click="${() => this.block()}"
                                      >
                                        <md-icon
                                          slot="prefix"
                                          name="ban"
                                        ></md-icon>
                                        ${msg('Block')}
                                      </md-menu-item>`
                                }
                                <md-menu-item
                                  @click="${() => this.openListMembershipDialog()}"
                                >
                                  <md-icon
                                    slot="prefix"
                                    name="albums"
                                  ></md-icon>
                                  ${msg('Add to list')}
                                </md-menu-item>
                                <md-menu-item
                                  @click="${() => this.openReportDialog()}"
                                >
                                  <md-icon slot="prefix" name="flag"></md-icon>
                                  ${msg('Report')}
                                </md-menu-item>
                              </md-menu>
                            </md-dropdown>
                          `
                        : html`
                            <div id="actions-skeleton" aria-hidden="true">
                              <md-skeleton class="action-button"></md-skeleton>
                              <md-skeleton
                                class="action-icon"
                                shape="circle"
                              ></md-skeleton>
                            </div>
                          `
                    }
                  `
                : null
            }
          </div>

          <!-- Profile Info -->
          <div id="profile-info">
            ${
              this.user
                ? html`
                    <h1 id="display-name">${this.user.display_name}</h1>
                    <p id="handle">@${this.user.acct}</p>

                    ${
                      this.followed && this.following
                        ? html`<span id="mutuals-badge">
                            <md-icon
                              name="people"
                              style="font-size: 14px;"
                            ></md-icon>
                            ${msg('Mutuals')}
                          </span>`
                        : null
                    }
                    ${
                      this.user.note
                        ? html`<div
                            id="bio"
                            .innerHTML=${this.user.note}
                          ></div>`
                        : null
                    }

                    <div id="stats-row">
                      <span class="stat" @click="${() => this.goToFollowing()}">
                        <span class="stat-count"
                          >${(
                            this.user.following_count ?? 0
                          ).toLocaleString()}</span
                        >
                        <span class="stat-label">${msg('Following')}</span>
                      </span>
                      <span class="stat" @click="${() => this.goToFollowers()}">
                        <span class="stat-count"
                          >${(
                            this.user.followers_count ?? 0
                          ).toLocaleString()}</span
                        >
                        <span class="stat-label">${msg('Followers')}</span>
                      </span>
                    </div>

                    ${
                      this.familiarFollowers.length > 0
                        ? this._renderFamiliarFollowers()
                        : null
                    }
                    ${
                      this.user.fields && this.user.fields.length > 0
                        ? html`
                            <div id="fields">
                              ${this.user.fields.map(
                                (field) => html`
                                  <div class="field-row">
                                    <span
                                      class="field-name"
                                      .innerHTML="${field.name}"
                                    ></span>
                                    <span
                                      class="field-value"
                                      .innerHTML="${field.value}"
                                    ></span>
                                  </div>
                                `
                              )}
                            </div>
                          `
                        : null
                    }
                  `
                : html`
                    <md-skeleton id="display-name-skeleton"></md-skeleton>
                    <md-skeleton id="handle-skeleton"></md-skeleton>
                    <div id="stats-skeleton" aria-hidden="true">
                      <md-skeleton width="96px" height="18px"></md-skeleton>
                      <md-skeleton width="110px" height="18px"></md-skeleton>
                    </div>
                    <div id="bio-skeleton">
                      <md-skeleton></md-skeleton>
                      <md-skeleton></md-skeleton>
                      <md-skeleton></md-skeleton>
                    </div>
                    <div id="fields-skeleton" aria-hidden="true">
                      <div class="field-skeleton-row">
                        <md-skeleton class="field-name"></md-skeleton>
                        <md-skeleton class="field-value"></md-skeleton>
                      </div>
                      <div class="field-skeleton-row">
                        <md-skeleton class="field-name"></md-skeleton>
                        <md-skeleton class="field-value"></md-skeleton>
                      </div>
                    </div>
                  `
            }
          </div>
        </div>

        <!-- Tabs -->
        <div id="tabs-container">
          ${
            this.loadingProfile
              ? html`
                  <div id="tabs-skeleton" aria-hidden="true">
                    <md-skeleton></md-skeleton>
                    <md-skeleton></md-skeleton>
                    <md-skeleton></md-skeleton>
                  </div>
                `
              : html`
                  <md-segmented-button
                    .value="${this.activeSegment}"
                    aria-label="${msg('Profile content')}"
                    @segment-change="${(e: CustomEvent) =>
                      this.handleSegmentChange(e)}"
                  >
                    <md-segment value="posts">${msg('Posts')}</md-segment>
                    <md-segment value="posts_replies"
                      >${msg('Replies')}</md-segment
                    >
                    <md-segment value="media">${msg('Media')}</md-segment>
                  </md-segmented-button>
                `
          }
        </div>

        <!-- Posts -->
        <div id="posts-container">
          ${
            showPinned
              ? html`
                  <div id="pinned-section">
                    <div id="pinned-header">
                      <md-icon name="bookmark" size="18px"></md-icon>
                      <span>${msg('Pinned')}</span>
                    </div>
                    <ul id="pinned-list">
                      ${this.pinnedPosts.map(
                        (post) => html`
                          <li class="post-item">
                            <timeline-item
                              @open="${(e: CustomEvent<{ tweet: Post }>) =>
                                this.handleOpenPost(e.detail.tweet)}"
                              @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                                this.editPost(e.detail.tweet)}"
                              @reply-clicked="${(
                                e: CustomEvent<{ tweet: Post }>
                              ) => this._handleReplyClicked(e)}"
                              @quote-clicked="${(
                                e: CustomEvent<{ tweet: Post }>
                              ) => this._handleQuoteClicked(e)}"
                              @delete="${() => this.reloadPosts()}"
                              @pin-change="${(e: CustomEvent) =>
                                this.handlePinChange(e)}"
                              .tweet=${post}
                              ?guestMode="${this.isGuestMode}"
                              ?allowPin="${
                                this.isOwnProfile && !this.isGuestMode
                              }"
                            ></timeline-item>
                          </li>
                        `
                      )}
                    </ul>
                    <md-divider></md-divider>
                  </div>
                `
              : null
          }
          ${
            this.loadingPosts && this.posts.length === 0 && !showPinned
              ? html`<md-skeleton-card count="5"></md-skeleton-card>`
              : this.activeSegment === 'media'
                ? this.renderMediaGrid()
                : html`
                    <ul
                      class="scroller-fallback ${
                        this.loadingPosts ? 'posts-loading' : ''
                      }"
                      role="list"
                    >
                      ${visiblePosts.map(
                        (post) => html`
                          <li class="post-item">
                            <timeline-item
                              @open="${(e: CustomEvent<{ tweet: Post }>) =>
                                this.handleOpenPost(e.detail.tweet)}"
                              @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                                this.editPost(e.detail.tweet)}"
                              @reply-clicked="${(
                                e: CustomEvent<{ tweet: Post }>
                              ) => this._handleReplyClicked(e)}"
                              @quote-clicked="${(
                                e: CustomEvent<{ tweet: Post }>
                              ) => this._handleQuoteClicked(e)}"
                              @delete="${() => this.reloadPosts()}"
                              @pin-change="${(e: CustomEvent) =>
                                this.handlePinChange(e)}"
                              .tweet=${post}
                              ?guestMode="${this.isGuestMode}"
                              ?allowPin="${
                                this.isOwnProfile && !this.isGuestMode
                              }"
                            ></timeline-item>
                          </li>
                        `
                      )}
                      ${
                        this.loadingMorePosts
                          ? html`<li
                              class="load-more-indicator"
                              style="list-style: none;"
                            >
                              <md-skeleton
                                width="100%"
                                height="120px"
                              ></md-skeleton>
                            </li>`
                          : null
                      }
                    </ul>
                  `
          }
        </div>

        <report-dialog
          .open=${this.showReportDialog}
          .accountId=${this.user?.id || ''}
          .accountAcct=${this.user?.acct || ''}
          @report-submit=${this.handleReportSubmit}
          @report-cancel=${this.handleReportCancel}
        ></report-dialog>

        ${
          this.showListMembershipDialog
            ? html`<list-membership-dialog
                .open=${this.showListMembershipDialog}
                .account=${this.user ?? null}
                @md-dialog-hide=${() => (this.showListMembershipDialog = false)}
                @open-manage-lists=${() =>
                  this.handleOpenManageListsFromMembership()}
              ></list-membership-dialog>`
            : null
        }
        ${
          this.showListsDialog
            ? html`<lists-dialog
                .open=${this.showListsDialog}
                @md-dialog-hide=${() => (this.showListsDialog = false)}
              ></lists-dialog>`
            : null
        }

        <!-- Post Detail Dialog -->
        <post-detail-dialog></post-detail-dialog>
      </main>
    `;
  }
}
