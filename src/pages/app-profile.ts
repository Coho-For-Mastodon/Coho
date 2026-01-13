import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import {
  followUser,
  getAccount,
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
import { shouldLoadMore } from '../utils/infinite-scroll';
import '@lit-labs/virtualizer';
import type { VisibilityChangedEvent } from '@lit-labs/virtualizer';

import '../components/timeline-item';
import '../components/md/md-dialog';
import '../components/md/md-text-area';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/report-dialog';
import '../components/post-detail-dialog';
import type { ReportSubmitDetail } from '../components/report-dialog';
import type { MdDialog } from '../components/md/md-dialog';
import type { MdTextArea } from '../components/md/md-text-area';
import type { PostDetailDialog } from '../components/post-detail-dialog';
import type { Account } from '../mastodon/types';

import '../components/md/md-skeleton';
import '../components/md/md-skeleton-card';
import '../components/md/md-segmented-button';
import '../components/md/md-divider';

import '../components/md/md-badge';
import { Post } from '../interfaces/Post';
import { editPost } from '../services/posts';
import { router, type AppNavigationState } from '../router/routes';

@localized()
@customElement('app-profile')
export class AppProfile extends LitElement {
  @state() user: Account | undefined;
  @state() posts: Post[] = [];
  @state() followed: boolean = false;
  @state() following: boolean = false;
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

  @query('#preview-content') private previewContent!: HTMLElement;
  @query('#edit') private editDialog!: MdDialog;
  @query('#content') private contentTextArea!: MdTextArea;
  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;

  static styles = [
    css`
      :host {
        display: block;
        overflow-y: auto;
        height: 100vh;
        scroll-timeline: --page-scroll block;
      }

      * {
        box-sizing: border-box;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      #edit-input-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      a {
        color: var(--md-sys-color-primary);
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      #edit-input-block md-text-area::part(textarea) {
        height: 200px;
      }

      /* Banner section with scroll-driven parallax */
      #banner {
        width: 100%;
        height: 200px;
        background: linear-gradient(
          135deg,
          var(--md-sys-color-surface-container-low) 0%,
          var(--md-sys-color-surface-container) 50%,
          var(--md-sys-color-surface-container-high) 100%
        );
        background-size: cover;
        background-position: center;
        position: relative;
        margin-top: 40px;
        overflow: hidden;
        view-timeline-name: --banner-timeline;
        view-timeline-axis: block;
      }

      .skeleton-overlay {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: block;
      }

      #banner-img {
        width: 100%;
        height: 120%;
        object-fit: cover;
        object-position: center;
        animation: banner-parallax linear both;
        animation-timeline: --page-scroll;
        animation-range: 0px 300px;
        transform-origin: center top;
      }

      @keyframes banner-parallax {
        from {
          transform: translateY(0) scale(1);
          filter: brightness(1);
        }
        to {
          transform: translateY(-15%) scale(1.05);
          filter: brightness(0.85);
        }
      }

      #banner-skeleton {
        width: 100%;
        height: 100%;
      }

      /* Profile header section */
      #profile-header {
        position: relative;
        padding: 0 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      #avatar-container {
        position: absolute;
        top: -64px;
        left: 16px;
        z-index: 10;
      }

      #avatar-stack {
        position: relative;
        width: 128px;
        height: 128px;
      }

      #avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 4px solid
          var(--md-sys-color-surface, var(--md-sys-color-background));
        object-fit: cover;
        background: var(--md-sys-color-surface, var(--md-sys-color-background));
        animation: avatar-scale linear both;
        animation-timeline: --page-scroll;
        animation-range: 0px 250px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transition: box-shadow 0.3s ease;
      }

      #avatar:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
      }

      @keyframes avatar-scale {
        0% {
          transform: scale(1) translateY(0);
        }
        100% {
          transform: scale(0.85) translateY(-8px);
        }
      }

      #avatar-skeleton {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 4px solid
          var(--md-sys-color-surface, var(--md-sys-color-background));
      }

      /* Actions row (follow button, etc.) */
      #actions-row {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 12px 0;
        gap: 8px;
        min-height: 68px;
      }

      #actions-skeleton {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #actions-skeleton md-skeleton.action-button {
        width: 120px;
        height: 40px;
      }

      #actions-skeleton md-skeleton.action-icon {
        width: 40px;
        height: 40px;
      }

      #actions-row md-button {
        font-weight: 700;
        min-width: 100px;
        animation: fadeIn 0.2s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Profile info */
      #profile-info {
        padding: 0 0 16px 0;
      }

      #display-name {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
        color: var(--md-sys-color-on-surface);
        line-height: 1.2;
      }

      #display-name-skeleton {
        height: 24px;
        width: 180px;
        margin-bottom: 4px;
      }

      #handle {
        font-size: 15px;
        color: var(--md-sys-color-on-surface-variant);
        margin: 2px 0 12px 0;
      }

      #handle-skeleton {
        height: 18px;
        width: 140px;
      }

      #bio {
        font-size: 15px;
        line-height: 1.4;
        color: var(--md-sys-color-on-surface);
        margin: 12px 0;
        word-wrap: break-word;
      }

      #bio a {
        color: var(--md-sys-color-primary);
      }

      #bio-skeleton {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 12px 0;
      }

      #bio-skeleton md-skeleton {
        height: 16px;
      }

      #bio-skeleton md-skeleton:first-child {
        width: 100%;
      }

      #bio-skeleton md-skeleton:nth-child(2) {
        width: 90%;
      }

      #bio-skeleton md-skeleton:last-child {
        width: 60%;
      }

      /* Stats row */
      #stats-row {
        display: flex;
        gap: 20px;
        margin: 12px 0;
      }

      #stats-skeleton {
        display: flex;
        gap: 12px;
        margin: 12px 0;
        align-items: center;
      }

      #stats-skeleton md-skeleton {
        height: 18px;
      }

      .stat {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      .stat:hover {
        opacity: 0.8;
      }

      .stat-count {
        font-weight: 700;
        font-size: 14px;
        color: var(--md-sys-color-on-surface);
      }

      .stat-label {
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
      }

      /* Mutuals badge */
      #mutuals-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        padding: 4px 10px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }

      /* Fields section */
      #fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      #fields-skeleton {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .field-skeleton-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-skeleton-row md-skeleton.field-name {
        width: 120px;
        height: 14px;
      }

      .field-skeleton-row md-skeleton.field-value {
        width: 85%;
        height: 18px;
      }

      .field-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .field-name {
        font-size: 13px;
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 500;
      }

      .field-value {
        font-size: 15px;
        color: var(--md-sys-color-on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .field-value a {
        color: var(--md-sys-color-primary);
        text-decoration: none;
      }

      .field-value a:hover {
        text-decoration: underline;
      }

      #fields img {
        height: 18px;
        vertical-align: middle;
      }

      /* Tabs section */
      #tabs-container {
        border-top: 1px solid var(--md-sys-color-outline-variant);
        max-width: 600px;
        margin: 0 auto;
        padding: 0 16px;
        padding-top: 16px !important;

        margin-top: 1em;
        margin-bottom: 2em;
      }

      md-segmented-button {
        width: 100%;
        margin: 0;
      }

      #tabs-skeleton {
        display: flex;
        gap: 10px;
        width: 100%;
      }

      #tabs-skeleton md-skeleton {
        height: 40px;
        flex: 1;
      }

      /* Posts list */
      #posts-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 0 16px;
      }

      lit-virtualizer {
        display: block;
        contain: none;
      }

      .post-item {
        padding-bottom: 16px;
        width: 100%;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;
        gap: 16px;
      }

      .posts-loading {
        opacity: 0.5;
        pointer-events: none;
      }

      .load-more-indicator {
        display: flex;
        justify-content: center;
        padding: 20px;
      }

      /* Responsive */
      @media (min-width: 640px) {
        #banner {
          height: 420px;
        }

        #banner-img {
          animation-range: 0px 450px;
        }

        #avatar {
          animation-range: 0px 400px;
        }

        #avatar-stack {
          width: 134px;
          height: 134px;
        }

        #avatar-container {
          top: -67px;
        }

        #display-name {
          font-size: 22px;
        }

        #tabs-container {
          animation-range: 350px 550px;
        }
      }

      @media (max-width: 640px) {
        #profile-header {
          padding: 0 12px;
        }

        #avatar-container {
          left: 12px;
          top: -50px;
        }

        #avatar-stack {
          width: 100px;
          height: 100px;
        }

        #actions-row {
          min-height: 54px;
        }

        #tabs-container,
        #posts-container {
          padding: 0 12px;
        }

        #display-name {
          font-size: 18px;
        }

        #handle,
        #bio {
          font-size: 14px;
        }
      }

      /* Scroll-driven animations */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #profile-info {
        animation: fadeIn 0.3s ease-out;
      }

      /* Stats row scroll animation */
      #stats-row {
        animation: stats-reveal linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 100%;
      }

      @keyframes stats-reveal {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Posts list staggered reveal */
      ul li {
        animation: post-reveal linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 40%;
      }

      @keyframes post-reveal {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Tabs container scroll effect */
      #tabs-container {
        animation-timeline: --page-scroll;
        animation-range: 200px 400px;
      }

      @keyframes tabs-sticky {
        from {
          background: transparent;
        }
        to {
          background: color-mix(
            in srgb,
            var(--md-sys-color-surface) 90%,
            transparent
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      }

      /* Fallback for browsers without scroll-driven animation support */
      @supports not (animation-timeline: scroll()) {
        #banner-img {
          animation: none;
          height: 100%;
          transform: none;
        }

        #avatar {
          animation: none;
          transform: none;
        }

        #stats-row {
          animation: none;
          opacity: 1;
          transform: none;
        }

        ul li {
          animation: none;
          opacity: 1;
          transform: none;
        }

        #tabs-container {
          animation: none;
        }
      }

      /* Offline fallback */
      #offline-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
        gap: 16px;
        margin-top: 60px;
      }

      #offline-message md-icon {
        font-size: 48px;
        color: var(--md-sys-color-on-surface-variant);
      }

      #offline-message h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--md-sys-color-on-surface);
      }

      #offline-message p {
        margin: 0;
        font-size: 14px;
        color: var(--md-sys-color-on-surface-variant);
        max-width: 300px;
      }
    `,
  ];

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

  async firstUpdated() {
    // Check guest mode
    const { isGuestMode } = await import('../services/auth-state');
    this.isGuestMode = isGuestMode();

    // get id from query string
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      // Check if viewing own profile (only matters for authenticated users)
      const currentUserID = localStorage.getItem('currentUserID');
      this.isOwnProfile = !this.isGuestMode && currentUserID === id;

      this.loadingProfile = true;
      this.profileLoadFailed = false;
      this.loadingPosts = true;
      this._resetImageStates();

      // Check if account was passed via Navigation API state (instant render path)
      const navState = router.getNavigationState<AppNavigationState>();
      if (navState?.account && navState.account.id === id) {
        this.user = navState.account;
        this.loadingProfile = false;
      }

      // Determine if we need to fetch relationship data
      const shouldFetchRelationship = !this.isOwnProfile && !this.isGuestMode;

      // Fetch account (if not already from nav state), posts, and relationship data in parallel
      const [accountData, postsData, relationshipData] = await Promise.all([
        // Skip account fetch if we already have it from navigation state
        this.user ? Promise.resolve(this.user) : getAccount(id),
        getUsersPosts(id),
        // isFollowingMe returns the full relationship object with following, followed_by, muting, blocking
        shouldFetchRelationship
          ? isFollowingMe(id).catch(() => null)
          : Promise.resolve(null),
      ]);

      console.log(accountData);

      if (accountData) {
        this.user = accountData;
      } else {
        // Profile couldn't be loaded (offline with no cache)
        this.profileLoadFailed = true;
        this.loadingProfile = false;
        this.loadingPosts = false;
        return;
      }

      console.log(postsData);
      this.posts = Array.isArray(postsData) ? postsData : [];
      this.loadingProfile = false;
      this.loadingPosts = false;

      // Process relationship data if we fetched it
      if (shouldFetchRelationship && relationshipData) {
        console.log('relationshipData', relationshipData);
        if (Array.isArray(relationshipData) && relationshipData[0]) {
          this.followed = relationshipData[0].following;
          this.following = relationshipData[0].followed_by;
          this.muted = relationshipData[0].muting;
          this.blocked = relationshipData[0].blocking;
        }
        this.followStatusLoaded = true;
      }
    }
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
    const postsData = await getUsersPosts(this.user.id, this.activeSegment);
    console.log(postsData);

    this.posts = postsData;
    this.loadingPosts = false;
  }

  /** Handle visibility changes from lit-virtualizer to trigger load more */
  private async _handleVisibilityChanged(e: VisibilityChangedEvent) {
    if (shouldLoadMore(e, this.posts.length, this.loadingMorePosts)) {
      await this.loadMorePosts();
    }
  }

  /** Load more posts for infinite scroll */
  private async loadMorePosts() {
    if (!this.user || this.loadingMorePosts || !this.hasMorePosts) return;

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
    console.log('edit post', tweet);

    this.selectedPost = tweet;

    if (this.previewContent) {
      this.previewContent.innerHTML = tweet.content;
    }

    this.editDialog?.show();
  }

  handleOpenPost(tweet: Post) {
    // Open post in a fullscreen dialog instead of navigating to a new page
    this.postDetailDialog?.open(tweet);
  }

  async confirmEdit() {
    const newContent = this.contentTextArea?.value;

    if (newContent && this.selectedPost) {
      await editPost(this.selectedPost.id, newContent);
    }

    this.editDialog?.hide();
  }

  private goToFollowers() {
    if (this.user) {
      window.location.href = `/followers?id=${this.user.id}`;
    }
  }

  private goToFollowing() {
    if (this.user) {
      window.location.href = `/following?id=${this.user.id}`;
    }
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

    return html`
      <app-header ?enableBack="${true}"></app-header>

      <md-dialog id="edit" .label="${msg('Edit Post')}">
        <span id="preview-content"></span>

        <div id="edit-input-block">
          <md-text-area id="content"></md-text-area>

          <md-button @click=${() => this.confirmEdit()}
            >${msg('Save')}</md-button
          >
        </div>
      </md-dialog>

      <!-- Banner -->
      <div id="banner">
        ${this.user?.header
          ? html`
              ${!this.bannerFailed
                ? html`<img
                    id="banner-img"
                    src="${this.user.header}"
                    alt="Profile banner"
                    @load=${() => this._handleBannerLoad()}
                    @error=${() => this._handleBannerError()}
                    style="opacity: ${this.bannerReady ? 1 : 0};"
                  />`
                : null}
              ${!this.bannerReady || this.bannerFailed
                ? html`<md-skeleton
                    id="banner-skeleton"
                    class="skeleton-overlay"
                  ></md-skeleton>`
                : null}
            `
          : html`<md-skeleton id="banner-skeleton"></md-skeleton>`}
      </div>

      <!-- Profile Header -->
      <div id="profile-header">
        <!-- Avatar (overlapping banner) -->
        <div id="avatar-container">
          <div id="avatar-stack">
            ${this.user?.avatar && !this.avatarFailed
              ? html`<img
                  id="avatar"
                  src="${this.user.avatar}"
                  alt="${this.user.display_name}'s avatar"
                  @load=${() => this._handleAvatarLoad()}
                  @error=${() => this._handleAvatarError()}
                  style="opacity: ${this.avatarReady ? 1 : 0};"
                />`
              : null}
            ${!this.user?.avatar || !this.avatarReady || this.avatarFailed
              ? html`<md-skeleton
                  id="avatar-skeleton"
                  class="skeleton-overlay"
                ></md-skeleton>`
              : null}
          </div>
        </div>

        <!-- Actions row (follow, menu) -->
        <div id="actions-row">
          ${!this.isOwnProfile && this.user
            ? html`
                ${this.followStatusLoaded
                  ? html`
                      ${this.followed
                        ? html`<md-button
                            variant="outlined"
                            @click="${() => this.unfollow()}"
                            >${msg('Following')}</md-button
                          >`
                        : html`<md-button
                            variant="filled"
                            @click="${() => this.follow()}"
                            >${msg('Follow')}</md-button
                          >`}
                      <md-dropdown placement="bottom-end">
                        <md-icon-button
                          slot="trigger"
                          name="ellipsis-vertical"
                          .label="${msg('More options')}"
                        ></md-icon-button>
                        <md-menu>
                          ${this.muted
                            ? html`<md-menu-item
                                @click="${() => this.unmute()}"
                              >
                                <md-icon
                                  slot="prefix"
                                  name="volume-mute"
                                ></md-icon>
                                ${msg(str`Unmute @${this.user?.acct}`)}
                              </md-menu-item>`
                            : html`<md-menu-item @click="${() => this.mute()}">
                                <md-icon
                                  slot="prefix"
                                  name="volume-mute"
                                ></md-icon>
                                ${msg(str`Mute @${this.user?.acct}`)}
                              </md-menu-item>`}
                          ${this.blocked
                            ? html`<md-menu-item
                                @click="${() => this.unblock()}"
                              >
                                <md-icon slot="prefix" name="ban"></md-icon>
                                ${msg(str`Unblock @${this.user?.acct}`)}
                              </md-menu-item>`
                            : html`<md-menu-item @click="${() => this.block()}">
                                <md-icon slot="prefix" name="ban"></md-icon>
                                ${msg(str`Block @${this.user?.acct}`)}
                              </md-menu-item>`}
                          <md-menu-item
                            @click="${() => this.openReportDialog()}"
                          >
                            <md-icon slot="prefix" name="flag"></md-icon>
                            ${msg(str`Report @${this.user?.acct}`)}
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
                    `}
              `
            : null}
        </div>

        <!-- Profile Info -->
        <div id="profile-info">
          ${this.user
            ? html`
                <h1 id="display-name">${this.user.display_name}</h1>
                <p id="handle">@${this.user.acct}</p>

                ${this.followed && this.following
                  ? html`<span id="mutuals-badge">
                      <md-icon name="people" style="font-size: 14px;"></md-icon>
                      ${msg('Mutuals')}
                    </span>`
                  : null}
                ${this.user.note
                  ? html`<div id="bio" .innerHTML=${this.user.note}></div>`
                  : null}

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

                ${this.user.fields && this.user.fields.length > 0
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
                  : null}
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
              `}
        </div>
      </div>

      <!-- Tabs -->
      <div id="tabs-container">
        ${this.loadingProfile
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
                @segment-change="${(e: CustomEvent) =>
                  this.handleSegmentChange(e)}"
              >
                <md-segment value="posts">${msg('Posts')}</md-segment>
                <md-segment value="posts_replies">${msg('Replies')}</md-segment>
                <md-segment value="media">${msg('Media')}</md-segment>
              </md-segmented-button>
            `}
      </div>

      <!-- Posts -->
      <div id="posts-container">
        ${this.loadingPosts && this.posts.length === 0
          ? html`<md-skeleton-card count="5"></md-skeleton-card>`
          : html`
              <lit-virtualizer
                class="${this.loadingPosts ? 'posts-loading' : ''}"
                .items=${this.posts}
                .renderItem=${(post: Post) => html`
                  <div class="post-item">
                    <timeline-item
                      @open="${(e: CustomEvent<{ tweet: Post }>) =>
                        this.handleOpenPost(e.detail.tweet)}"
                      @edit="${(e: CustomEvent<{ tweet: Post }>) =>
                        this.editPost(e.detail.tweet)}"
                      @delete="${() => this.reloadPosts()}"
                      .tweet=${post}
                      ?guestMode="${this.isGuestMode}"
                    ></timeline-item>
                  </div>
                `}
                @visibilityChanged=${this._handleVisibilityChanged}
              ></lit-virtualizer>
              ${this.loadingMorePosts
                ? html`<div class="load-more-indicator">
                    <md-skeleton width="100%" height="120px"></md-skeleton>
                  </div>`
                : null}
            `}
      </div>

      <report-dialog
        .open=${this.showReportDialog}
        .accountId=${this.user?.id || ''}
        .accountAcct=${this.user?.acct || ''}
        @report-submit=${this.handleReportSubmit}
        @report-cancel=${this.handleReportCancel}
      ></report-dialog>

      <!-- Post Detail Dialog -->
      <post-detail-dialog></post-detail-dialog>
    `;
  }
}
