import { LitElement } from 'lit';
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
import '../components/post-detail-dialog';
import { Post } from '../interfaces/Post';
import type { Account } from '../mastodon/types/account';
import type { Instance, TrendingTag } from '../mastodon/types/instance';
import type {
  TabChangeEvent,
  HandleSummaryEvent,
  HandleTranslatingEvent,
} from '../types/events';
export declare class AppHome extends LitElement {
  message: string;
  user: Account | null;
  attachmentID: string | null;
  attachmentPreview: string | null;
  replies: Post[];
  replyID: string | null;
  primary_color: string;
  instanceInfo: Instance | null;
  wellnessMode: boolean;
  dataSaverMode: boolean;
  sensitiveMode: boolean;
  attaching: boolean;
  summary: string;
  homeLoad: boolean;
  hasNewNotifications: boolean;
  trendingTags: TrendingTag[];
  bookmarksLoaded: boolean;
  favoritesLoaded: boolean;
  notificationsLoaded: boolean;
  searchLoaded: boolean;
  messagesLoaded: boolean;
  appThemeLoaded: boolean;
  userTermsLoaded: boolean;
  rightClickLoaded: boolean;
  showInstallPrompt: boolean;
  pwaInstallLoaded: boolean;
  isGuestMode: boolean;
  private overlays;
  activeTab: string;
  tabsOrientation: 'horizontal' | 'vertical';
  tabsPlacement: 'top' | 'bottom' | 'start' | 'end';
  private settingsDrawer;
  private repliesDrawer;
  private themingDrawer;
  private botDrawer;
  private translationToast;
  private errorToast;
  private summaryDialog;
  private homeTimeline;
  private postDialog;
  private installDialog;
  private pwaInstall;
  private postDetailDialog;
  static get styles(): import('lit').CSSResult[];
  firstUpdated(): Promise<void>;
  /**
   * Set up listener for global toast events from optimistic updates
   */
  private setupGlobalToastListener;
  shareTarget(name: string): Promise<void>;
  handlePrimaryColor(color: string): void;
  share(): void;
  openNewDialog(shareName?: string): Promise<void>;
  publish(): Promise<void>;
  openSettingsDrawer(): Promise<void>;
  handleReplies(replies: Post[], id: string): Promise<void>;
  replyToAStatus(): Promise<void>;
  openThemingDrawer(): Promise<void>;
  doFocusMode(): void;
  handleWellnessMode(check: boolean): Promise<void>;
  handleSensitiveContent(check: boolean): Promise<void>;
  handleDataSaverMode(mode: boolean): Promise<void>;
  removeImage(): void;
  openATab(name: string): Promise<void>;
  handleReload(): Promise<void>;
  openBotDrawer(): void;
  showSummary($event: HandleSummaryEvent): Promise<void>;
  onMoveHandler(
    ev: {
      deltaX: number;
    },
    dialog: HTMLElement & {
      hide(): void;
    }
  ): void;
  handleOpenTweet(tweet: Post): Promise<void>;
  disconnectedCallback(): Promise<void>;
  private _handleSwitchTab;
  private _handleOpenPostDialog;
  private _wasOnHomeTab;
  reloadHome(): void;
  loadBookmarks(): Promise<void>;
  loadFavorites(): Promise<void>;
  loadNotifications(): Promise<void>;
  loadSearch(): Promise<void>;
  loadMessages(): Promise<void>;
  loadAppTheme(): Promise<void>;
  loadUserTerms(): Promise<void>;
  loadRightClick(): Promise<void>;
  checkInstallPrompt(): Promise<void>;
  openInstallDialog(): Promise<void>;
  handleInstallDismiss(): Promise<void>;
  handleInstallSuccess(): Promise<void>;
  handleTabChange(event: TabChangeEvent): Promise<void>;
  handleTranslating(_event: HandleTranslatingEvent): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}
