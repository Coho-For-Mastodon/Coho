import { LitElement, css, html, nothing } from 'lit';
import { property, customElement, state, query } from 'lit/decorators.js';

import '../components/timeline';
import '../components/timeline-item';
import '../components/md/md-skeleton';

import '../components/otter-drawer';
import '../components/md/md-button';
import '../components/md/md-badge';
import '../components/md/md-toolbar';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-dialog';
import '../components/md/md-switch';
import '../components/md/md-dropdown';
import '../components/md/md-tabs';
import '../components/md/md-tab';
import '../components/md/md-tab-panel';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-toast';
import '../components/offline-notify';

import type { OtterDrawer } from '../components/otter-drawer';
import type { MdDialog } from '../components/md/md-dialog';
import type { MdToast } from '../components/md/md-toast';
import type { Timeline } from '../components/timeline';
import type { PostDialog } from '../components/post-dialog';

import { styles } from '../styles/shared-styles';
import { router } from '../utils/router';
// import { resetLastPageID } from '../services/timeline';
import { Post } from '../interfaces/Post';
import type { Account } from '../mastodon/types/account';
import type { Instance, TrendingTag } from '../mastodon/types/instance';
import {
  checkNewNotifications,
  markNotificationsRead,
} from '../services/notifications';
import type {
  TabChangeEvent,
  HandleSummaryEvent,
  HandleTranslatingEvent,
  RepliesEvent,
  ColorChosenEvent,
} from '../types/events';

@customElement('app-home')
export class AppHome extends LitElement {
  // For more information on using properties and state in lit
  // check out this link https://lit.dev/docs/components/properties/
  @property() message = 'Welcome!';

  @state() user: Account | null = null;
  @state() attachmentID: string | null = null;
  @state() attachmentPreview: string | null = null;
  @state() replies: Post[] = [];
  @state() replyID: string | null = null;
  @state() primary_color: string = '#000000';
  @state() instanceInfo: Instance | null = null;

  @state() wellnessMode: boolean = false;
  @state() dataSaverMode: boolean = false;
  @state() sensitiveMode: boolean = false;

  @state() attaching: boolean = false;

  @state() summary: string = '';

  @state() openTweet: Post | null = null;

  @state() homeLoad: boolean = false;

  @state() hasNewNotifications: boolean = false;

  @state() trendingTags: TrendingTag[] = [];

  // Lazy loading states for tabs
  @state() bookmarksLoaded: boolean = false;
  @state() favoritesLoaded: boolean = false;
  @state() notificationsLoaded: boolean = false;
  @state() searchLoaded: boolean = false;
  @state() messagesLoaded: boolean = false;

  // Lazy loading states for drawer components
  @state() appThemeLoaded: boolean = false;
  @state() userTermsLoaded: boolean = false;
  @state() rightClickLoaded: boolean = false;

  @state() activeTab: string = 'general';

  @state() tabsOrientation: 'horizontal' | 'vertical' = 'vertical';
  @state() tabsPlacement: 'top' | 'bottom' | 'start' | 'end' = 'start';

  // DOM element references using @query for type safety
  @query('#settings-drawer') private settingsDrawer!: OtterDrawer;
  @query('#replies-drawer') private repliesDrawer!: OtterDrawer;
  @query('#theming-drawer') private themingDrawer!: OtterDrawer;
  @query('#bot-drawer') private botDrawer!: OtterDrawer;
  @query('#translation-toast') private translationToast!: MdToast;
  @query('#error-toast') private errorToast!: MdToast;
  @query('#summary-dialog') private summaryDialog!: MdDialog;
  @query('#open-tweet-sheet') private openTweetSheet!: OtterDrawer;
  @query('.homeTimeline') private homeTimeline!: Timeline;
  @query('post-dialog') private postDialog!: PostDialog;

