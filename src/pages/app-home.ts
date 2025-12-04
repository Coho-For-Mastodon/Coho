import { LitElement, css, html, nothing } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

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

import { styles } from '../styles/shared-styles';
import { router } from '../utils/router';
// import { resetLastPageID } from '../services/timeline';
import { Post } from '../interfaces/Post';
import {
  checkNewNotifications,
  markNotificationsRead,
} from '../services/notifications';

@customElement('app-home')
export class AppHome extends LitElement {
  // For more information on using properties and state in lit
  // check out this link https://lit.dev/docs/components/properties/
  @property() message = 'Welcome!';

  @state() user: any | null = null;
  @state() attachmentID: string | null = null;
  @state() attachmentPreview: string | null = null;
  @state() replies: any[] = [];
  @state() replyID: string | null = null;
  @state() primary_color: string = '#000000';
  @state() instanceInfo: any | null = null;

  @state() wellnessMode: boolean = false;
  @state() dataSaverMode: boolean = false;
  @state() sensitiveMode: boolean = false;

  @state() attaching: boolean = false;

  @state() summary: string = '';

  @state() openTweet: Post | null = null;

  @state() homeLoad: boolean = false;

  @state() hasNewNotifications: boolean = false;

  @state() trendingTags: any[] = [];

  // Lazy loading states for tabs
  @state() bookmarksLoaded: boolean = false;
  @state() favoritesLoaded: boolean = false;
  @state() notificationsLoaded: boolean = false;
  @state() searchLoaded: boolean = false;

  // Lazy loading states for drawer components
  @state() appThemeLoaded: boolean = false;
  @state() userTermsLoaded: boolean = false;
  @state() rightClickLoaded: boolean = false;

  @state() activeTab: string = 'general';

