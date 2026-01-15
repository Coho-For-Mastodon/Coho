import { LitElement } from 'lit';
import '../components/timeline';
import '../components/timeline-item';
import '../components/otter-drawer';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
import '../components/md/md-dialog';
import '../components/md/md-tabs';
import '../components/md/md-tab';
import '../components/md/md-tab-panel';
import '../components/md/md-icon';
import '../components/md/md-button';
import '../components/md/md-toast';
import '../components/offline-notify';
import '../components/pwa-install';
import '../components/guest-login-banner';
import '../components/home-sidebar';
import '../components/settings-drawer-content';
import '../components/post-detail-dialog';
import '../components/home-tabs-nav';
import { Post } from '../interfaces/Post';
import type { Account } from '../mastodon/types/account';
import type { Instance, TrendingTag } from '../mastodon/types/instance';
import type {
  TabChangeEvent,
  HandleSummaryEvent,
  HandleTranslatingEvent,
} from '../types/events';
export declare class AppHome extends LitElement {
  user: Account | null;
  replies: Post[];
  instanceInfo: Instance | null;
  wellnessMode: boolean;
  dataSaverMode: boolean;
  summary: string;
  hasNewNotifications: boolean;
  trendingTags: TrendingTag[];
  private tabController;
  loadedTabs: Set<string>;
  appThemeLoaded: boolean;
  userTermsLoaded: boolean;
  rightClickLoaded: boolean;
  showInstallPrompt: boolean;
  pwaInstallLoaded: boolean;
  isGuestMode: boolean;
  private overlays;
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
  openNewDialog(shareName?: string): Promise<void>;
  openSettingsDrawer(): Promise<void>;
  handleReplies(replies: Post[], _id: string): Promise<void>;
  openThemingDrawer(): Promise<void>;
  handleWellnessMode(check: boolean): Promise<void>;
  handleDataSaverMode(mode: boolean): Promise<void>;
  handleTabChange(event: TabChangeEvent): Promise<void>;
  handleReload(): Promise<void>;
  openBotDrawer(): void;
  showSummary($event: HandleSummaryEvent): Promise<void>;
  handleOpenTweet(tweet: Post): Promise<void>;
  disconnectedCallback(): Promise<void>;
  private _handleSwitchTab;
  private _handleOpenPostDialog;
  private static readonly tabConfig;
  /**
   * Unified method to lazy-load a tab's component
   */
  private loadTabComponent;
  /**
   * Handle notification-specific side effects when switching to notifications tab
   */
  private handleNotificationsSideEffects;
  reloadHome(): void;
  loadAppTheme(): Promise<void>;
  loadUserTerms(): Promise<void>;
  loadRightClick(): Promise<void>;
  checkInstallPrompt(): Promise<void>;
  openInstallDialog(): Promise<void>;
  handleInstallDismiss(): Promise<void>;
  handleInstallSuccess(): Promise<void>;
  handleTranslating(_event: HandleTranslatingEvent): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}