  static get styles() {
    return [
      styles,
      css`
        #welcomeBar {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }

        app-timeline,
        app-bookmarks,
        app-notifications,
        app-favorites,
        app-bookmarks,
        search-page {
          margin-left: 0;
          margin-right: 0;
          width: 100%;
          max-width: 600px;
        }

        md-tabs {
          height: calc(100vh - 54px);
          grid-column: 1 / 3;
          gap: 32px;
          margin-top: -54px;
          padding-top: 54px;
        }

        md-tab-panel::part(panel-content) {
          display: flex;
          justify-content: center;
        }

        md-tab {
          width: 80px;
          flex: none;
        }

        .new-post-container {
          padding: 16px 12px;
          width: 80px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .new-post-btn md-icon {
          width: 24px;
          height: 24px;
        }

        md-tab-panel {
          overflow: visible;
        }

        md-tab md-icon {
          width: 1.8em;
          height: 1.8em;
        }

        app-timeline.homeTimeline {
          width: 100%;
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background-color: var(--md-sys-color-primary);
          border-radius: 50%;
          z-index: 10;
        }

        /* Dark mode support for tabs */
        @media (prefers-color-scheme: dark) {
          /* md-tabs {
            --md-sys-color-surface: #0f1118;
            --md-sys-color-outline-variant: #2a2d36;
          } */

          md-tab {
            --md-sys-color-on-surface-variant: #c4c6cf;
          }

          .tab-label {
            color: #c4c6cf;
          }
        }

        md-menu-item {
          --neutral-fill-stealth-hover: #141314;
        }

        #open-tweet-sheet {
          --drawer-height: 92vh;
          --drawer-width: 720px;
        }

        #open-tweet-sheet::part(body) {
          padding: 0;
          overflow: hidden;
        }

        /* Post bottom-sheet should not show a header bar */
        #open-tweet-sheet::part(header) {
          display: none;
        }

        /* Post bottom-sheet doesn't use drawer footer */
        #open-tweet-sheet::part(footer) {
          display: none;
        }

        mammoth-bot {
          position: fixed;
          bottom: 12px;
          right: 12px;
        }

        #bot-drawer mammoth-bot {
          display: flex;
          position: unset;
        }

        md-menu {
          background: #ffffff14;
          backdrop-filter: blur(48px);
          color: white;
          z-index: 99;
        }

        md-menu-item {
          color: white;
        }

        @media (prefers-color-scheme: light) {
          md-menu-item {
            color: black;
          }

          md-menu {
            background: rgb(235 235 235);
            backdrop-filter: none;
          }
        }

        #settings-profile-inner {
          background: rgba(128, 128, 128, 0.14);
          border-radius: 6px;
          padding: 10px;
          margin-top: 12px;

          display: flex;
          flex-direction: column;
          align-items: center;
        }

        #settings-profile-inner img {
          width: 4em;
          border-radius: 50%;
        }

        #settings-profile-inner md-skeleton {
          display: block;
        }

        #settings-profile-inner h3 {
          margin-top: 0;
          margin-bottom: 0;
        }

        #no-replies {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #reply-drawer md-skeleton {
          height: 8em;
          width: 8em;
        }

        .img-preview {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 8em;
          margin-top: 10px;
          background: #00000040;
          padding: 6px;
          gap: 6px;

          border-radius: 6px;
        }

        .img-preview img {
          width: 8em;
          min-height: 6em;
          border-radius: 6px;

          margin-top: 6px;
        }

        #context-menu {
          z-index: 10000;
          width: 150px;
          background: #1b1a1a;
          border-radius: 5px;
          position: fixed;
          transform: scale(0.9);
          opacity: 0;
          transform-origin: top left;
          transition: transform, opacity;
          transition-duration: 0.12s;
          pointer-events: none;
        }

        right-click sl-menu-item::part(checked-icon) {
          width: 8px;
        }

        #context-menu sl-menu-item::part(checked-icon) {
          width: 8px;
        }

        #context-menu.visible {
          display: block;
          transform: scale(1);
          opacity: 1;
          pointer-events: auto;
        }

        .setting div {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .setting p {
          margin-top: 4px;
        }

        @media (prefers-color-scheme: light) {
          md-menu-item {
            --neutral-fill-stealth-hover: white;
          }
        }

        md-badge {
          cursor: pointer;
        }

        #reply-drawer {
          --size: 100vh;
        }

        #reply-drawer::part(footer) {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #instanceInfo {
          border-radius: 6px;
          background: #0000001a;
          padding-left: 12px;
          padding-top: 1px;
          padding-right: 12px;
          margin-top: 2em;
        }

        #instanceInfo img {
          width: 160px;
        }

        md-toolbar {
          width: 100%;
          margin-top: 0;
          padding-top: 8px;
          background: transparent;
          margin-bottom: 6px;
          top: 0;
          padding-right: 10px;
          position: sticky;
          z-index: 10;
        }

        @media (prefers-color-scheme: dark) {
          md-toolbar {
            background: transparent;
          }
        }

        main {
          padding-top: 54px;
          display: grid;
          grid-template-columns: 80px 1fr 320px;
          gap: 32px;
          margin: 0 auto;
        }

        #right-sidebar {
          position: sticky;
          top: 20px;
          height: calc(100vh - 40px);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-right: 16px;
        }

        .sidebar-card {
          background: transparent;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 16px;
          padding: 16px;

          animation: fadeIn 0.3s ease-in-out;

          background: var(--md-sys-color-surface-container, #1e1e24);
          border: none;
        }

        .sidebar-card h3 {
          margin-top: 0;
          margin-bottom: 12px;
          font-size: 1.1rem;
        }

        .trending-item {
          display: flex;
          flex-direction: column;
          padding: 8px 0;
          cursor: pointer;
        }

        .trending-item .tag {
          font-weight: bold;
          font-size: 1rem;
        }

        .trending-item .count {
          font-size: 0.85rem;
          color: var(--md-sys-color-on-surface-variant);
        }

        main.focus {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 10vw;
          padding-right: 10vw;
        }

        #settings-drawer label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }

        #profile-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;

          width: 100%;
        }

        #profile-card-content img,
        #profile-card-content md-skeleton#profile-avatar {
          height: 80px;
          width: 80px;
          border-radius: 50%;
          border: 2px solid var(--md-sys-color-primary);
        }

        #profile-card-content h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        #profile-card-content p {
          margin: 0;
          color: var(--md-sys-color-on-surface-variant);
          font-size: 0.9rem;
        }

        .profile-stats {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          justify-content: center;
          width: -webkit-fill-available;
        }

        .profile-stats md-badge {
          cursor: pointer;
          width: -webkit-fill-available;
        }

        #username-block {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: -webkit-fill-available;
        }

        sl-radio {
          padding: 8px;
          margin-top: 4px;
          background: #00000024;
          border-radius: 4px;
        }

        sl-radio::part(control) {
          --toggle-size: 20px;
          height: 20px;
        }

        #replies-drawer ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        #replies-drawer #reply-post-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 11px;
        }

        #replies-drawer #reply-post-actions sl-input {
          flex: 2;
        }

        #profile-card-actions {
          margin-top: 22px;

          position: fixed;
          bottom: 24px;
          width: 20%;
        }

        #profile-card-actions md-button {
          width: 80%;
        }

        #profile img,
        #profile-avatar {
          height: var(--md-sys-size-avatar-large, 88px);
          width: var(--md-sys-size-avatar-large, 88px);
          border-radius: 50%;

          border: solid var(--sl-color-primary-600)
            var(--md-sys-size-avatar-border-width, 4px);
        }

        #profile md-skeleton {
          display: block;
        }

        #profile md-skeleton#profile-avatar {
          height: var(--md-sys-size-avatar-large, 88px);
          width: var(--md-sys-size-avatar-large, 88px);
          border-radius: 50%;

          border: solid var(--sl-color-primary-600)
            var(--md-sys-size-avatar-border-width, 4px);
        }

        #profile-top {
          margin-bottom: 2em;
        }

        #profile-top h3 {
          margin-bottom: 0;
          margin-top: 0;
        }

        #profile-top p {
          color: grey;
          font-size: var(--md-sys-typescale-body-medium-font-size);
        }

        md-dialog img {
          height: 160px;
          margin-top: 16px;
          background: #0e0e0e45;
          padding: 5px;
          border-radius: 6px;
        }

        #user-url {
          margin-top: 4px;
          font-size: var(--md-sys-typescale-body-small-font-size);
        }

        #welcomeCard,
        #infoCard {
          padding: 18px;
          padding-top: 0px;
        }

        sl-color-picker::part(base) {
          right: 91px;
          position: fixed;
        }

        otter-drawer::part(base) {
          z-index: 99999;
        }

        otter-drawer::part(body) {
          overflow-x: hidden;

          backdrop-filter: blur(40px);

          content-visibility: auto;
          contain: strict;
        }

        sl-card::part(footer) {
          display: flex;
          justify-content: flex-end;
        }

        sl-tab-panel {
          content-visibility: auto;
          contain: content;
        }

        #mobile-actions {
          position: fixed;
          bottom: 90px;
          right: 16px;
          display: none;
        }

        @media (min-width: 821px) and (max-width: 1030px) {
          #profile-card-actions md-button {
            width: 100%;
          }

          main {
            grid-template-columns: 1fr;
          }

          md-tabs {
            grid-column: 1;
          }

          #mobile-actions {
            display: none;
          }
        }

        @media (max-width: 820px) {
          #profile,
          #left-sidebar,
          #right-sidebar {
            display: none;
          }

          md-tab-panel {
            max-width: unset;
          }

          md-tab {
            flex: 1;
            width: auto;
          }

          /* .tab-label {
            display: none;
          } */

          .new-post-container {
            display: none;
          }

          app-timeline,
          app-bookmarks,
          app-notifications,
          app-favorites,
          app-bookmarks,
          search-page {
            margin-left: initial;
            margin-right: initial;
            width: 100%;
          }

          #open-tweet-sheet {
            --drawer-height: 92vh;
            --drawer-width: 100vw;
          }

          mammoth-bot {
            display: none;
          }

          md-toolbar {
            display: none;
          }

          #mobile-actions {
            display: flex;
          }

          #mobile-actions md-button md-icon {
            height: 24px;
            width: 24px;
          }

          main {
            display: block;
            padding-top: 0;
            margin-top: initial;
            margin-left: 0;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
          }

          md-tabs {
            position: static;
            height: 100%;
            width: 100%;
            gap: 0;
          }

          md-tab-panel {
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding-top: 50px;
            scrollbar-color: var(--md-sys-scrollbar-thumb-color)
              var(--md-sys-color-background);
          }

          md-tab-panel::-webkit-scrollbar-track {
            background: var(--md-sys-color-background);
          }
        }

        #focusModeButton {
          position: fixed;
          bottom: 18px;
          left: 12px;
        }

        @media (horizontal-viewport-segments: 2) {
          #welcomeBar {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
          }

          #welcomeCard {
            margin-right: 64px;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `,
    ];
  }

