import { LitElement, PropertyValues } from 'lit';
import { Post } from '../interfaces/Post';
import type {
  HandleSummaryDetail,
  HandleTranslatingDetail,
} from '../types/events';
interface AnalyzeEntity {
  text: string;
  category: string;
  confidenceScore: number;
}
interface AnalyzeData {
  results?: {
    documents?: Array<{
      entities?: AnalyzeEntity[];
    }>;
  };
}
interface ImageAnalyzeData {
  descriptionResult?: {
    values?: Array<{
      text: string;
    }>;
  };
}
import '../components/md/md-dialog';
import '../components/md/md-button';
import '../components/md/md-icon';
import '../components/md/md-skeleton-card';
import '../components/md/md-divider';
import '@lit-labs/virtualizer';
import '../components/timeline-item';
import '../components/search';
import '../components/md/md-select';
import '../components/md/md-option';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';
export declare class Timeline extends LitElement {
  timeline: Post[];
  loadingData: boolean;
  lastScrollPosition: number;
  imgPreview: string | undefined;
  analyzeData: AnalyzeEntity[] | null;
  imageDesc: string | undefined;
  analyzeTweet: Post | null;
  isRefreshing: boolean;
  private _pullStartY;
  private _isPulling;
  private _pullDistance;
  private _threshold;
  private _hapticTriggered;
  private _prefetchedIds;
  private _renderTimelineItem;
  private _refreshIndicator;
  private _refreshIcon;
  private _scrollContainer;
  private _rafId;
  private _pullToRefreshSetup;
  timelineType:
    | 'home'
    | 'public'
    | 'media'
    | 'for you'
    | 'home and some trending';
  guestMode: boolean;
  data: Post[] | undefined;
  header: boolean;
  autoLoad: boolean;
  get timelineTitle():
    | 'Home'
    | 'Public'
    | 'Media'
    | 'For You'
    | 'Home & Trending'
    | 'Timeline';
  protected willUpdate(changedProperties: PropertyValues): void;
  static styles: import('lit').CSSResult[];
  firstUpdated(): void;
  updated(changedProperties: PropertyValues): void;
  private _setupPullToRefresh;
  private _getScrollContainer;
  private _getRefreshIndicator;
  private _getRefreshIcon;
  _handleTouchStart(e: TouchEvent): void;
  _handleTouchMove(e: TouchEvent): void;
  _handleTouchEnd(): Promise<void>;
  connectedCallback(): Promise<void>;
  /** Check if data saver mode is enabled */
  private _isDataSaverEnabled;
  /** Handle visibility changes from lit-virtualizer to trigger load more */
  private _handleVisibilityChanged;
  disconnectedCallback(): void;
  refreshTimeline(skipCache?: boolean): Promise<void>;
  loadMore(): Promise<void>;
  handleReplies(data: Array<Post>): void;
  showImage(imageURL: string): Promise<void>;
  showAnalyze(
    data: AnalyzeData,
    imageData: ImageAnalyzeData | null,
    tweet: Post
  ): Promise<void>;
  changeTimelineType(
    type: 'home' | 'public' | 'media' | 'for you' | 'home and some trending'
  ): Promise<void>;
  handleSummary($event: CustomEvent<HandleSummaryDetail>): void;
  handleTranslating($event: CustomEvent<HandleTranslatingDetail>): void;
  handleOpen(tweet: Post): void;
  render(): import('lit-html').TemplateResult<1>;
}
export {};
