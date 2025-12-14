import { LitElement } from 'lit';
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
import '../components/pwa-install';
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
  openTweet: Post | null;
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
  private openTweetSheet;
  private homeTimeline;
  private postDialog;
  private installDialog;
  private pwaInstall;
  static get styles(): import('lit').CSSResult[];
  firstUpdated(): Promise<void>;
  /**
   * Set up listener for global toast events from optimistic updates
   */
  private setupGlobalToastListener;
  shareTarget(name: string): Promise<void>;
  handlePrimaryColor(color: string): void;
  share(): void;
  openNewDialog(): Promise<void>;
  publish(): Promise<void>;
  goToFollowers(): Promise<void>;
  goToFollowing(): Promise<void>;
  openSettingsDrawer(): Promise<void>;
  handleReplies(replies: Post[], id: string): Promise<void>;
  replyToAStatus(): Promise<void>;
  openThemingDrawer(): Promise<void>;
  doFocusMode(): void;
  handleWellnessMode(check: boolean): Promise<void>;
  handleSensitiveContent(check: boolean): Promise<void>;
  handleDataSaverMode(mode: boolean): Promise<void>;
  removeImage(): void;
  openATab(name: string): void;
  shareMyProfile(): Promise<void>;
  viewMyProfile(): void;
  editMyProfile(): void;
  handleReload(): Promise<void>;
  openBotDrawer(): void;
  showSummary($event: HandleSummaryEvent): void;
  onMoveHandler(
    ev: {
      deltaX: number;
    },
    dialog: HTMLElement & {
      hide(): void;
    }
  ): void;
  handleOpenTweet(tweet: Post): Promise<void>;
  private handleOpenTweetSheetHide;
  disconnectedCallback(): Promise<void>;
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
  openInstallDialog(): void;
  handleInstallDismiss(): void;
  handleInstallSuccess(): void;
  handleTabChange(event: TabChangeEvent): Promise<void>;
  handleTranslating(_event: HandleTranslatingEvent): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}