  async firstUpdated() {
    // Use the current URL params, but fall back to the initial launch URL if
    // something in boot dropped our query string (e.g. PWA manifest shortcut
    // /home?tab=notifications getting normalized to /home).
    const urlParams = new URLSearchParams(window.location.search);
    const effectiveParams = new URLSearchParams(urlParams);

    try {
      const launchUrl = sessionStorage.getItem('coho:launchUrl');
      if (launchUrl) {
        const launch = new URL(launchUrl, window.location.origin);

        // Only “fill in” missing intent params from the launch URL.
        for (const key of ['tab', 'newPost', 'name'] as const) {
          if (!effectiveParams.has(key) && launch.searchParams.has(key)) {
            const value = launch.searchParams.get(key);
            if (value != null) effectiveParams.set(key, value);
          }
        }

        // We’re now on /home; don’t let launch intent leak into later navigations.
        sessionStorage.removeItem('coho:launchUrl');
      }
    } catch {
      // sessionStorage may be unavailable in some privacy contexts; ignore.
    }

    // Initialize tabs state based on screen size
    if (window.matchMedia('(max-width: 820px)').matches) {
      this.tabsOrientation = 'horizontal';
      this.tabsPlacement = 'bottom';
    } else {
      this.tabsOrientation = 'vertical';
      this.tabsPlacement = 'start';
    }

    // Set up global toast listener for error notifications
    this.setupGlobalToastListener();

    setTimeout(async () => {
      if (effectiveParams.has('name')) {
        const name = effectiveParams.get('name');

        if (name) {
          await this.shareTarget(name);
        }
      }
    }, 1000);

    window.requestIdleCallback(async () => {
      const { init } = await import('../utils/key-shortcuts');
      init();
    });

    const { resetLastPageID, getTrendingTags } =
      await import('../services/timeline');
    await resetLastPageID();

    try {
      this.trendingTags = await getTrendingTags();
    } catch (err) {
      console.error('Error fetching trending tags', err);
    }

    window.requestIdleCallback(
      async () => {
        const { getSettings } = await import('../services/settings');
        const settings = await getSettings();

        if (settings) {
          this.handleWellnessMode(settings.wellness || false);

          this.handleDataSaverMode(settings.data_saver || false);
        }

        this.hasNewNotifications = await checkNewNotifications();
      },
      { timeout: 3000 }
    );

    window.matchMedia('(max-width: 820px)').addEventListener('change', (e) => {
      if (e.matches) {
        this.tabsOrientation = 'horizontal';
        this.tabsPlacement = 'bottom';
      } else {
        this.tabsOrientation = 'vertical';
        this.tabsPlacement = 'start';
      }
    });

    const tabData = effectiveParams.get('tab');
    console.log('tabData', tabData);

    // Restore tab from sessionStorage if no URL param override
    let tabToOpen = tabData;
    if (!tabToOpen) {
      try {
        tabToOpen = sessionStorage.getItem('coho:activeTab');
      } catch {
        // sessionStorage may be unavailable in some privacy contexts; ignore.
      }
    }

    if (tabToOpen) {
      // Preload the component for the requested tab
      switch (tabToOpen) {
        case 'bookmarks':
          await this.loadBookmarks();
          break;
        case 'faves':
          await this.loadFavorites();
          break;
        case 'notifications':
          await this.loadNotifications();
          break;
        case 'search':
          await this.loadSearch();
          break;
        case 'messages':
          await this.loadMessages();
          break;
      }

      // Wait for the component to be ready before switching tabs
      await this.updateComplete;
      this.openATab(tabToOpen);
    }

    window.requestIdleCallback(async () => {
      if (this.shadowRoot) {
        const { enableVibrate } = await import('../utils/handle-vibrate');
        enableVibrate(this.shadowRoot);
      }
    });

    // Load right-click component immediately
    this.loadRightClick();

    window.requestIdleCallback(() => {
      if (this.shadowRoot) {
        const newPost = effectiveParams.get('newPost');

        if (newPost) {
          this.openNewDialog();
        }
      }
    });

    // setTimeout(async () => {
    const { getCurrentUser } = await import('../services/account');
    getCurrentUser().then((user) => {
      this.user = user ?? null;
    });
    // }, 1200);
  }