  @state() tabsOrientation: 'horizontal' | 'vertical' = 'vertical';
  @state() tabsPlacement: 'top' | 'bottom' | 'start' | 'end' = 'start';

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
        }

        md-tabs {
          height: calc(100vh - 80px);
          grid-column: 1 / 3;
          gap: 48px;
        }

        md-tab {
          width: 220px;
        }

        .new-post-container {
          padding: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .new-post-btn {
          width: 100%;
        }

        md-tab-panel {
          overflow: visible;
        }

        md-tab md-icon {
          width: 1.8em;
          height: 1.8em;
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
          md-tabs {
            --md-sys-color-surface: #0f1118;
            --md-sys-color-outline-variant: #2a2d36;
          }

          md-tab {
            --md-sys-color-on-surface-variant: #c4c6cf;
          }

          .tab-label {
            color: #c4c6cf;
          }
        }

        md-menu-item {
          --neutral-fill-stealth-hover: #181818;
        }

        #open-tweet-dialog {
          --md-dialog-max-width: 60vw;
          --md-dialog-height: 92vh;
        }

        #open-tweet-dialog::part(dialog) {
          width: 55vw;
          max-width: 55vw;
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

        #reply-drawer sl-skeleton {
          height: 8em;
          width: 8em;
          --sl-border-radius-default: 4px;
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
          background: #1blala;
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
          grid-template-columns: 250px minmax(0, 1fr) 320px;
          gap: 48px;
          max-width: 1280px;
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
          bottom: 72px;
          right: 16px;
          display: none;
        }

        @media (min-width: 821px) and (max-width: 1030px) {
          #profile-card-actions md-button {
            width: 100%;
          }

          main {
            grid-template-columns: 1fr;
            max-width: 850px;
          }

          md-tabs {
            grid-column: 1;
          }

          #right-sidebar {
            display: none;
          }

          #mobile-actions {
            display: flex;
            bottom: 46px;
            right: 46px;
          }
        }

        @media (max-width: 820px) {
          #profile,
          #left-sidebar,
          #right-sidebar {
            display: none;
          }

          md-tab {
            flex: 1;
            width: auto;
          }

          .tab-label {
            display: none;
          }

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
          }

          #open-tweet-dialog::part(panel) {
            height: 100vh;
            max-height: 100vh;
            max-width: 100vw;
            width: 100vw;
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
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
          }

          md-tabs {
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

  constructor() {
    super();
  }

  async firstUpdated() {
    const urlParams = new URLSearchParams(window.location.search);

    // Initialize tabs state based on screen size
    if (window.matchMedia('(max-width: 820px)').matches) {
      this.tabsOrientation = 'horizontal';
      this.tabsPlacement = 'bottom';
    } else {
      this.tabsOrientation = 'vertical';
      this.tabsPlacement = 'start';
    }

    setTimeout(async () => {
      if (urlParams.has('name')) {
        const name = urlParams.get('name');

        if (name) {
          await this.shareTarget(name);
        }
      }
    }, 1000);

    window.requestIdleCallback(async () => {
      const { init } = await import('../utils/key-shortcuts');
      init();
    });

    const { resetLastPageID, getTrendingTags } = await import('../services/timeline');
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

    const tabData = urlParams.get('tab');
    console.log('tabData', tabData);

    if (tabData) {
      // Preload the component for the requested tab
      switch (tabData) {
        case 'bookmarks':
          this.loadBookmarks();
          break;
        case 'faves':
          this.loadFavorites();
          break;
        case 'notifications':
          this.loadNotifications();
          break;
        case 'search':
          this.loadSearch();
          break;
      }

      setTimeout(() => {
        this.openATab(tabData);
      }, 1000);
    }

    window.requestIdleCallback(async () => {
      if (this.shadowRoot) {
        const { enableVibrate } = await import('../utils/handle-vibrate');
        enableVibrate(this.shadowRoot);
      }
    });

    // Lazy load right-click component when idle
    window.requestIdleCallback(async () => {
      await this.loadRightClick();
    });

    window.requestIdleCallback(() => {
      if (this.shadowRoot) {
        const newPost = urlParams.get('newPost');

        if (newPost) {
          this.openNewDialog();
        }
      }
    });

    // setTimeout(async () => {
    const { getCurrentUser } = await import('../services/account');
    getCurrentUser().then((user) => {
      this.user = user;
    });
    // }, 1200);
  }

  async shareTarget(name: string) {
    const cache = await caches.open('shareTarget');
    const result = [];

    for (const request of await cache.keys()) {
      // If the request URL matches, add the response to the result
      if (
        (request.url.endsWith('.png') && request.url.includes(name)) ||
        (request.url.endsWith('.jpg') && request.url.includes(name))
      ) {
        result.push(await cache.match(name));
      }
    }

    console.log('share target result', result);

    if (result.length > 0) {
      await this.openNewDialog();
    }
  }

  handlePrimaryColor(color: string) {
    this.primary_color = color;

    // set css variable color
    document.documentElement.style.setProperty('--sl-color-primary-600', color);

    localStorage.setItem('primary_color', color);
  }

  share() {
    if ((navigator as any).share) {
      (navigator as any).share({
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
    // const dialog = this.shadowRoot?.getElementById('notify-dialog') as any;
    // dialog.show();
    const dialog: any = this.shadowRoot?.querySelector('post-dialog');
    dialog?.openNewDialog();
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
    router.navigate(`/followers?id=${this.user.id}`);
  }

  async goToFollowing() {
    router.navigate(`/following?id=${this.user.id}`);
  }

  async openSettingsDrawer() {
    await this.loadUserTerms();
    const drawer = this.shadowRoot?.getElementById('settings-drawer') as any;
    await drawer.show();

    const { getInstanceInfo } = await import('../services/account');

    this.instanceInfo = await getInstanceInfo();
    console.log('instanceInfo', this.instanceInfo);
  }

  async handleReplies(replies: any[], id: string) {
    this.replies = replies;

    this.replyID = id;

    const drawer = this.shadowRoot?.getElementById('replies-drawer') as any;
    await drawer.show();
  }

  async replyToAStatus() {
    const replyValue = (
      this.shadowRoot?.querySelector('#reply-post-actions sl-input') as any
    ).value;

    if (this.replyID && replyValue) {
      const { reply } = await import('../services/timeline');
      await reply(this.replyID, replyValue);
    }
  }

  async openThemingDrawer() {
    await this.loadAppTheme();
    const drawer = this.shadowRoot?.getElementById('theming-drawer') as any;
    await drawer.show();
  }

  doFocusMode() {
    const main = this.shadowRoot?.querySelector('main') as any;

    main.classList.toggle('focus');

    const profile = this.shadowRoot?.querySelector('#profile') as any;
    profile.style.display = profile.style.display === 'none' ? 'flex' : 'none';

    const appTimeline = this.shadowRoot?.querySelector('app-timeline') as any;
    appTimeline.style.position =
      appTimeline.style.position === 'fixed' ? 'relative' : 'fixed';
    appTimeline.style.left = appTimeline.style.left === '11vw' ? '0' : '11vw';
    appTimeline.style.right = appTimeline.style.right === '11vw' ? '0' : '11vw';
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
  }

  async shareMyProfile() {
    // share my profile
    if ((navigator as any).share) {
      await (navigator as any).share({
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
    router.navigate(`/account?id=${this.user.id}`);
  }

  editMyProfile() {
    router.navigate(`/editaccount`);
  }

  async handleReload() {
    const { clearTimelineCache } = await import('../services/timeline-cache');
    // Clear cache to ensure fresh timeline after posting
    clearTimelineCache();

    const timeline = this.shadowRoot?.querySelector('.homeTimeline') as any;
    timeline.refreshTimeline(true); // Pass true to skip saving stale cache
  }

  openBotDrawer() {
    const drawer = this.shadowRoot?.getElementById('bot-drawer') as any;
    drawer.show();
  }

  showSummary($event: any) {
    console.log('show summary', $event.detail.data);
    const summary = $event.detail.data;
    this.summary = summary;

    // Hide translation toast if it's open
    const toast = this.shadowRoot?.getElementById('translation-toast') as any;
    if (toast && toast.open) {
      toast.hide();
    }

    const dialog = this.shadowRoot?.getElementById('summary-dialog') as any;
    dialog.show();
  }

  onMoveHandler(ev: any, dialog: any) {
    console.log('ev', ev);

    dialog.style.transform = `translateX(${ev.deltaX}px)`;

    if (ev.deltaX > 100) {
      dialog.hide();
    }
  }

  async handleOpenTweet(tweet: Post) {
    await import('../pages/post-detail');

    this.openTweet = null;

    this.requestUpdate();

    await this.updated;

    this.openTweet = tweet;

    const dialog = this.shadowRoot?.getElementById('open-tweet-dialog') as any;
    await dialog.show();
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
    const homeTimeline = this.shadowRoot?.querySelector('.homeTimeline') as any;
    homeTimeline.refreshTimeline();
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

  async handleTabChange(event: CustomEvent) {
    const panel = event.detail.panel;
    this.activeTab = panel;

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
        if ('clearAppBadge' in navigator) {
          (navigator as any).clearAppBadge();
        }
        break;
      case 'search':
        await this.loadSearch();
        break;
    }
  }

  async handleTranslating(_event: any) {
    console.log('handle translating event received');
    // Show translation toast
    const toast = this.shadowRoot?.getElementById('translation-toast') as any;
    console.log('Toast element:', toast, 'Open:', toast?.open);
    if (toast) {
      toast.show();
      console.log('After show(), Open:', toast.open);
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
                  <md-icon
                    slot="prefix"
                    src="/assets/add-outline.svg"
                  ></md-icon>
                  New Post
                </md-menu-item>

                <md-menu-item @click="${() => this.openATab('search')}">
                  <md-icon
                    slot="prefix"
                    src="/assets/search-outline.svg"
                  ></md-icon>
                  Explore
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('notifications')}">
                  <md-icon
                    slot="prefix"
                    src="/assets/notifications-outline.svg"
                  ></md-icon>
                  Notifications
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('messages')}">
                  <md-icon
                    slot="prefix"
                    src="/assets/chatbox-outline.svg"
                  ></md-icon>
                  Messages
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('bookmarks')}">
                  <md-icon
                    slot="prefix"
                    src="/assets/bookmark-outline.svg"
                  ></md-icon>
                  Bookmarks
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('faves')}">
                  <md-icon
                    slot="prefix"
                    src="/assets/heart-outline.svg"
                  ></md-icon>
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

      <otter-drawer label="Theming" id="theming-drawer">
        ${this.appThemeLoaded
        ? html`
              <app-theme
                @color-chosen="${($event: any) =>
            this.handlePrimaryColor($event.detail.color)}"
              ></app-theme>
            `
        : nothing}
      </otter-drawer>

      <md-dialog id="summary-dialog" label=""> ${this.summary} </md-dialog>

      <md-dialog id="open-tweet-dialog">
        ${this.openTweet
        ? html`<post-detail .passed_tweet="${this.openTweet}"></post-detail>`
        : null}
      </md-dialog>

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
              @sl-change="${($event: any) =>
        this.handleWellnessMode($event.target.checked)}"
              ?checked="${this.wellnessMode}"
            ></md-switch>
          </div>

          <p>Wellness Mode hides likes and boosts.</p>
        </div>

        <div class="setting">
          <div>
            <h4>Data Saver Mode</h4>

            <md-switch
              @sl-change="${($event: any) =>
        this.handleDataSaverMode($event.target.checked)}"
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

                <img src="${this.instanceInfo.thumbnail}" />
                <p>${this.instanceInfo.title}</p>

                <div .innerHTML="${this.instanceInfo.description}"></div>
              </div>
            `
        : null}
      </otter-drawer>

      <otter-drawer id="replies-drawer" placement="end" label="Comments">
        ${this.replies.length > 0
        ? html`<ul>
              ${this.replies.map((reply: any) => {
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

        <div slot="footer" id="reply-post-actions">
          <sl-input placeholder="Reply"></sl-input>
          <md-button variant="filled" @click="${() => this.replyToAStatus()}"
            >Reply</md-button
          >
        </div>
      </otter-drawer>

      <main>
        <md-tabs
          @tab-change="${(e: CustomEvent) => this.handleTabChange(e)}"
          .active="${this.activeTab}"
          orientation="${this.tabsOrientation}"
          placement="${this.tabsPlacement}"
        >
          <md-tab slot="nav" panel="general" @click="${() => this.reloadHome()}">
            <md-icon slot="icon" src="/assets/home-outline.svg"></md-icon>
            <span class="tab-label">Home</span>
          </md-tab>
          <md-tab slot="nav" panel="search">
            <md-icon slot="icon" src="/assets/search-outline.svg"></md-icon>
            <span class="tab-label">Explore</span>
          </md-tab>
          <md-tab slot="nav" panel="notifications">
            <md-icon slot="icon" src="/assets/notifications-outline.svg"></md-icon>
            <span class="tab-label">Notifications</span>
            ${this.hasNewNotifications
        ? html`<span class="notification-dot"></span>`
        : nothing}
          </md-tab>
          <md-tab slot="nav" panel="bookmarks">
            <md-icon slot="icon" src="/assets/bookmark-outline.svg"></md-icon>
            <span class="tab-label">Bookmarks</span>
          </md-tab>
          <md-tab slot="nav" panel="faves">
            <md-icon slot="icon" src="/assets/heart-outline.svg"></md-icon>
            <span class="tab-label">Favorites</span>
          </md-tab>

          <div slot="nav" class="new-post-container">
             <md-button
                variant="filled"
                size="large"
                class="new-post-btn"
                @click="${() => this.openNewDialog()}"
            >
                New Post
                <md-icon slot="suffix" src="/assets/add-outline.svg"></md-icon>
            </md-button>
          </div>

          <md-tab slot="nav" panel="media" style="display: none;"></md-tab>
          <md-tab slot="nav" panel="messages" style="display: none;"></md-tab>
          <md-tab slot="nav" panel="custom" style="display: none;"></md-tab>

          <md-tab-panel name="general">
            <app-timeline
              @open="${($event: CustomEvent) =>
        this.handleOpenTweet($event.detail.tweet)}"
              @handle-summary="${($event: any) => this.showSummary($event)}"
              @handle-translating="${($event: any) =>
        this.handleTranslating($event)}"
              class="homeTimeline"
              timelineType="home"
              @replies="${($event: any) =>
        this.handleReplies($event.detail.data, $event.detail.id)}"
            ></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="media">
            <app-timeline timelineType="media"></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="messages">
            <app-messages></app-messages>
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
        : html`<md-skeleton width="100px" height="19px"></md-skeleton>`}
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
          (tag: any) => html`
                        <div class="trending-item" @click="${() =>
              router.navigate(`/hashtag?tag=${tag.name}`)}">
                            <span class="tag">#${tag.name}</span>
                            <span class="count">${tag.history?.[0]?.uses || 0} posts today</span>
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
    `;
  }
}
