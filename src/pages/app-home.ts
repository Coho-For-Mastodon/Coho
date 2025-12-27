import { LitElement, html, nothing } from 'lit';
import { property, customElement, state, query } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { localized } from '@lit/localize';

import '../components/timeline';
import '../components/timeline-item';
import '../components/md/md-skeleton';

import '../components/otter-drawer';
import '../components/md/md-button';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-dialog';
import '../components/md/md-tabs';
import '../components/md/md-tab';
import '../components/md/md-tab-panel';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-toast';
import '../components/offline-notify';
import '../components/pwa-install';
import '../components/guest-login-banner';
import '../components/home-sidebar';
import '../components/settings-drawer-content';

import type { OtterDrawer } from '../components/otter-drawer';
import type { MdDialog } from '../components/md/md-dialog';
import type { MdToast } from '../components/md/md-toast';
import type { Timeline } from '../components/timeline';
import type { PostDialog } from '../components/post-dialog';
import type { PwaInstall } from '../components/pwa-install';

import { styles } from '../styles/shared-styles';
import { homeStyles } from '../styles/home-styles';
import { router } from '../utils/router';
import { lazyLoad, componentLoaders } from '../utils/lazy-component-loader';
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

@localized()
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

  // PWA Install states
  @state() showInstallPrompt: boolean = false;
  @state() pwaInstallLoaded: boolean = false;

  // Guest mode state
  @state() isGuestMode: boolean = false;

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
  @query('.homeTimeline') private homeTimeline!: Timeline;
  @query('post-dialog') private postDialog!: PostDialog;
  @query('#install-dialog') private installDialog!: MdDialog;
  @query('pwa-install') private pwaInstall!: PwaInstall;

  static get styles() {
    return [styles, homeStyles];
  }

  async firstUpdated() {
    // Check if in guest mode
    const { isGuestMode: checkGuestMode } =
      await import('../services/auth-state');
    this.isGuestMode = checkGuestMode();

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

        // Only check notifications for authenticated users
        if (!this.isGuestMode) {
          this.hasNewNotifications = await checkNewNotifications();
        }
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
      // Skip auth-required tabs for guests
      const authRequiredTabs = [
        'bookmarks',
        'faves',
        'notifications',
        'messages',
      ];
      if (this.isGuestMode && authRequiredTabs.includes(tabToOpen)) {
        tabToOpen = 'general';
      }

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

    // Check if we should show the install prompt
    this.checkInstallPrompt();

    window.requestIdleCallback(() => {
      if (this.shadowRoot) {
        const newPost = effectiveParams.get('newPost');

        if (newPost) {
          this.openNewDialog();
        }
      }
    });

    // Only load user for authenticated users
    if (!this.isGuestMode) {
      const { getCurrentUser } = await import('../services/account');
      getCurrentUser().then((user) => {
        this.user = user ?? null;
      });
    }
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
    // Always use full-page navigation for better UX + supports back/forward/history
    router.navigate(`/home/post?${encodeURIComponent(JSON.stringify(tweet))}`);
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

  // Lazy loading methods for tab components - using centralized loader utility
  async loadBookmarks() {
    if (await lazyLoad('bookmarks', componentLoaders.bookmarks)) {
      this.bookmarksLoaded = true;
    }
  }

  async loadFavorites() {
    if (await lazyLoad('favorites', componentLoaders.favorites)) {
      this.favoritesLoaded = true;
    }
  }

  async loadNotifications() {
    if (await lazyLoad('notifications', componentLoaders.notifications)) {
      this.notificationsLoaded = true;
    }
  }

  async loadSearch() {
    if (await lazyLoad('search', componentLoaders.search)) {
      this.searchLoaded = true;
    }
  }

  async loadMessages() {
    if (await lazyLoad('messages', componentLoaders.messages)) {
      this.messagesLoaded = true;
    }
  }

  // Lazy loading methods for drawer components
  async loadAppTheme() {
    if (await lazyLoad('appTheme', componentLoaders.appTheme)) {
      this.appThemeLoaded = true;
    }
  }

  async loadUserTerms() {
    if (await lazyLoad('userTerms', componentLoaders.userTerms)) {
      this.userTermsLoaded = true;
    }
  }

  async loadRightClick() {
    if (await lazyLoad('rightClick', componentLoaders.rightClick)) {
      this.rightClickLoaded = true;
    }
  }

  // PWA Install methods
  async checkInstallPrompt() {
    // Wait a moment for the pwa-install component to initialize
    await this.updateComplete;

    // Don't show if already installed
    if (
      this.pwaInstall &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches)
    ) {
      return;
    }

    const isMobile = window.matchMedia('(max-width: 820px)').matches;

    // On desktop with Web Install API, always show (ignore dismissal)
    if (!isMobile && this.pwaInstall?.hasWebInstallAPI) {
      this.showInstallPrompt = true;
      this.pwaInstallLoaded = true;
      return;
    }

    // Otherwise, check if install can be shown (respects dismissal)
    if (this.pwaInstall?.canShow || this.pwaInstall?.hasInstallMethod) {
      this.showInstallPrompt = true;
      this.pwaInstallLoaded = true;
    }
  }

  openInstallDialog() {
    this.installDialog?.show();
  }

  handleInstallDismiss() {
    this.showInstallPrompt = false;
    this.installDialog?.hide();
  }

  handleInstallSuccess() {
    this.showInstallPrompt = false;
    this.installDialog?.hide();
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
                  ${msg('New Post')}
                </md-menu-item>

                <md-menu-item @click="${() => this.openATab('search')}">
                  <md-icon slot="prefix" name="search"></md-icon>
                  ${msg('Explore')}
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('notifications')}">
                  <md-icon slot="prefix" name="notifications"></md-icon>
                  ${msg('Notifications')}
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('messages')}">
                  <md-icon slot="prefix" name="chatbox"></md-icon>
                  ${msg('Messages')}
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('bookmarks')}">
                  <md-icon slot="prefix" name="bookmark"></md-icon>
                  ${msg('Saved')}
                </md-menu-item>
                <md-menu-item @click="${() => this.openATab('faves')}">
                  <md-icon slot="prefix" name="heart"></md-icon>
                  ${msg('Favorites')}
                </md-menu-item>
              </md-menu>
            </right-click>
          `
        : null}

      <app-header
        @open-bot-drawer="${() => this.openBotDrawer()}"
        @open-settings="${() => this.openSettingsDrawer()}"
        @open-theming="${() => this.openThemingDrawer()}"
        @open-install="${() => this.openInstallDialog()}"
        .showInstall="${this.showInstallPrompt}"
        .guestMode="${this.isGuestMode}"
      >
      </app-header>

      <!-- Offline status notifications -->
      <offline-notify></offline-notify>

      <!-- PWA Install Dialog -->
      <md-dialog id="install-dialog" .label="${msg('Install Coho')}">
        <pwa-install
          @pwa-install-dismiss="${() => this.handleInstallDismiss()}"
          @pwa-install-success="${() => this.handleInstallSuccess()}"
          @pwa-installed="${() => this.handleInstallSuccess()}"
        ></pwa-install>
      </md-dialog>

      <otter-drawer .label="${msg('Theming')}" id="theming-drawer">
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

      <post-dialog @published="${() => this.handleReload()}"></post-dialog>

      <otter-drawer
        id="settings-drawer"
        placement="end"
        .label="${msg('Settings')}"
      >
        <settings-drawer-content
          .user="${this.user}"
          .instanceInfo="${this.instanceInfo}"
          .wellnessMode="${this.wellnessMode}"
          .dataSaverMode="${this.dataSaverMode}"
          .userTermsLoaded="${this.userTermsLoaded}"
          @wellness-change="${(e: CustomEvent<{ checked: boolean }>) =>
            this.handleWellnessMode(e.detail.checked)}"
          @data-saver-change="${(e: CustomEvent<{ checked: boolean }>) =>
            this.handleDataSaverMode(e.detail.checked)}"
        ></settings-drawer-content>
      </otter-drawer>

      <otter-drawer
        id="replies-drawer"
        placement="end"
        .label="${msg('Comments')}"
      >
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
                <p>${msg('No comments yet.')}</p>
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
            <span class="tab-label">${msg('Home')}</span>
          </md-tab>
          <md-tab slot="nav" panel="search">
            <md-icon slot="icon" src="/assets/search-outline.svg"></md-icon>
            <span class="tab-label">${msg('Explore')}</span>
          </md-tab>
          <md-tab
            slot="nav"
            panel="notifications"
            ?disabled="${this.isGuestMode}"
          >
            <md-icon
              slot="icon"
              src="/assets/notifications-outline.svg"
            ></md-icon>
            <span class="tab-label">${msg('Notifications')}</span>
            ${this.hasNewNotifications
              ? html`<span class="notification-dot"></span>`
              : nothing}
            ${this.isGuestMode
              ? html`<md-icon
                  slot="suffix"
                  name="lock-closed"
                  style="font-size: 12px; opacity: 0.5;"
                ></md-icon>`
              : nothing}
          </md-tab>
          <md-tab slot="nav" panel="bookmarks" ?disabled="${this.isGuestMode}">
            <md-icon slot="icon" src="/assets/bookmark-outline.svg"></md-icon>
            <span class="tab-label">${msg('Saved')}</span>
            ${this.isGuestMode
              ? html`<md-icon
                  slot="suffix"
                  name="lock-closed"
                  style="font-size: 12px; opacity: 0.5;"
                ></md-icon>`
              : nothing}
          </md-tab>
          <md-tab slot="nav" panel="faves" ?disabled="${this.isGuestMode}">
            <md-icon slot="icon" src="/assets/heart-outline.svg"></md-icon>
            <span class="tab-label">${msg('Favorites')}</span>
            ${this.isGuestMode
              ? html`<md-icon
                  slot="suffix"
                  name="lock-closed"
                  style="font-size: 12px; opacity: 0.5;"
                ></md-icon>`
              : nothing}
          </md-tab>

          ${this.isGuestMode
            ? nothing
            : html`
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
              `}

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
              timelineType="${this.isGuestMode ? 'public' : 'home'}"
              ?guestMode="${this.isGuestMode}"
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

        <home-sidebar
          .user="${this.user}"
          .trendingTags="${this.trendingTags}"
          .isGuestMode="${this.isGuestMode}"
        ></home-sidebar>

        ${this.isGuestMode
          ? nothing
          : html`
              <div id="mobile-actions">
                <md-button variant="fab" @click="${() => this.openNewDialog()}">
                  <md-icon src="/assets/add-outline.svg"></md-icon>
                </md-button>
              </div>
            `}
      </main>

      ${this.isGuestMode
        ? html`<guest-login-banner></guest-login-banner>`
        : nothing}

      <md-toast
        id="translation-toast"
        variant="info"
        position="bottom"
        duration="0"
        .message="${msg('Translating post...')}"
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