  /**
   * Set up listener for global toast events from optimistic updates
   */
  private setupGlobalToastListener() {
    window.addEventListener('app-toast', ((
      event: CustomEvent<{ message: string; variant: string }>
    ) => {
      if (this.errorToast && event.detail) {
        this.errorToast.message = event.detail.message;
        this.errorToast.variant = event.detail.variant as
          | 'error'
          | 'warning'
          | 'info'
          | 'success';
        this.errorToast.show();
      }
    }) as EventListener);
  }

  async shareTarget(name: string) {
    // Decode the URL-encoded filename from the query param
    const decodedName = decodeURIComponent(name);
    const cache = await caches.open('shareTarget');

    // Build the expected cache key (must match SW's format)
    const expectedKey = `/_share/${encodeURIComponent(decodedName)}`;

    console.log('[Share Target] Looking for cache key:', expectedKey);
    console.log(
      '[Share Target] Available cache keys:',
      (await cache.keys()).map((r) => r.url)
    );

    const response = await cache.match(expectedKey);

    if (response) {
      console.log('[Share Target] Found cached file, opening dialog');
      await this.openNewDialog();
    } else {
      console.log('[Share Target] No cached file found');
    }
  }

  handlePrimaryColor(color: string) {
    this.primary_color = color;

    // set css variable color
    document.documentElement.style.setProperty('--sl-color-primary-600', color);

    localStorage.setItem('primary_color', color);
  }

  share() {
    if (navigator.share) {
      navigator.share({
        title: 'PWABuilder pwa-starter',
        text: 'Check out the PWABuilder pwa-starter!',
        url: 'https://github.com/pwa-builder/pwa-starter',
      });
    }
  }

  async openNewDialog() {
    // if on desktop, open the dialog
    // if (window.innerWidth > 600) {
    await import('../components/post-dialog');

    // Wait for the custom element to be defined and upgraded
    await customElements.whenDefined('post-dialog');

    // Wait for Lit to update the DOM with the upgraded element
    await this.updateComplete;

    // Wait for the post-dialog's own shadow DOM to render
    if (this.postDialog) {
      await this.postDialog.updateComplete;
      this.postDialog.openNewDialog();
    }
    // }
    // else {
    //   const drawer = this.shadowRoot?.getElementById('reply-drawer') as any;
    //   drawer.show();
    // }
  }

