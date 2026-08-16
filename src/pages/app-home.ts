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
import '../components/timeline';
import '../components/timeline-item';

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
import { perfMarkRouteReady } from '../utils/perf-observer';
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

import { HomePwaInstallController } from './app-home/pwa-install-controller';
import { HomeSettingsController } from './app-home/home-settings-controller';
import {
  renderRightClickMenu,
  renderInstallOverlay,
  renderSettingsDrawer,
  renderRepliesDrawer,
} from './app-home/home-overlays';

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

  private _shareCleanup: (() => void) | undefined;

  private pwaController = new HomePwaInstallController({
    getState: () => ({
      showInstallPrompt: this.showInstallPrompt,
      pwaInstallLoaded: this.pwaInstallLoaded,
    }),
    setState: (patch) => Object.assign(this, patch),
    getPwaInstall: () => this.pwaInstall,
    getInstallDialog: () => this.installDialog,
    showOverlay: (name) => this.overlays.show(name),
    hideOverlay: (name) => this.overlays.hide(name),
    updateComplete: this.updateComplete,
  });

  private settingsController = new HomeSettingsController({
    getState: () => ({
      wellnessMode: this.wellnessMode,
      dataSaverMode: this.dataSaverMode,
      hapticsEnabled: this.hapticsEnabled,
    }),
    setState: (patch) => Object.assign(this, patch),
    showErrorToast: async (message: string, variant?: string) => {
      await import('../components/md/md-toast');
      await this.overlays.show('error-toast');
      if (this.errorToast) {
        this.errorToast.message = message;
        this.errorToast.variant =
          (variant as 'error' | 'warning' | 'info' | 'success') || 'error';
        this.errorToast.show();
      }
    },
  });

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

    const bigScreenQuery = window.matchMedia('(min-width: 821px)');
    if (bigScreenQuery.matches) {
      import('../components/home-sidebar');
    }

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
    requestAnimationFrame(() =>
      requestAnimationFrame(() => perfMarkRouteReady('home'))
    );

    const { isGuestMode: checkGuestMode } =
      await import('../services/auth-state');
    this.isGuestMode = checkGuestMode();

    if (this.isGuestMode) {
      import('../components/guest-login-banner');
    }

    this.isMobile = window.matchMedia('(max-width: 820px)').matches;

    window.addEventListener('switch-tab', this._handleSwitchTab);
    window.addEventListener('open-post-dialog', this._handleOpenPostDialog);

    const effectiveParams = new URLSearchParams(window.location.search);

    this.settingsController.setupGlobalToastListener();

    const hasWebShare = effectiveParams.has('name');
    const { isNativePlatform } = await import('../utils/platform');
    const isNative = isNativePlatform();

    if (hasWebShare || isNative) {
      const { initNativeShareListener, handlePendingShares } =
        await import('../utils/share-intent-host');

      const shareHandlers = {
        openNewDialog: (n?: string, o?: { x: number; y: number }, t?: string) =>
          this.openNewDialog(n, o, t),
        openDialogAndAttach: async (names: string[]) => {
          await this.openNewDialog();
          if (this.postDialog) {
            await this.postDialog.updateComplete;
            for (const name of names) {
              await this.postDialog.shareTarget(name);
            }
          }
        },
        showError: async (message: string) => {
          await import('../components/md/md-toast');
          await this.overlays.show('error-toast');
          if (this.errorToast) {
            this.errorToast.message = message;
            this.errorToast.variant = 'error';
            this.errorToast.show();
          }
        },
      };

      if (isNative) {
        this._shareCleanup = await initNativeShareListener(shareHandlers);
      }

      setTimeout(
        () =>
          handlePendingShares(
            effectiveParams.getAll('name'),
            isNative,
            shareHandlers
          ),
        1000
      );
    }

    window.requestIdleCallback(async () => {
      const { init } = await import('../utils/key-shortcuts');
      init();
    });

    import('../services/timeline').then(({ resetLastPageID }) => {
      resetLastPageID();
    });

    if (!this.isGuestMode) {
      import('../services/custom-emojis').then(({ initCustomEmojis }) => {
        initCustomEmojis();
      });
    }

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
        await this.settingsController.init();

        if (!this.isGuestMode) {
          const { checkNewNotifications } =
            await import('../services/notifications');
          this.hasNewNotifications = await checkNewNotifications();
        }
      },
      { timeout: 1000 }
    );

    const tabData = effectiveParams.get('tab');
    let tabToOpen = tabData;
    if (!tabToOpen) {
      try {
        tabToOpen = sessionStorage.getItem('coho:activeTab');
      } catch {
        // Ignore storage errors
      }
    }

    if (tabToOpen) {
      const authRequiredTabs = [
        'bookmarks',
        'faves',
        'notifications',
        'messages',
      ];
      if (this.isGuestMode && authRequiredTabs.includes(tabToOpen)) {
        tabToOpen = 'general';
      }

      await this.loadTabComponent(tabToOpen);
      await this.updateComplete;
      this.tabController.openATab(tabToOpen);
    }

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

  handlePrimaryColor(color: string) {
    this.settingsController.handlePrimaryColor(color);
  }

  private _originFromEvent(
    event?: Event | null
  ): { x: number; y: number } | undefined {
    const target = event?.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    if (!rect) return undefined;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

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
    await this.overlays.show('settings-drawer');
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
    await import('../components/otter-drawer');
    await this.overlays.show('replies-drawer');
    await this.repliesDrawer?.show();
  }

  async handleWellnessMode(check: boolean) {
    await this.settingsController.handleWellnessMode(check);
  }

  async handleDataSaverMode(mode: boolean) {
    await this.settingsController.handleDataSaverMode(mode);
  }

  async handleHapticsMode(enabled: boolean) {
    await this.settingsController.handleHapticsMode(enabled);
  }

  async handleTabChange(event: TabChangeEvent) {
    await this.tabController.handleTabChange(event, (name) =>
      this.loadTabComponent(name)
    );
  }

  async handleReload() {
    const { clearTimelineCache } = await import('../services/timeline-cache');
    clearTimelineCache();
    this.homeTimeline?.refreshTimeline(true);
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

    if (
      this.overlays.isVisible('translation-toast') &&
      this.translationToast?.open
    ) {
      this.translationToast.hide();
      this.overlays.hide('translation-toast');
    }

    await import('../components/md/md-dialog');
    await this.overlays.show('summary-dialog');
    this.summaryDialog?.show();
  }

  async handleOpenTweet(tweet: Post) {
    if (!this.postDetailDialogLoaded) {
      if (
        await lazyLoad('postDetailDialog', componentLoaders.postDetailDialog)
      ) {
        this.postDetailDialogLoaded = true;
      }
    }

    await this.overlays.show('post-detail-dialog');
    await this.updateComplete;
    this.postDetailDialog?.open(tweet);
  }

  async handleEditPost(tweet: Post) {
    const dialog = await this._ensurePostDialog();
    dialog?.openEditDialog(tweet);
  }

  async disconnectedCallback() {
    super.disconnectedCallback();

    if (this.user) {
      saveSidebarUser(this.user);
    }
    if (this.trendingTags && this.trendingTags.length > 0) {
      saveSidebarTrending(this.trendingTags);
    }

    window.removeEventListener('switch-tab', this._handleSwitchTab);
    window.removeEventListener('open-post-dialog', this._handleOpenPostDialog);
    this.settingsController.destroy();
    this._shareCleanup?.();
  }

  private _handleSwitchTab = async (event: Event) => {
    const customEvent = event as CustomEvent<{ tab: string }>;
    const tabName = customEvent.detail?.tab;
    if (!tabName) return;

    await this.loadTabComponent(tabName);
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

  private async loadTabComponent(tabName: string): Promise<void> {
    if (tabName === 'notifications') {
      await this.handleNotificationsSideEffects();
    }

    if (tabName === 'media' || tabName === 'custom') {
      if (!this.loadedTabs.has(tabName)) {
        this.loadedTabs = new Set(this.loadedTabs).add(tabName);
      }
      return;
    }

    const config = AppHome.tabConfig[tabName];
    if (!config) return;

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

  private async handleNotificationsSideEffects(): Promise<void> {
    this.hasNewNotifications = false;
    const { markNotificationsRead } = await import('../services/notifications');
    await markNotificationsRead();
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    }

    this.notificationsComponent?.checkForNewNotifications();
  }

  reloadHome() {
    this.tabController.reloadHome(() => {
      this.homeTimeline?.refreshTimeline();
    });
  }

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

  async checkInstallPrompt() {
    await this.pwaController.checkInstallPrompt();
  }

  async openInstallDialog() {
    await this.pwaController.openInstallDialog();
  }

  async handleInstallDismiss() {
    await this.pwaController.handleInstallDismiss();
  }

  async handleInstallSuccess() {
    await this.pwaController.handleInstallSuccess();
  }

  async handleTranslating(_event: HandleTranslatingEvent) {
    await import('../components/md/md-toast');
    await this.overlays.show('translation-toast');
    if (this.translationToast) {
      this.translationToast.show();
    }
  }

  render() {
    const headerAccount = this.getHeaderAccountIdentity();

    return html`
      ${renderRightClickMenu({
        rightClickLoaded: this.rightClickLoaded,
        onNewPost: () => this.openNewDialog(),
        onOpenTab: (name) =>
          this.tabController.openATab(name, (n) => this.loadTabComponent(n)),
      })}

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

      <offline-notify></offline-notify>

      ${renderInstallOverlay({
        isDialogVisible: this.overlays.isVisible('install-dialog'),
        onHide: () => this.overlays.hide('install-dialog'),
        onDismiss: () => this.handleInstallDismiss(),
        onSuccess: () => this.handleInstallSuccess(),
      })}
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
      ${this.overlays.render(
        'lists-dialog',
        () => html`
          <lists-dialog
            @md-dialog-hide="${() => this.overlays.hide('lists-dialog')}"
            @lists-updated="${this._handleListsUpdated}"
          ></lists-dialog>
        `
      )}
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
      ${this.overlays.render(
        'filters-dialog',
        () => html`
          <filters-dialog
            @md-dialog-hide="${() => this.overlays.hide('filters-dialog')}"
            @filters-changed="${() => this._handleFiltersChanged()}"
          ></filters-dialog>
        `
      )}
      ${this.overlays.render(
        'scheduled-statuses-dialog',
        () => html`
          <scheduled-statuses-dialog
            @md-dialog-hide="${() =>
              this.overlays.hide('scheduled-statuses-dialog')}"
          ></scheduled-statuses-dialog>
        `
      )}
      ${this.overlays.render('settings-drawer', () =>
        renderSettingsDrawer({
          user: this.user,
          instanceInfo: this.instanceInfo,
          wellnessMode: this.wellnessMode,
          dataSaverMode: this.dataSaverMode,
          hapticsEnabled: this.hapticsEnabled,
          appThemeLoaded: this.appThemeLoaded,
          onHide: () => this.overlays.hide('settings-drawer'),
          onWellnessChange: (checked) => this.handleWellnessMode(checked),
          onDataSaverChange: (checked) => this.handleDataSaverMode(checked),
          onHapticsChange: (checked) => this.handleHapticsMode(checked),
          onOpenFilters: () => this.openFiltersDialog(),
          onOpenScheduledStatuses: () => this.openScheduledStatusesDialog(),
          onColorChosen: (e: ColorChosenEvent) =>
            this.handlePrimaryColor(e.detail.color),
        })
      )}
      ${this.overlays.render('replies-drawer', () =>
        renderRepliesDrawer({
          replies: this.replies,
          onHide: () => this.overlays.hide('replies-drawer'),
        })
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
            ${
              this.loadedTabs.has('media')
                ? html`<app-timeline
                    timelineType="media"
                    .lists="${this.lists}"
                    @manage-lists="${() => this.openListsDialog()}"
                    @add-to-list="${(
                      event: CustomEvent<{ account: Account }>
                    ) => this.openListMembershipDialog(event.detail.account)}"
                  ></app-timeline>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="messages">
            ${
              this.loadedTabs.has('messages')
                ? html`<app-messages></app-messages>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="custom">
            ${
              this.loadedTabs.has('custom')
                ? html`<app-timeline
                    timelineType="federated"
                    .lists="${this.lists}"
                    @manage-lists="${() => this.openListsDialog()}"
                    @add-to-list="${(
                      event: CustomEvent<{ account: Account }>
                    ) => this.openListMembershipDialog(event.detail.account)}"
                  ></app-timeline>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="bookmarks">
            ${
              this.loadedTabs.has('bookmarks')
                ? html`<app-bookmarks
                    @open="${($event: CustomEvent) =>
                      this.handleOpenTweet($event.detail.tweet)}"
                    @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                      this.handleEditPost($event.detail.tweet)}"
                  ></app-bookmarks>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="faves">
            ${
              this.loadedTabs.has('faves')
                ? html`<app-favorites
                    @open="${($event: CustomEvent) =>
                      this.handleOpenTweet($event.detail.tweet)}"
                    @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                      this.handleEditPost($event.detail.tweet)}"
                  ></app-favorites>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="notifications">
            ${
              this.loadedTabs.has('notifications')
                ? html`<app-notifications
                    @open="${($event: CustomEvent) =>
                      this.handleOpenTweet($event.detail.tweet)}"
                    @edit="${($event: CustomEvent<{ tweet: Post }>) =>
                      this.handleEditPost($event.detail.tweet)}"
                  ></app-notifications>`
                : nothing
            }
          </md-tab-panel>
          <md-tab-panel name="search">
            ${
              this.loadedTabs.has('search')
                ? html`<search-page></search-page>`
                : nothing
            }
          </md-tab-panel>
        </md-tabs>

        ${
          !this.isMobile
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
            : nothing
        }
        ${
          this.isGuestMode
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
              `
        }
      </main>

      ${
        this.isGuestMode
          ? html`<guest-login-banner></guest-login-banner>`
          : nothing
      }
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
      ${this.overlays.render(
        'post-detail-dialog',
        () => html`<post-detail-dialog></post-detail-dialog>`
      )}
    `;
  }
}
