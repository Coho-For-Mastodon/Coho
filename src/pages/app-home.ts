import { LitElement, html, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { localized } from '@lit/localize';

// Core components needed for initial render
import '../components/md/md-tabs';
import '../components/md/md-tab';
import '../components/md/md-tab-panel';
import '../components/offline-notify';
import '../components/home-tabs-nav';
import '../components/header';

import { TabController } from '../controllers/tab-controller';
import {
  getSidebarUser,
  getSidebarTrending,
  saveSidebarUser,
  saveSidebarTrending,
} from '../services/sidebar-cache';
import { getActiveAccount } from '../services/auth-session';

import type { OtterDrawer } from '../components/otter-drawer';
import type { MdDialog } from '../components/md/md-dialog';
import type { MdToast } from '../components/md/md-toast';
import type { Timeline } from '../components/timeline';
import type { Notifications } from '../components/notifications';
import type { PostDialog } from '../components/post-dialog';
import type { PwaInstall } from '../components/pwa-install';
import type { PostDetailDialog } from '../components/post-detail-dialog';
import type { ListsDialog } from '../components/lists-dialog';
import type { ListMembershipDialog } from '../components/list-membership-dialog';
import type { FiltersDialog } from '../components/filters-dialog';
import type { ScheduledStatusesDialog } from '../components/scheduled-statuses-dialog';

import { styles } from '../styles/shared-styles';
import { homeStyles } from '../styles/home-styles';
import { fadeInAnimation } from '../styles/animations';
import {
  lazyLoad,
  componentLoaders,
  isLoaded,
} from '../utils/lazy-component-loader';
import { LazyOverlayManager } from '../utils/lazy-overlay';
import { Post } from '../interfaces/Post';
import type { Account } from '../mastodon/types/account';
import type { Instance, TrendingTag } from '../mastodon/types/instance';
import type { List } from '../mastodon/types';
import type {
  TabChangeEvent,
  HandleSummaryEvent,
  HandleTranslatingEvent,
  RepliesEvent,
  ColorChosenEvent,
  OpenAccountSwitcherEvent,
} from '../types/events';

@localized()
@customElement('app-home')
export class AppHome extends LitElement {
  @state() user: Account | null = null;
  @state() replies: Post[] = [];
  @state() instanceInfo: Instance | null = null;

  @state() wellnessMode: boolean = false;
  @state() dataSaverMode: boolean = false;
  @state() hapticsEnabled: boolean = true;

  @state() summary: string = '';

  @state() hasNewNotifications: boolean = false;

  @state() trendingTags: TrendingTag[] = [];
  @state() trendingTagsLoading: boolean = true;

  private tabController = new TabController(this);
  @state() loadedTabs = new Set<string>();

  // Lazy loading states for drawer components
  @state() appThemeLoaded: boolean = false;
  @state() rightClickLoaded: boolean = false;

  // Lazy loading states for dialogs
  @state() postDialogLoaded: boolean = false;
  @state() postDetailDialogLoaded: boolean = false;

  // PWA Install states
  @state() showInstallPrompt: boolean = false;
  @state() pwaInstallLoaded: boolean = false;

  // Mobile detection for conditional rendering
  @state() isMobile: boolean = false;

  // Guest mode state
  @state() isGuestMode: boolean = false;
  @state() lists: List[] = [];
  @state() listsLoading: boolean = false;
  @state() listMembershipAccount: Account | null = null;

  // Lazy overlay manager for dialogs/drawers/toasts
  // This keeps overlays out of DOM until they're needed
  private overlays = new LazyOverlayManager(this, [
    'settings-drawer',
    'replies-drawer',
    'install-dialog',
    'account-switcher-dialog',
    'summary-dialog',
    'translation-toast',
    'error-toast',
    'post-dialog',
    'post-detail-dialog',
    'lists-dialog',
    'list-membership-dialog',
    'filters-dialog',
    'scheduled-statuses-dialog',
  ]);

  // DOM element references using @query for type safety
  @query('#settings-drawer') private settingsDrawer!: OtterDrawer;
  @query('#replies-drawer') private repliesDrawer!: OtterDrawer;
  @query('#bot-drawer') private botDrawer!: OtterDrawer;
  @query('#translation-toast') private translationToast!: MdToast;
  @query('#error-toast') private errorToast!: MdToast;
  @query('#summary-dialog') private summaryDialog!: MdDialog;
  @query('#account-switcher-dialog')
  private accountSwitcherDialog!: MdDialog;
  @query('.homeTimeline') private homeTimeline!: Timeline;
  @query('app-notifications') private notificationsComponent!: Notifications;
  @query('post-dialog') private postDialog!: PostDialog;
  @query('#install-dialog') private installDialog!: MdDialog;
  @query('pwa-install') private pwaInstall!: PwaInstall;
  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;
  @query('lists-dialog') private listsDialog!: ListsDialog;
  @query('list-membership-dialog')
  private listMembershipDialog!: ListMembershipDialog;
  @query('filters-dialog') private filtersDialog!: FiltersDialog;
  @query('scheduled-statuses-dialog')
  private scheduledStatusesDialog!: ScheduledStatusesDialog;

  private getHeaderAccountIdentity(): { avatar: string; label: string } {
    const activeAccount = getActiveAccount();

    return {
      avatar: this.user?.avatar || activeAccount?.avatar || '',
      label:
        this.user?.display_name ||
        this.user?.acct ||
        activeAccount?.displayName ||
        activeAccount?.acct ||
        '',
    };
  }

  static get styles() {
    return [styles, homeStyles, fadeInAnimation];
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Eagerly start loading the timeline component (non-blocking).
    // Vite will preload this chunk so the download starts immediately.
    // The <app-timeline> element upgrades automatically once defined.
    import('../components/timeline');

    const bigScreenQuery = window.matchMedia('(min-width: 821px)');
    if (bigScreenQuery.matches) {
      import('../components/home-sidebar');
    }

    // Restore sidebar data synchronously from sessionStorage
    // so the first render already has content — no skeleton flash.
    const cachedUser = getSidebarUser();
    if (cachedUser) {
      this.user = cachedUser;
    }

    const cachedTrending = getSidebarTrending();
    if (cachedTrending && cachedTrending.length > 0) {
      this.trendingTags = cachedTrending;
      this.trendingTagsLoading = false;
    }
  }

  async firstUpdated() {
    // Check if in guest mode
    const { isGuestMode: checkGuestMode } =
      await import('../services/auth-state');
    this.isGuestMode = checkGuestMode();

    if (this.isGuestMode) {
      import('../components/guest-login-banner');
    }

    // Detect mobile for conditional sidebar rendering
    this.isMobile = window.matchMedia('(max-width: 820px)').matches;

    // Listen for keyboard shortcut tab switches
    window.addEventListener('switch-tab', this._handleSwitchTab);

    // Listen for keyboard shortcut to open new post dialog
    window.addEventListener('open-post-dialog', this._handleOpenPostDialog);

    const { getEffectiveParams } = await import('../utils/launch-params');
    const effectiveParams = getEffectiveParams(window.location);

    // Set up global toast listener for error notifications
    this.setupGlobalToastListener();

    setTimeout(async () => {
      if (effectiveParams.has('name')) {
        const names = effectiveParams.getAll('name');
        await this.handleSharedFiles(names);
      }

      // Check for native Android share intent (cold start)
      this._checkNativeShareTarget();
    }, 1000);

    // Listen for share intents that arrive while the app is already open
    this._initNativeShareListener();

    window.requestIdleCallback(async () => {
      // Import and init key shortcuts
      const { init } = await import('../utils/key-shortcuts');
      init();
    });

    // Reset pagination state (non-blocking - internally synchronous)
    import('../services/timeline').then(({ resetLastPageID }) => {
      resetLastPageID();
    });

    // Eagerly fetch and cache the instance's custom emojis
    if (!this.isGuestMode) {
      import('../services/custom-emojis').then(({ initCustomEmojis }) => {
        initCustomEmojis();
      });
    }

    // Refresh trending tags in the background (stale-while-revalidate).
    // If we already restored from cache in connectedCallback the UI is
    // already populated — this just silently updates the data.
    window.requestIdleCallback(async () => {
      try {
        const { getTrendingTags } = await import('../services/timeline');
        const freshTags = await getTrendingTags();
        this.trendingTags = freshTags;
        saveSidebarTrending(freshTags);
      } catch (err) {
        console.error('Error fetching trending tags', err);
      } finally {
        this.trendingTagsLoading = false;
      }
    });

    window.requestIdleCallback(
      async () => {
        const { getSettings } = await import('../services/settings');
        const settings = await getSettings();

        if (settings) {
          this.handleWellnessMode(settings.wellness || false);

          this.handleDataSaverMode(settings.data_saver || false);

          this.handleHapticsMode(settings.haptics !== false);
        }

        // Only check notifications for authenticated users
        if (!this.isGuestMode) {
          const { checkNewNotifications } =
            await import('../services/notifications');
          this.hasNewNotifications = await checkNewNotifications();
        }
      },
      { timeout: 1000 }
    );

    const tabData = effectiveParams.get('tab');

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
      await this.loadTabComponent(tabToOpen);

      // Wait for the component to be ready before switching tabs
      await this.updateComplete;
      this.tabController.openATab(tabToOpen);
    }

    // Defer right-click menu and install prompt check - not needed immediately
    window.requestIdleCallback(async () => {
      this.loadRightClick();
      await import('../components/pwa-install');
      this.checkInstallPrompt();
    });

    window.requestIdleCallback(() => {
      if (this.shadowRoot) {
        const newPost = effectiveParams.get('newPost');

        if (newPost) {
          this.openNewDialog();
        }
      }
    });

    // Only load user for authenticated users.
    // If we already restored from the sidebar cache the avatar is visible
    // immediately — this background refresh silently picks up changes.
    if (!this.isGuestMode) {
      const { getCurrentUser } = await import('../services/account');
      getCurrentUser().then((user) => {
        if (user) {
          this.user = user;
          saveSidebarUser(user);
        }
      });
    }

    if (!this.isGuestMode) {
      window.requestIdleCallback(() => {
        this.loadLists();
      });
    }
  }

  /**
   * Set up listener for global toast events from optimistic updates
   */
  private setupGlobalToastListener() {
    window.addEventListener('app-toast', async (event: Event) => {
      const customEvent = event as CustomEvent<{
        message: string;
        variant: string;
      }>;
      if (customEvent.detail) {
        await import('../components/md/md-toast');
        // Add toast to DOM first
        await this.overlays.show('error-toast');
        // Then configure and show it
        if (this.errorToast) {
          this.errorToast.message = customEvent.detail.message;
          this.errorToast.variant = customEvent.detail.variant as
            | 'error'
            | 'warning'
            | 'info'
            | 'success';
          this.errorToast.show();
        }
      }
    });
  }

  async handleSharedFiles(names: string[]) {
    const { shareTarget } = await import('../services/share-target');
    const validNames: string[] = [];

    for (const name of names) {
      const result = await shareTarget(name);
      if (result.success) {
        validNames.push(result.decodedName);
      } else {
        console.warn('[Share Target] No cached file found for:', name);
      }
    }

    if (validNames.length === 0) {
      await import('../components/md/md-toast');
      await this.overlays.show('error-toast');
      if (this.errorToast) {
        this.errorToast.message = msg(
          'Failed to load shared image. Please try sharing again.'
        );
        this.errorToast.variant = 'error';
        this.errorToast.show();
      }
      return;
    }

    // Open dialog once, then add all files as attachments
    await this.openNewDialog();

    if (this.postDialog) {
      await this.postDialog.updateComplete;
      for (const name of validNames) {
        await this.postDialog.shareTarget(name);
      }
    }
  }

  private _nativeShareCleanup: { remove: () => void } | null = null;

  /**
   * Check for shared content from an Android share intent (cold start).
   */
  private async _checkNativeShareTarget() {
    const { checkNativeShare } =
      await import('../services/native-share-target');
    const result = await checkNativeShare();
    if (result.hasShare) {
      this._handleNativeShare(result);
    }
  }

  /**
   * Listen for Android share intents that arrive while the app is already
   * running (warm start via onNewIntent).
   */
  private async _initNativeShareListener() {
    const { onNativeShareIntent } =
      await import('../services/native-share-target');
    this._nativeShareCleanup = onNativeShareIntent((result) => {
      this._handleNativeShare(result);
    });
  }

  /**
   * Process a native share intent result — open the compose dialog with
   * the shared media file and/or pre-filled text.
   */
  private async _handleNativeShare(
    result: import('../services/native-share-target').NativeShareResult
  ) {
    if (result.cachedFileName) {
      // Media share — the file is already in the shareTarget cache,
      // so openNewDialog → post-dialog shareTarget will pick it up.
      await this.openNewDialog(result.cachedFileName, undefined, result.text);
    } else if (result.text) {
      // Text-only share (e.g. a URL from Chrome)
      await this.openNewDialog(undefined, undefined, result.text);
    }
  }

  handlePrimaryColor(color: string) {
    document.documentElement.style.setProperty('--sl-color-primary-600', color);
    localStorage.setItem('primary_color', color);
  }

  private _originFromEvent(
    event?: Event | null
  ): { x: number; y: number } | undefined {
    const target = event?.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    if (!rect) return undefined;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  /**
   * Lazily load the post-dialog component and add it to the DOM.
   * Returns the dialog instance (or null).
   */
  private async _ensurePostDialog(): Promise<PostDialog | null> {
    if (!this.postDialogLoaded) {
      if (await lazyLoad('postDialog', componentLoaders.postDialog)) {
        this.postDialogLoaded = true;
      }
    }
    await this.overlays.show('post-dialog');
    await customElements.whenDefined('post-dialog');
    await this.updateComplete;
    if (this.postDialog) {
      await this.postDialog.updateComplete;
    }
    return this.postDialog || null;
  }

  async openNewDialog(
    shareName?: string,
    origin?: { x: number; y: number },
    shareText?: string
  ) {
    const dialog = await this._ensurePostDialog();
    await dialog?.openNewDialog(shareName, origin, shareText);
  }

  async openSettingsDrawer() {
    await Promise.all([
      this.loadAppTheme(),
      import('../components/otter-drawer'),
      import('../components/settings-drawer-content'),
    ]);
    // Add drawer to DOM first
    await this.overlays.show('settings-drawer');
    // Then show it (triggers animation)
    await this.settingsDrawer?.show();

    const { getInstanceInfo } = await import('../services/account');

    this.instanceInfo = await getInstanceInfo();
  }

  async openAccountSwitcherDialog(origin?: { x: number; y: number }) {
    if (this.isGuestMode) return;

    await this._openOverlay(
      'account-switcher-dialog',
      () =>
        Promise.all([
          import('../components/md/md-dialog'),
          import('../components/account-manager'),
        ]),
      'account-manager'
    );

    if (this.accountSwitcherDialog) {
      this.accountSwitcherDialog.setOpenOrigin(origin);
      this.accountSwitcherDialog.show();
    }
  }

  async handleReplies(replies: Post[], _id: string) {
    this.replies = replies;

    // Lazy-load drawer and timeline-item for replies
    await Promise.all([
      import('../components/otter-drawer'),
      import('../components/timeline-item'),
    ]);
    // Add drawer to DOM first
    await this.overlays.show('replies-drawer');
    // Then show it (triggers animation)
    await this.repliesDrawer?.show();
  }

  async handleWellnessMode(check: boolean) {
    this.wellnessMode = check;

    const { setSettings } = await import('../services/settings');
    setSettings({ wellness: check });
  }

  async handleDataSaverMode(mode: boolean) {
    this.dataSaverMode = mode;

    const { setSettings } = await import('../services/settings');
    setSettings({ data_saver: mode });
  }

  async handleHapticsMode(enabled: boolean) {
    this.hapticsEnabled = enabled;

    const { setHapticsEnabled } = await import('../utils/haptics');
    setHapticsEnabled(enabled);

    const { setSettings } = await import('../services/settings');
    setSettings({ haptics: enabled });
  }

  async handleTabChange(event: TabChangeEvent) {
    // Determine the load callback:
    // If we were passed a panel, we might need simple loading
    await this.tabController.handleTabChange(event, (name) =>
      this.loadTabComponent(name)
    );
  }

  async handleReload() {
    const { clearTimelineCache } = await import('../services/timeline-cache');
    // Clear cache to ensure fresh timeline after posting
    clearTimelineCache();

    this.homeTimeline?.refreshTimeline(true); // Pass true to skip saving stale cache
  }

  private async loadLists() {
    if (this.listsLoading) return;
    this.listsLoading = true;
    try {
      const { getLists } = await import('../services/lists');
      this.lists = await getLists();
    } catch (error) {
      console.error('Failed to load lists', error);
    } finally {
      this.listsLoading = false;
    }
  }

  private _handleListsUpdated = (
    event: CustomEvent<{ lists: List[] }>
  ): void => {
    this.lists = event.detail.lists;
  };

  /**
   * Shared helper: import a component, add its overlay to the DOM, and wait for it to be ready.
   */
  private async _openOverlay(
    overlayId: string,
    importFn: () => Promise<unknown>,
    tagName: string
  ): Promise<void> {
    await importFn();
    await this.overlays.show(overlayId);
    await customElements.whenDefined(tagName);
    await this.updateComplete;
  }

  private async openListsDialog() {
    if (this.isGuestMode) return;

    const { ensureListsDialogLoaded } = await import('../utils/list-dialogs');
    await ensureListsDialogLoaded();

    await this._openOverlay(
      'lists-dialog',
      () => Promise.resolve(),
      'lists-dialog'
    );
    this.listsDialog?.show();
  }

  private async openListMembershipDialog(account: Account) {
    if (this.isGuestMode) return;

    this.listMembershipAccount = account;

    const { ensureListMembershipDialogLoaded } =
      await import('../utils/list-dialogs');
    await ensureListMembershipDialogLoaded();

    await this._openOverlay(
      'list-membership-dialog',
      () => Promise.resolve(),
      'list-membership-dialog'
    );
    this.listMembershipDialog?.show(account);
  }

  private async _handleOpenManageListsFromMembership() {
    this.overlays.hideImmediately('list-membership-dialog');
    await this.openListsDialog();
  }

  private async openFiltersDialog() {
    if (this.isGuestMode) return;
    await this._openOverlay(
      'filters-dialog',
      () => import('../components/filters-dialog'),
      'filters-dialog'
    );
    this.filtersDialog?.show();
  }

  private async openScheduledStatusesDialog() {
    if (this.isGuestMode) return;
    await this._openOverlay(
      'scheduled-statuses-dialog',
      () => import('../components/scheduled-statuses-dialog'),
      'scheduled-statuses-dialog'
    );
    this.scheduledStatusesDialog?.show();
  }

  private async _handleFiltersChanged() {
    const { clearTimelineCache } = await import('../services/timeline-cache');
    clearTimelineCache();
    this.homeTimeline?.refreshTimeline(true);
  }

  openBotDrawer() {
    this.botDrawer?.show();
  }

  async showSummary($event: HandleSummaryEvent) {
    const summary = $event.detail.data;
    this.summary = summary;

    // Hide translation toast if it's open
    if (
      this.overlays.isVisible('translation-toast') &&
      this.translationToast?.open
    ) {
      this.translationToast.hide();
      this.overlays.hide('translation-toast');
    }

    await import('../components/md/md-dialog');
    // Add dialog to DOM first
    await this.overlays.show('summary-dialog');
    // Then show it (triggers animation)
    this.summaryDialog?.show();
  }

  async handleOpenTweet(tweet: Post) {
    // Lazy load post-detail-dialog component
    if (!this.postDetailDialogLoaded) {
      if (
        await lazyLoad('postDetailDialog', componentLoaders.postDetailDialog)
      ) {
        this.postDetailDialogLoaded = true;
      }
    }

    // Add dialog to DOM
    await this.overlays.show('post-detail-dialog');

    // Wait for Lit to update the DOM
    await this.updateComplete;

    // Open post in a fullscreen dialog instead of navigating to a new page
    // The dialog handles history state so back button closes it
    this.postDetailDialog?.open(tweet);
  }

  async handleEditPost(tweet: Post) {
    const dialog = await this._ensurePostDialog();
    dialog?.openEditDialog(tweet);
  }

  async disconnectedCallback() {
    super.disconnectedCallback();

    // Persist sidebar data so the next mount restores instantly
    if (this.user) {
      saveSidebarUser(this.user);
    }
    if (this.trendingTags && this.trendingTags.length > 0) {
      saveSidebarTrending(this.trendingTags);
    }

    // Remove keyboard shortcut tab switch listener
    window.removeEventListener('switch-tab', this._handleSwitchTab);

    // Remove keyboard shortcut new post dialog listener
    window.removeEventListener('open-post-dialog', this._handleOpenPostDialog);

    // Remove native share intent listener
    this._nativeShareCleanup?.remove();
  }

  private _handleSwitchTab = async (event: Event) => {
    const customEvent = event as CustomEvent<{ tab: string }>;
    const tabName = customEvent.detail?.tab;
    if (!tabName) return;

    // Preload the component for the requested tab
    await this.loadTabComponent(tabName);

    // Wait for the component to be ready before switching tabs
    await this.updateComplete;
    this.tabController.openATab(tabName, (n) => this.loadTabComponent(n));
  };

  private _handleOpenPostDialog = () => {
    this.openNewDialog();
  };

  private _handleReplyClicked = async (e: CustomEvent<{ tweet: Post }>) => {
    e.preventDefault();
    const post = e.detail.tweet;
    if (!post) return;

    const dialog = await this._ensurePostDialog();
    dialog?.openReplyDialog(post);
  };

  private _handleQuoteClicked = async (e: CustomEvent<{ tweet: Post }>) => {
    const post = e.detail.tweet;
    if (!post) return;

    const dialog = await this._ensurePostDialog();
    dialog?.openQuoteDialog(post);
  };

  // Tab name to loader key
  private static readonly tabConfig: Record<
    string,
    {
      loaderKey: keyof typeof componentLoaders;
    }
  > = {
    bookmarks: { loaderKey: 'bookmarks' },
    faves: { loaderKey: 'favorites' },
    notifications: {
      loaderKey: 'notifications',
    },
    search: { loaderKey: 'search' },
    messages: { loaderKey: 'messages' },
  };

  /**
   * Unified method to lazy-load a tab's component
   */
  private async loadTabComponent(tabName: string): Promise<void> {
    // Handle specific side effects (like notifications) here or in controller callback
    if (tabName === 'notifications') {
      await this.handleNotificationsSideEffects();
    }

    // Tabs that reuse an already-loaded component (app-timeline) — just mark as loaded
    if (tabName === 'media' || tabName === 'custom') {
      if (!this.loadedTabs.has(tabName)) {
        this.loadedTabs = new Set(this.loadedTabs).add(tabName);
      }
      return;
    }

    const config = AppHome.tabConfig[tabName];
    if (!config) return;

    // Avoid reloading if already handled (though lazyLoad handles this too, the Set is for UI rendering)
    if (this.loadedTabs.has(tabName)) return;

    const loader = componentLoaders[config.loaderKey];
    const alreadyLoaded = isLoaded(config.loaderKey);
    const loadedNow = alreadyLoaded
      ? false
      : await lazyLoad(config.loaderKey, loader);

    if (alreadyLoaded || loadedNow) {
      this.loadedTabs = new Set(this.loadedTabs).add(tabName);
    }
  }

  /**
   * Handle notification-specific side effects when switching to notifications tab
   */
  private async handleNotificationsSideEffects(): Promise<void> {
    this.hasNewNotifications = false;
    const { markNotificationsRead } = await import('../services/notifications');
    await markNotificationsRead();
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    }

    // Check for new notifications when re-selecting the tab
    this.notificationsComponent?.checkForNewNotifications();
  }

  reloadHome() {
    this.tabController.reloadHome(() => {
      this.homeTimeline?.refreshTimeline();
    });
  }

  // Lazy loading methods for drawer components
  async loadAppTheme() {
    if (await lazyLoad('appTheme', componentLoaders.appTheme)) {
      this.appThemeLoaded = true;
    }
  }

  async loadRightClick() {
    if (
      await lazyLoad('rightClick', async () => {
        await Promise.all([
          componentLoaders.rightClick(),
          import('../components/md/md-menu'),
          import('../components/md/md-menu-item'),
        ]);
      })
    ) {
      this.rightClickLoaded = true;
    }
  }

  // PWA Install methods
  async checkInstallPrompt() {
    // Skip install prompt entirely when running inside Capacitor native shell
    const { isNativePlatform } = await import('../utils/platform');
    if (isNativePlatform()) return;

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

  async openInstallDialog() {
    // Add dialog to DOM first
    await import('../components/md/md-dialog');
    await this.overlays.show('install-dialog');
    // Then show it (triggers animation)
    this.installDialog?.show();
  }

  async handleInstallDismiss() {
    this.showInstallPrompt = false;
    await this.installDialog?.hide();
    // Remove from DOM after close animation
    this.overlays.hide('install-dialog');
  }

  async handleInstallSuccess() {
    this.showInstallPrompt = false;
    await this.installDialog?.hide();
    // Remove from DOM after close animation
    this.overlays.hide('install-dialog');
  }

  async handleTranslating(_event: HandleTranslatingEvent) {
    await import('../components/md/md-toast');
    // Add toast to DOM first
    await this.overlays.show('translation-toast');
    // Show translation toast
    if (this.translationToast) {
      this.translationToast.show();
    }
  }

  render() {
    const headerAccount = this.getHeaderAccountIdentity();

    return html`
      ${this.rightClickLoaded
        ? html`
            <right-click>
              <md-menu>
                <md-menu-item @menu-item-click=${() => this.openNewDialog()}>
                  <md-icon slot="prefix" name="add"></md-icon>
                  ${msg('New Post')}
                </md-menu-item>

                <md-menu-item
                  @click="${() =>
                    this.tabController.openATab('search', (n) =>
                      this.loadTabComponent(n)
                    )}"
                >
                  <md-icon slot="prefix" name="search"></md-icon>
                  ${msg('Explore')}
                </md-menu-item>
                <md-menu-item
                  @click="${() =>
                    this.tabController.openATab('notifications', (n) =>
                      this.loadTabComponent(n)
                    )}"
                >
                  <md-icon slot="prefix" name="notifications"></md-icon>
                  ${msg('Notifications')}
                </md-menu-item>
                <md-menu-item
                  @click="${() =>
                    this.tabController.openATab('messages', (n) =>
                      this.loadTabComponent(n)
                    )}"
                >
                  <md-icon slot="prefix" name="chatbox"></md-icon>
                  ${msg('Messages')}
                </md-menu-item>
                <md-menu-item
                  @click="${() =>
                    this.tabController.openATab('bookmarks', (n) =>
                      this.loadTabComponent(n)
                    )}"
                >
                  <md-icon slot="prefix" name="bookmark"></md-icon>
                  ${msg('Saved')}
                </md-menu-item>
                <md-menu-item
                  @click="${() =>
                    this.tabController.openATab('faves', (n) =>
                      this.loadTabComponent(n)
                    )}"
                >
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
        @open-account-switcher="${(event: OpenAccountSwitcherEvent) =>
          this.openAccountSwitcherDialog(event.detail?.origin)}"
        @open-install="${() => this.openInstallDialog()}"
        .showInstall="${this.showInstallPrompt}"
        .guestMode="${this.isGuestMode}"
        .showMessages="${!this.isGuestMode}"
        .showAccountSwitcher="${this.isMobile && !this.isGuestMode}"
        .currentAccountAvatar="${headerAccount.avatar}"
        .currentAccountLabel="${headerAccount.label}"
      >
      </app-header>

      <!-- Offline status notifications -->
      <offline-notify></offline-notify>

      <!-- PWA Install - component always in DOM for install detection, dialog is lazy -->
      ${this.overlays.isVisible('install-dialog')
        ? html`
            <md-dialog
              id="install-dialog"
              .label="${msg('Install Coho')}"
              @md-dialog-hide="${() => this.overlays.hide('install-dialog')}"
            >
              <pwa-install
                @pwa-install-dismiss="${() => this.handleInstallDismiss()}"
                @pwa-install-success="${() => this.handleInstallSuccess()}"
                @pwa-installed="${() => this.handleInstallSuccess()}"
              ></pwa-install>
            </md-dialog>
          `
        : html`
            <pwa-install
              style="display: none;"
              @pwa-install-dismiss="${() => this.handleInstallDismiss()}"
              @pwa-install-success="${() => this.handleInstallSuccess()}"
              @pwa-installed="${() => this.handleInstallSuccess()}"
            ></pwa-install>
          `}

      <!-- Summary Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'account-switcher-dialog',
        () => html`
          <md-dialog
            id="account-switcher-dialog"
            .label="${msg('Switch accounts')}"
            @md-dialog-hide="${() =>
              this.overlays.hide('account-switcher-dialog')}"
          >
            <account-manager></account-manager>
          </md-dialog>
        `
      )}
      ${this.overlays.render(
        'summary-dialog',
        () => html`
          <md-dialog
            id="summary-dialog"
            label=""
            @md-dialog-hide="${() => this.overlays.hide('summary-dialog')}"
          >
            ${this.summary}
          </md-dialog>
        `
      )}

      <!-- Post Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'post-dialog',
        () => html`
          <post-dialog
            @published="${() => this.handleReload()}"
            @open-scheduled-statuses="${() =>
              this.openScheduledStatusesDialog()}"
          ></post-dialog>
        `
      )}

      <!-- Lists Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'lists-dialog',
        () => html`
          <lists-dialog
            @md-dialog-hide="${() => this.overlays.hide('lists-dialog')}"
            @lists-updated="${this._handleListsUpdated}"
          ></lists-dialog>
        `
      )}

      <!-- List Membership Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'list-membership-dialog',
        () => html`
          <list-membership-dialog
            .account=${this.listMembershipAccount}
            @md-dialog-hide="${() =>
              this.overlays.hide('list-membership-dialog')}"
            @open-manage-lists="${() =>
              this._handleOpenManageListsFromMembership()}"
          ></list-membership-dialog>
        `
      )}

      <!-- Filters Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'filters-dialog',
        () => html`
          <filters-dialog
            @md-dialog-hide="${() => this.overlays.hide('filters-dialog')}"
            @filters-changed="${() => this._handleFiltersChanged()}"
          ></filters-dialog>
        `
      )}

      <!-- Scheduled Posts Dialog - only in DOM when needed -->
      ${this.overlays.render(
        'scheduled-statuses-dialog',
        () => html`
          <scheduled-statuses-dialog
            @md-dialog-hide="${() =>
              this.overlays.hide('scheduled-statuses-dialog')}"
          ></scheduled-statuses-dialog>
        `
      )}

      <!-- Settings Drawer - only in DOM when needed -->
      ${this.overlays.render(
        'settings-drawer',
        () => html`
          <otter-drawer
            id="settings-drawer"
            placement="end"
            .label="${msg('Settings')}"
            @otter-hide="${() => this.overlays.hide('settings-drawer')}"
          >
            <settings-drawer-content
              .user="${this.user}"
              .instanceInfo="${this.instanceInfo}"
              .wellnessMode="${this.wellnessMode}"
              .dataSaverMode="${this.dataSaverMode}"
              .hapticsEnabled="${this.hapticsEnabled}"
              .appThemeLoaded="${this.appThemeLoaded}"
              @wellness-change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleWellnessMode(e.detail.checked)}"
              @data-saver-change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleDataSaverMode(e.detail.checked)}"
              @haptics-change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleHapticsMode(e.detail.checked)}"
              @open-filters="${() => this.openFiltersDialog()}"
              @open-scheduled-statuses="${() =>
                this.openScheduledStatusesDialog()}"
              @color-chosen="${($event: ColorChosenEvent) =>
                this.handlePrimaryColor($event.detail.color)}"
            ></settings-drawer-content>
          </otter-drawer>
        `
      )}

      <!-- Replies Drawer - only in DOM when needed -->
      ${this.overlays.render(
        'replies-drawer',
        () => html`
          <otter-drawer
            id="replies-drawer"
            placement="end"
            .label="${msg('Comments')}"
            @otter-hide="${() => this.overlays.hide('replies-drawer')}"
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
        `
      )}

      <main>
        <md-tabs
          @tab-change="${(e: CustomEvent) => this.handleTabChange(e)}"
          .active="${this.tabController.activeTab}"
          orientation="${this.tabController.tabsOrientation}"
          placement="${this.tabController.tabsPlacement}"
        >
          <home-tabs-nav
            slot="nav"
            .isGuestMode="${this.isGuestMode}"
            .hasNewNotifications="${this.hasNewNotifications}"
            .activeTab="${this.tabController.activeTab}"
            @reload-home="${() => this.reloadHome()}"
            @open-new-post="${(
              event: CustomEvent<{ origin?: { x: number; y: number } }>
            ) => this.openNewDialog(undefined, event.detail?.origin)}"
          ></home-tabs-nav>

          <md-tab-panel name="general">
            <app-timeline
              @open="${($event: CustomEvent) =>
                this.handleOpenTweet($event.detail.tweet)}"
              @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                this.handleEditPost($event.detail.tweet)}"
              @handle-summary="${($event: HandleSummaryEvent) =>
                this.showSummary($event)}"
              @handle-translating="${($event: HandleTranslatingEvent) =>
                this.handleTranslating($event)}"
              @manage-lists="${() => this.openListsDialog()}"
              @add-to-list="${(event: CustomEvent<{ account: Account }>) =>
                this.openListMembershipDialog(event.detail.account)}"
              class="homeTimeline"
              timelineType="${this.isGuestMode ? 'federated' : 'home'}"
              ?guestMode="${this.isGuestMode}"
              .lists="${this.lists}"
              @replies="${($event: RepliesEvent) =>
                this.handleReplies($event.detail.data, $event.detail.id ?? '')}"
              @reply-clicked="${(e: CustomEvent<{ tweet: Post }>) =>
                this._handleReplyClicked(e)}"
              @quote-clicked="${(e: CustomEvent<{ tweet: Post }>) =>
                this._handleQuoteClicked(e)}"
            ></app-timeline>
          </md-tab-panel>
          <md-tab-panel name="media">
            ${this.loadedTabs.has('media')
              ? html`<app-timeline
                  timelineType="media"
                  .lists="${this.lists}"
                  @manage-lists="${() => this.openListsDialog()}"
                  @add-to-list="${(event: CustomEvent<{ account: Account }>) =>
                    this.openListMembershipDialog(event.detail.account)}"
                ></app-timeline>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="messages">
            ${this.loadedTabs.has('messages')
              ? html`<app-messages></app-messages>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="custom">
            ${this.loadedTabs.has('custom')
              ? html`<app-timeline
                  timelineType="federated"
                  .lists="${this.lists}"
                  @manage-lists="${() => this.openListsDialog()}"
                  @add-to-list="${(event: CustomEvent<{ account: Account }>) =>
                    this.openListMembershipDialog(event.detail.account)}"
                ></app-timeline>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="bookmarks">
            ${this.loadedTabs.has('bookmarks')
              ? html`<app-bookmarks
                  @open="${($event: CustomEvent) =>
                    this.handleOpenTweet($event.detail.tweet)}"
                  @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                    this.handleEditPost($event.detail.tweet)}"
                ></app-bookmarks>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="faves">
            ${this.loadedTabs.has('faves')
              ? html`<app-favorites
                  @open="${($event: CustomEvent) =>
                    this.handleOpenTweet($event.detail.tweet)}"
                  @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                    this.handleEditPost($event.detail.tweet)}"
                ></app-favorites>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="notifications">
            ${this.loadedTabs.has('notifications')
              ? html`<app-notifications
                  @open="${($event: CustomEvent) =>
                    this.handleOpenTweet($event.detail.tweet)}"
                  @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                    this.handleEditPost($event.detail.tweet)}"
                ></app-notifications>`
              : nothing}
          </md-tab-panel>
          <md-tab-panel name="search">
            ${this.loadedTabs.has('search')
              ? html`<search-page></search-page>`
              : nothing}
          </md-tab-panel>
        </md-tabs>

        ${!this.isMobile
          ? html`
              <home-sidebar
                .user="${this.user}"
                .trendingTags="${this.trendingTags}"
                .trendingTagsLoading="${this.trendingTagsLoading}"
                .isGuestMode="${this.isGuestMode}"
                @open-account-switcher="${(event: OpenAccountSwitcherEvent) =>
                  this.openAccountSwitcherDialog(event.detail?.origin)}"
              ></home-sidebar>
            `
          : nothing}
        ${this.isGuestMode
          ? nothing
          : html`
              <div id="mobile-actions">
                <md-button
                  variant="fab"
                  @click="${(event: MouseEvent) =>
                    this.openNewDialog(
                      undefined,
                      this._originFromEvent(event)
                    )}"
                >
                  <md-icon src="/assets/add-outline.svg"></md-icon>
                </md-button>
              </div>
            `}
      </main>

      ${this.isGuestMode
        ? html`<guest-login-banner></guest-login-banner>`
        : nothing}

      <!-- Translation Toast - only in DOM when needed -->
      ${this.overlays.render(
        'translation-toast',
        () => html`
          <md-toast
            id="translation-toast"
            variant="info"
            position="bottom"
            duration="0"
            .message="${msg('Translating post...')}"
            @hide="${() => this.overlays.hide('translation-toast')}"
          >
          </md-toast>
        `
      )}

      <!-- Error Toast - only in DOM when needed -->
      ${this.overlays.render(
        'error-toast',
        () => html`
          <md-toast
            id="error-toast"
            variant="error"
            position="bottom"
            duration="4000"
            closable
            message=""
            @hide="${() => this.overlays.hide('error-toast')}"
          >
          </md-toast>
        `
      )}

      <!-- Post Detail Dialog - fullscreen dialog for viewing posts, only in DOM when needed -->
      ${this.overlays.render(
        'post-detail-dialog',
        () => html`<post-detail-dialog></post-detail-dialog>`
      )}
    `;
  }
}