  async publish() {
    // const status = (this.shadowRoot?.querySelector('sl-textarea') as any).value;
    // console.log(status);
    // if (this.attachmentID) {
    //   const { publishPost } = await import("../services/posts");
    //   await publishPost(status, this.attachmentIDs);
    // }
    // else {
    //   const { publishPost } = await import("../services/posts");
    //   await publishPost(status);
    // }
    // const dialog = this.shadowRoot?.getElementById('notify-dialog') as any;
    // dialog.hide();
  }

  async goToFollowers() {
    if (!this.user) return;
    router.navigate(`/followers?id=${this.user.id}`);
  }

  async goToFollowing() {
    if (!this.user) return;
    router.navigate(`/following?id=${this.user.id}`);
  }

  async openSettingsDrawer() {
    await this.loadUserTerms();
    await this.settingsDrawer?.show();

    const { getInstanceInfo } = await import('../services/account');

    this.instanceInfo = await getInstanceInfo();
    console.log('instanceInfo', this.instanceInfo);
  }

  async handleReplies(replies: Post[], id: string) {
    this.replies = replies;

    this.replyID = id;

    await this.repliesDrawer?.show();
  }

  async replyToAStatus() {
    const replyInput = this.shadowRoot?.querySelector(
      '#reply-post-actions sl-input'
    ) as HTMLInputElement | null;
    const replyValue = replyInput?.value;

    if (this.replyID && replyValue) {
      const { reply } = await import('../services/timeline');
      await reply(this.replyID, replyValue);
    }
  }

  async openThemingDrawer() {
    await this.loadAppTheme();
    await this.themingDrawer?.show();
  }

  doFocusMode() {
    const main = this.shadowRoot?.querySelector('main');
    if (!main) return;

    main.classList.toggle('focus');

    const profile = this.shadowRoot?.querySelector(
      '#profile'
    ) as HTMLElement | null;
    if (profile) {
      profile.style.display =
        profile.style.display === 'none' ? 'flex' : 'none';
    }

    const appTimeline = this.shadowRoot?.querySelector(
      'app-timeline'
    ) as HTMLElement | null;
    if (appTimeline) {
      appTimeline.style.position =
        appTimeline.style.position === 'fixed' ? 'relative' : 'fixed';
      appTimeline.style.left = appTimeline.style.left === '11vw' ? '0' : '11vw';
      appTimeline.style.right =
        appTimeline.style.right === '11vw' ? '0' : '11vw';
    }
  }

  async handleWellnessMode(check: boolean) {
    console.log('check', check);
    this.wellnessMode = check;

    const { setSettings } = await import('../services/settings');
    setSettings({ wellness: check });
  }

  async handleSensitiveContent(check: boolean) {
    console.log('check', check);
    this.sensitiveMode = check;

    const { setSettings } = await import('../services/settings');
    setSettings({ sensitive: check });
  }

  async handleDataSaverMode(mode: boolean) {
    console.log('mode', mode);
    this.dataSaverMode = mode;

    const { setSettings } = await import('../services/settings');
    setSettings({ data_saver: mode });
  }

  removeImage() {
    this.attachmentID = null;
    this.attachmentPreview = null;
  }

  openATab(name: string) {
    console.log('tab name', name);
    this.activeTab = name;

    // Persist active tab to sessionStorage for navigation restoration
    try {
      sessionStorage.setItem('coho:activeTab', name);
    } catch {
      // sessionStorage may be unavailable in some privacy contexts; ignore.
    }
  }

  async shareMyProfile() {
    if (!this.user) return;
    // share my profile
    if (navigator.share) {
      await navigator.share({
        title: 'My Mastodon Profile',
        text: 'Check out my Mastodon profile!',
        url: this.user.url,
      });
    } else {
      // fall back to the clipboard api
      await navigator.clipboard.writeText(this.user.url);
    }
  }

  viewMyProfile() {
    if (!this.user) return;
    router.navigate(`/account?id=${this.user.id}`);
  }

  editMyProfile() {
    router.navigate(`/editaccount`);
  }

  async handleReload() {
    const { clearTimelineCache } = await import('../services/timeline-cache');
    // Clear cache to ensure fresh timeline after posting
    clearTimelineCache();

    this.homeTimeline?.refreshTimeline(true); // Pass true to skip saving stale cache
  }

  openBotDrawer() {
    this.botDrawer?.show();
  }

  showSummary($event: HandleSummaryEvent) {
    console.log('show summary', $event.detail.data);
    const summary = $event.detail.data;
    this.summary = summary;

    // Hide translation toast if it's open
    if (this.translationToast?.open) {
      this.translationToast.hide();
    }

    this.summaryDialog?.show();
  }

  onMoveHandler(
    ev: { deltaX: number },
    dialog: HTMLElement & { hide(): void }
  ) {
    console.log('ev', ev);

    dialog.style.transform = `translateX(${ev.deltaX}px)`;

    if (ev.deltaX > 100) {
      dialog.hide();
    }
  }

  async handleOpenTweet(tweet: Post) {
    const isMobile = window.matchMedia('(max-width: 820px)').matches;

    // Desktop: prefer full-page navigation (better UX + supports back/forward/history)
    if (!isMobile) {
      router.navigate(
        `/home/post?${encodeURIComponent(JSON.stringify(tweet))}`
      );
      return;
    }

    await import('../pages/post-detail');

    this.openTweet = null;

    this.requestUpdate();

    await this.updateComplete;

    this.openTweet = tweet;

    await this.openTweetSheet?.show();
  }

  private handleOpenTweetSheetHide() {
    // Unmount post detail when the sheet is dismissed
    this.openTweet = null;
  }

  async disconnectedCallback() {
    console.log('home disconnected');
    const lastPageID = sessionStorage.getItem('latest-read');
    console.log('lastPageID', lastPageID);
    if (lastPageID) {
      const { savePlace } = await import('../services/timeline');
      await savePlace(lastPageID);
    }
  }

  reloadHome() {
    this.homeTimeline?.refreshTimeline();
  }

  // Lazy loading methods for tab components
  async loadBookmarks() {
    if (!this.bookmarksLoaded) {
      await import('../components/bookmarks');
      this.bookmarksLoaded = true;
    }
  }

  async loadFavorites() {
    if (!this.favoritesLoaded) {
      await import('../components/favorites');
      this.favoritesLoaded = true;
    }
  }

  async loadNotifications() {
    if (!this.notificationsLoaded) {
      await import('../components/notifications');
      this.notificationsLoaded = true;
    }
  }

  async loadSearch() {
    if (!this.searchLoaded) {
      await import('./search-page');
      this.searchLoaded = true;
    }
  }

  async loadMessages() {
    if (!this.messagesLoaded) {
      await import('./app-messages');
      this.messagesLoaded = true;
    }
  }

  // Lazy loading methods for drawer components
  async loadAppTheme() {
    if (!this.appThemeLoaded) {
      await import('../components/app-theme');
      this.appThemeLoaded = true;
    }
  }

  async loadUserTerms() {
    if (!this.userTermsLoaded) {
      await import('../components/user-terms');
      this.userTermsLoaded = true;
    }
  }

  async loadRightClick() {
    if (!this.rightClickLoaded) {
      await import('../components/right-click');
      this.rightClickLoaded = true;
    }
  }

  async handleTabChange(event: TabChangeEvent) {
    const panel = event.detail.panel;
    this.activeTab = panel;

    // Persist active tab to sessionStorage for navigation restoration
    try {
      sessionStorage.setItem('coho:activeTab', panel);
    } catch {
      // sessionStorage may be unavailable in some privacy contexts; ignore.
    }

    // Lazy load components based on which tab is shown
    switch (panel) {
      case 'bookmarks':
        await this.loadBookmarks();
        break;
      case 'faves':
        await this.loadFavorites();
        break;
      case 'notifications':
        await this.loadNotifications();
        this.hasNewNotifications = false;
        await markNotificationsRead();
        if (navigator.clearAppBadge) {
          navigator.clearAppBadge();
        }
        break;
      case 'search':
        await this.loadSearch();
        break;
      case 'messages':
        await this.loadMessages();
        break;
    }
  }

  async handleTranslating(_event: HandleTranslatingEvent) {
    console.log('handle translating event received');
    // Show translation toast
    console.log(
      'Toast element:',
      this.translationToast,
      'Open:',
      this.translationToast?.open
    );
    if (this.translationToast) {
      this.translationToast.show();
      console.log('After show(), Open:', this.translationToast.open);
    } else {
      console.error('Toast element not found!');
    }
  }

  render() {
    return html`
      ${this.rightClickLoaded
        ? html`
            <right-click>
              <md-menu>
                <md-menu-item
                  @menu-item-click=${() => router.navigate('/new-post')}
                >
                  <md-icon slot="prefix" name="add"></md-icon>
                  New Post
                </md-menu-item>

                <md-menu-item @click="${() => this.openATab('search')}">
                  <md-icon slot="prefix" name="search"></md-icon>
                  Explore
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('notifications')}">
                  <md-icon slot="prefix" name="notifications"></md-icon>
                  Notifications
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('messages')}">
                  <md-icon slot="prefix" name="chatbox"></md-icon>
                  Messages
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('bookmarks')}">
                  <md-icon slot="prefix" name="bookmark"></md-icon>
                  Saved
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('faves')}">
                  <md-icon slot="prefix" name="heart"></md-icon>
                  Favorites
                </md-menu-item>
              </md-menu>
            </right-click>
          `
        : null}

      <app-header
        @open-bot-drawer="${() => this.openBotDrawer()}"
        @open-settings="${() => this.openSettingsDrawer()}"
        @open-theming="${() => this.openThemingDrawer()}"
      >
      </app-header>

      <!-- Offline status notifications -->
      <offline-notify></offline-notify>

      <otter-drawer label="Theming" id="theming-drawer">
        ${this.appThemeLoaded
          ? html`
              <app-theme
                @color-chosen="${($event: ColorChosenEvent) =>
                  this.handlePrimaryColor($event.detail.color)}"
              ></app-theme>
            `
          : nothing}
      </otter-drawer>

      <md-dialog id="summary-dialog" label=""> ${this.summary} </md-dialog>

      <otter-drawer
        id="open-tweet-sheet"
        placement="bottom"
        label="Post"
        @otter-hide="${() => this.handleOpenTweetSheetHide()}"
      >
        ${this.openTweet
          ? html`<post-detail .passed_tweet="${this.openTweet}"></post-detail>`
          : null}
      </otter-drawer>

      <post-dialog @published="${() => this.handleReload()}"></post-dialog>

      <otter-drawer id="settings-drawer" placement="end" label="Settings">
        <div>
          <div id="settings-profile-inner">
            ${this.user && this.user.avatar
              ? html`<img src="${this.user.avatar}" />`
              : html`<md-skeleton
                  id="profile-avatar"
                  shape="circle"
                  width="4em"
                  height="4em"
                ></md-skeleton>`}
            <div id="username-block">
              <h3>${this.user ? this.user.display_name : 'Loading...'}</h3>

              <div id="user-actions">
                <md-dropdown>
                  <md-icon-button
                    slot="trigger"
                    src="/assets/settings-outline.svg"
                  ></md-icon-button>
                  <md-menu>
                    <md-menu-item @click="${() => this.viewMyProfile()}">
                      <md-icon
                        slot="prefix"
                        src="/assets/eye-outline.svg"
                      ></md-icon>
                      View My Profile
                    </md-menu-item>
                    <md-menu-item @click="${() => this.shareMyProfile()}">
                      <md-icon
                        slot="prefix"
                        src="/assets/share-social-outline.svg"
                      ></md-icon>
                      Share My Profile
                    </md-menu-item>
                    <md-menu-item @click="${() => this.editMyProfile()}">
                      Edit My Profile
                    </md-menu-item>
                    <!-- <md-menu-item>
                      Add an existing Account
                    </md-menu-item> -->
                  </md-menu>
                </md-dropdown>
              </div>
            </div>

            <p id="user-url">${this.user ? this.user.url : 'Loading...'}</p>

            <div>
              <md-badge
                variant="filled"
                clickable
                @click="${() => this.goToFollowers()}"
                >${this.user ? this.user.followers_count : '0'} followers
              </md-badge>
              <md-badge
                variant="filled"
                clickable
                @click="${() => this.goToFollowing()}"
                >${this.user ? this.user.following_count : '0'} following
              </md-badge>
            </div>
          </div>
        </div>

        <div class="setting">
          ${this.userTermsLoaded ? html`<user-terms></user-terms>` : nothing}
        </div>

        <div class="setting">
          <div>
            <h4>Wellness Mode</h4>

            <md-switch
              @sl-change="${(e: Event) =>
                this.handleWellnessMode(
                  (e.target as HTMLInputElement).checked
                )}"
              ?checked="${this.wellnessMode}"
            ></md-switch>
          </div>

          <p>Wellness Mode hides likes and boosts.</p>
        </div>

        <div class="setting">
          <div>
            <h4>Data Saver Mode</h4>

            <md-switch
              @sl-change="${(e: Event) =>
                this.handleDataSaverMode(
                  (e.target as HTMLInputElement).checked
                )}"
              ?checked="${this.dataSaverMode}"
            ></md-switch>
          </div>

          <p>Data Saver Mode reduces the amount of data used by Coho.</p>
        </div>

        <div class="setting">
          <h4>Key Shortcuts</h4>

          <ul>
            <li><kbd>g</kbd> + <kbd>h</kbd> - Open Home</li>

            <li><kbd>g</kbd> + <kbd>n</kbd> - Open Notifications</li>

            <li><kbd>g</kbd> + <kbd>s</kbd> - Open Search</li>

            <li><kbd>g</kbd> + <kbd>b</kbd> - Open Bookmarks</li>

            <li><kbd>g</kbd> + <kbd>f</kbd> - Open Favorites</li>
          </ul>
        </div>

        ${this.instanceInfo
          ? html`
              <div id="instanceInfo">
                <h4>Instance Info</h4>

                ${this.instanceInfo.thumbnail
                  ? html`<img src="${this.instanceInfo.thumbnail}" />`
                  : nothing}
                <p>${this.instanceInfo.title}</p>

                <div .innerHTML="${this.instanceInfo.description}"></div>
              </div>
            `
          : null}

        <div
          style="margin-top: 24px; padding-bottom: 24px; text-align: center; opacity: 0.7; font-size: 12px;"
        >
          <p>Build: ${new Date(__APP_VERSION__).toLocaleString()}</p>
        </div>
      </otter-drawer>

      <otter-drawer id="replies-drawer" placement="end" label="Comments">
        ${this.replies.length > 0
          ? html`<ul>
              ${this.replies.map((reply) => {
                return html`
                  <timeline-item
                    ?show="${false}"
                    .tweet="${reply}"
                  ></timeline-item>
                `;
              })}
            </ul>`
          : html`
              <div id="no-replies">
                <p>No comments yet.</p>
              </div>
            `}
      </otter-drawer>

      <main>
        <md-tabs
          @tab-change="${(e: CustomEvent) => this.handleTabChange(e)}"
          .active="${this.activeTab}"
          orientation="${this.tabsOrientation}"
          placement="${this.tabsPlacement}"
        >
          <md-tab
            slot="nav"
            panel="general"
            @click="${() => this.reloadHome()}"
          >
            <md-icon slot="icon" src="/assets/home-outline.svg"></md-icon>
            <span class="tab-label">Home</span>
          </md-tab>
          <md-tab slot="nav" panel="search">
            <md-icon slot="icon" src="/assets/search-outline.svg"></md-icon>
            <span class="tab-label">Explore</span>
          </md-tab>
          <md-tab slot="nav" panel="notifications">
            <md-icon
              slot="icon"
              src="/assets/notifications-outline.svg"
            ></md-icon>
            <span class="tab-label">Notifications</span>
            ${this.hasNewNotifications
              ? html`<span class="notification-dot"></span>`
              : nothing}
          </md-tab>
          <md-tab slot="nav" panel="bookmarks">
            <md-icon slot="icon" src="/assets/bookmark-outline.svg"></md-icon>
            <span class="tab-label">Saved</span>
          </md-tab>
          <md-tab slot="nav" panel="faves">
            <md-icon slot="icon" src="/assets/heart-outline.svg"></md-icon>
            <span class="tab-label">Favorites</span>
          </md-tab>

          <div slot="nav" class="new-post-container">
            <md-button
              variant="fab"
              class="new-post-btn"
              @click="${() => this.openNewDialog()}"
              title="New Post"
            >
              <md-icon src="/assets/add-outline.svg"></md-icon>
            </md-button>
          </div>

          <md-tab slot="nav" panel="media" style="display: none;"></md-tab>
          <md-tab slot="nav" panel="messages" style="display: none;"></md-tab>
          <md-tab slot="nav" panel="custom" style="display: none;"></md-tab>

          <md-tab-panel name="general">
            <app-timeline
              @open="${($event: CustomEvent) =>
                this.handleOpenTweet($event.detail.tweet)}"
              @handle-summary="${($event: HandleSummaryEvent) =>
                this.showSummary($event)}"
              @handle-translating="${($event: HandleTranslatingEvent) =>
                this.handleTranslating($event)}"
              class="homeTimeline"
              timelineType="home"
              @replies="${($event: RepliesEvent) =>
                this.handleReplies($event.detail.data, $event.detail.id ?? '')}"
            ></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="media">
            <app-timeline timelineType="media"></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="messages">
            ${this.messagesLoaded
              ? html`<app-messages></app-messages>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="custom">
            <app-timeline timelineType="public"></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="bookmarks">
            ${this.bookmarksLoaded
              ? html`<app-bookmarks></app-bookmarks>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="faves">
            ${this.favoritesLoaded
              ? html`<app-favorites></app-favorites>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="notifications">
            ${this.notificationsLoaded
              ? html`<app-notifications
                  @open="${($event: CustomEvent) =>
                    this.handleOpenTweet($event.detail.tweet)}"
                ></app-notifications>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="search">
            ${this.searchLoaded ? html`<search-page></search-page>` : nothing}
          </md-tab-panel>
        </md-tabs>

        <div id="right-sidebar">
          <div class="sidebar-card">
            <div id="profile-card-content">
              ${this.user && this.user.avatar
                ? html`<img src="${this.user.avatar}" />`
                : html`<md-skeleton
                    id="profile-avatar"
                    shape="circle"
                    width="80px"
                    height="80px"
                  ></md-skeleton>`}

              <div id="username-block">
                <h3>
                  ${this.user
                    ? this.user.display_name
                    : html`<md-skeleton
                        width="100px"
                        height="25px"
                      ></md-skeleton>`}
                </h3>

                <div id="user-actions">
                  <md-dropdown>
                    <md-icon-button
                      slot="trigger"
                      src="/assets/settings-outline.svg"
                    ></md-icon-button>
                    <md-menu>
                      <md-menu-item @click="${() => this.viewMyProfile()}">
                        <md-icon
                          slot="prefix"
                          src="/assets/eye-outline.svg"
                        ></md-icon>
                        View My Profile
                      </md-menu-item>
                      <md-menu-item @click="${() => this.shareMyProfile()}">
                        <md-icon
                          slot="prefix"
                          src="/assets/share-social-outline.svg"
                        ></md-icon>
                        Share My Profile
                      </md-menu-item>
                      <md-menu-item @click="${() => this.editMyProfile()}">
                        Edit My Profile
                      </md-menu-item>
                    </md-menu>
                  </md-dropdown>
                </div>
              </div>

              <p id="user-url">
                ${this.user
                  ? this.user.url
                  : html`<md-skeleton
                      width="100px"
                      height="19px"
                    ></md-skeleton>`}
              </p>

              <div class="profile-stats">
                <md-badge
                  variant="outlined"
                  clickable
                  @click="${() => this.goToFollowers()}"
                  >${this.user ? this.user.followers_count : '0'} followers
                </md-badge>
                <md-badge
                  variant="outlined"
                  clickable
                  @click="${() => this.goToFollowing()}"
                  >${this.user ? this.user.following_count : '0'} following
                </md-badge>
              </div>
            </div>
          </div>

          ${this.trendingTags && this.trendingTags.length > 0
            ? html`
                <div class="sidebar-card">
                  <h3>Trending Tags</h3>
                  ${this.trendingTags.slice(0, 5).map(
                    (tag) => html`
                      <div
                        class="trending-item"
                        @click="${() =>
                          router.navigate(`/hashtag?tag=${tag.name}`)}"
                      >
                        <span class="tag">#${tag.name}</span>
                        <span class="count"
                          >${tag.history?.[0]?.uses || 0} posts today</span
                        >
                      </div>
                    `
                  )}
                </div>
              `
            : nothing}
        </div>

        <div id="mobile-actions">
          <md-button variant="fab" @click="${() => this.openNewDialog()}">
            <md-icon src="/assets/add-outline.svg"></md-icon>
          </md-button>
        </div>
      </main>

      <md-toast
        id="translation-toast"
        variant="info"
        position="bottom"
        duration="0"
        message="Translating post..."
      >
      </md-toast>

      <md-toast
        id="error-toast"
        variant="error"
        position="bottom"
        duration="4000"
        closable
        message=""
      >
      </md-toast>
    `;
  }
}
