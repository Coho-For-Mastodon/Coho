import { LitElement, html, PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  getPreviewTimeline,
  enrichPostsWithReplyContext,
  groupSelfThreads,
  getPaginatedHomeTimeline,
  prefetchNextPage,
  resetLastPageID,
} from '../services/timeline';
import {
  isSlowConnection,
  getNetworkQuality,
  onNetworkQualityChange,
} from '../utils/network-monitor';
import { Post } from '../interfaces/Post';

import { filterTimelinePosts } from '../services/filters';
import { spinAnimation } from '../styles/animations';
import { timelineStyles } from '../styles/timeline-styles';
import type { FilterContext } from '../mastodon/types';

import type {
  RepliesDetail,
  HandleSummaryDetail,
  HandleTranslatingDetail,
  OpenPostDetail,
  AnalyzeEventDetail,
  OpenImageDetail,
} from '../types/events';

import { createIntersectionObserver } from '../utils/intersection-observer';

// Keyboard navigation handler - dynamically imported to reduce initial bundle
import type { default as HotkeysType } from 'hotkeys-js';

// Types for analyze feature
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

import '../components/md/md-icon';
import '../components/md/md-skeleton-card';

import '../components/timeline-item';

// Lazy-loaded MD3 components: only needed on user interaction
let _headerComponentsLoaded = false;
let _dialogComponentsLoaded = false;

function ensureHeaderComponents(): void {
  if (!_headerComponentsLoaded) {
    _headerComponentsLoaded = true;
    import('../components/md/md-dropdown');
    import('../components/md/md-menu');
    import('../components/md/md-menu-item');
    import('../components/md/md-divider');
  }
}

function ensureDialogComponents(): void {
  if (!_dialogComponentsLoaded) {
    _dialogComponentsLoaded = true;
    import('../components/md/md-dialog');
    import('../components/md/md-button');
  }
}

import { router } from '../router/routes';

@customElement('app-timeline')
export class Timeline extends LitElement {
  @state() timeline: Post[] = [];
  @state() loadingData: boolean = false;
  @state() lastScrollPosition: number = 0;

  @state() analyzeData: AnalyzeEntity[] | null = null;
  @state() imageDesc: string | undefined = undefined;
  @state() analyzeTweet: Post | null = null;

  @state() isRefreshing: boolean = false;
  @state() pendingNewPosts: Post[] = [];
  @state() isCheckingForNewPosts: boolean = false;

  // Keyboard navigation state
  @state() focusedIndex: number = -1;

  private _pullStartY: number = 0;
  private _isPulling: boolean = false;
  private _pullDistance: number = 0;
  private _threshold: number = 80;
  private _hapticTriggered: boolean = false;
  private _prefetchedIds = new Set<string>();

  // Bound render function for timeline list
  private _renderTimelineItem: (tweet: Post, index: number) => TemplateResult =
    (tweet: Post, index: number) => {
      const filterTitles = (tweet as Post & { _filterTitles?: string[] })
        ._filterTitles;
      return html`<li class="timeline-list-item">
        <timeline-item
          @open="${($event: CustomEvent) =>
            this.handleOpen($event.detail.tweet)}"
          @summarize="${($event: CustomEvent<HandleSummaryDetail>) =>
            this.handleSummary($event)}"
          @translating="${($event: CustomEvent<HandleTranslatingDetail>) =>
            this.handleTranslating($event)}"
          tweetID="${tweet.id}"
          @delete="${() => this.refreshTimeline()}"
          @edit="${($event: CustomEvent<{ tweet: Post }>) =>
            this.handleEdit($event.detail.tweet)}"
          @analyze="${($event: CustomEvent<AnalyzeEventDetail>) =>
            this.showAnalyze(
              $event.detail.data as AnalyzeData,
              $event.detail.imageData as ImageAnalyzeData | null,
              $event.detail.tweet
            )}"
          @openimage="${($event: CustomEvent<OpenImageDetail>) =>
            this.showImage($event.detail.imageURL)}"
          ?show="${true}"
          ?guestMode="${this.guestMode}"
          ?focused="${index === this.focusedIndex}"
          tabindex="${index === this.focusedIndex ? '0' : '-1'}"
          @replies="${($event: CustomEvent<RepliesDetail>) =>
            this.handleReplies($event.detail.data)}"
          .tweet="${tweet}"
          .filterTitles="${filterTitles ?? []}"
        ></timeline-item>

        <div class="line-divider"></div>
      </li>`;
    };

  // Cached element references for pull-to-refresh performance
  private _refreshIndicator: HTMLElement | null = null;
  private _refreshIcon: HTMLElement | null = null;
  private _scrollContainer: HTMLElement | null = null;
  private _observer: IntersectionObserver | null = null;
  private _observerRootMargin = '';
  private _unsubscribeNetworkQuality: (() => void) | null = null;
  private _rafId: number | null = null;
  private _pullToRefreshSetup: boolean = false;

  @property({ type: String }) timelineType:
    'home' | 'local' | 'federated' | 'media' | `list:${string}` = 'home';

  @property({ type: Boolean }) guestMode: boolean = false;

  @property({ type: Array }) data: Post[] | undefined;
  @property({ type: Boolean }) header: boolean = true;
  @property({ type: Boolean }) autoLoad: boolean = true;
  @property({ type: Array }) lists: Array<{ id: string; title: string }> = [];

  private get _filterContext(): FilterContext {
    switch (this.timelineType) {
      case 'home':
      case 'media':
        return 'home';
      case 'local':
      case 'federated':
        return 'public';
      default:
        if (this.timelineType.startsWith('list:')) return 'home';
        return 'home';
    }
  }

  get timelineTitle() {
    if (this.timelineType.startsWith('list:')) {
      const listId = this.timelineType.split(':')[1];
      const match = this.lists.find((list) => list.id === listId);
      if (match) {
        return match.title;
      }
      return 'List';
    }

    switch (this.timelineType) {
      case 'home':
        return 'Home';
      case 'local':
        return 'Local';
      case 'federated':
        return 'Federated';
      case 'media':
        return 'Media';
      default:
        return 'Timeline';
    }
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('data') && this.data) {
      this.timeline = this.data;
    }
  }

  static styles = [spinAnimation, timelineStyles];

  firstUpdated() {
    // Pull-to-refresh setup moved to updated() to handle conditional rendering
    this._setupKeyboardNavigation();

    // Lazy-load header dropdown components if header is shown
    if (this.header) {
      ensureHeaderComponents();
    }
  }

  async disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeNetworkQuality?.();
    this._unsubscribeNetworkQuality = null;
    this._observer?.disconnect();
    this._cleanupKeyboardNavigation();

    if (!this.autoLoad) {
      return;
    }

    // Save timeline to cache when navigating away
    if (this.timeline.length > 0) {
      const { saveTimelineCache } = await import('../services/timeline-cache');
      saveTimelineCache(
        this.timelineType,
        this.timeline,
        this.lastScrollPosition
      );
    }
  }

  // Keyboard navigation methods
  private _keyboardScope = 'timeline';
  private _hotkeys: typeof HotkeysType | null = null;

  private async _setupKeyboardNavigation() {
    // load only on first keyboard interaction to reduce initial bundle size, since this is not critical for first paint and may not be used by all users
    window.addEventListener(
      'keydown',
      async () => {
        if (!this._hotkeys) {
          const { default: hotkeys } = await import('hotkeys-js');
          this._hotkeys = hotkeys;

          // Set up j/k navigation with a specific scope for this timeline
          this._hotkeys!('j,k', this._keyboardScope, (event, handler) => {
            // Only handle if this timeline is visible/active
            if (!this.isConnected || this.timeline.length === 0) return;

            event.preventDefault();

            if (handler.key === 'j') {
              this._navigateToNextPost();
            } else if (handler.key === 'k') {
              this._navigateToPreviousPost();
            }
          });

          // Set scope to allow timeline navigation
          this._hotkeys!.setScope(this._keyboardScope);

          // Listen for refresh timeline event
          window.addEventListener('refresh-timeline', this._handleRefreshEvent);
        }
      },
      { once: true }
    );
  }

  private _handleRefreshEvent = async () => {
    if (this.isConnected && this.autoLoad) {
      const { clearTimelineCache } = await import('../services/timeline-cache');
      clearTimelineCache(this.timelineType);
      this.refreshTimeline(true);
    }
  };

  private _cleanupKeyboardNavigation() {
    this._hotkeys?.unbind('j,k', this._keyboardScope);
    window.removeEventListener('refresh-timeline', this._handleRefreshEvent);
  }

  private _navigateToNextPost() {
    const maxIndex = this.timeline.length - 1;
    if (this.focusedIndex < maxIndex) {
      this.focusedIndex++;
      this._scrollToFocusedPost();
      this._dispatchFocusEvent();
    }
  }

  private _navigateToPreviousPost() {
    if (this.focusedIndex > 0) {
      this.focusedIndex--;
      this._scrollToFocusedPost();
      this._dispatchFocusEvent();
    } else if (this.focusedIndex === -1 && this.timeline.length > 0) {
      // If nothing focused yet, focus first item
      this.focusedIndex = 0;
      this._scrollToFocusedPost();
      this._dispatchFocusEvent();
    }
  }

  private _scrollToFocusedPost() {
    const list = this.shadowRoot?.querySelector('#mainList');
    const items = list?.querySelectorAll('.timeline-list-item');
    const target = items?.[this.focusedIndex];
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    // Also update the focused timeline-item
    this._updateFocusedItem();
  }

  private _updateFocusedItem() {
    // Remove focus from all items
    const items = this.shadowRoot?.querySelectorAll('timeline-item');
    items?.forEach((item, index) => {
      if (index === this.focusedIndex) {
        item.setAttribute('focused', '');
        item.setAttribute('tabindex', '0');
        (item as HTMLElement).focus();
      } else {
        item.removeAttribute('focused');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  private _dispatchFocusEvent() {
    const focusedPost = this.timeline[this.focusedIndex];
    if (focusedPost) {
      this.dispatchEvent(
        new CustomEvent('post-focused', {
          detail: { post: focusedPost, index: this.focusedIndex },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /** Get the currently focused post */
  public getFocusedPost(): Post | null {
    return this.focusedIndex >= 0 ? this.timeline[this.focusedIndex] : null;
  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('timeline')) {
      this._setupInfiniteScroll();
    }

    // Setup pull-to-refresh when list becomes available
    if (
      !this._pullToRefreshSetup &&
      !this.loadingData &&
      this.timeline.length > 0
    ) {
      this._setupPullToRefresh();
    }
  }

  private _hasMorePosts = true;

  private _getInfiniteScrollRootMargin(): string {
    const quality = getNetworkQuality();

    if (quality === 'slow') return '900px';
    if (quality === 'medium') return '700px';
    return '400px';
  }

  private _setupInfiniteScroll() {
    if (!this.autoLoad) return;
    const root = this.shadowRoot?.querySelector('#mainList');
    if (!root) {
      // Disconnect observer when scroll container is gone (e.g. skeleton shown during refresh).
      // The <ul> may be recreated as a new DOM element, so the observer's root would be stale.
      this._observer?.disconnect();
      this._observer = null;
      return;
    }

    const items = root.querySelectorAll('.timeline-list-item');
    const lastItem = items[items.length - 1];
    if (!lastItem) {
      // Disconnect observer when timeline is empty to prevent stale state
      this._observer?.disconnect();
      this._observer = null;
      return;
    }

    const nextRootMargin = this._getInfiniteScrollRootMargin();

    if (!this._observer || this._observerRootMargin !== nextRootMargin) {
      this._observer?.disconnect();
      this._observer = createIntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingData &&
            this._hasMorePosts &&
            this.timeline.length > 0
          ) {
            // Prefetch next page for home timeline
            if (this.timelineType === 'home' && !this._isDataSaverEnabled()) {
              const lastPostId = this.timeline[this.timeline.length - 1].id;
              if (!this._prefetchedIds.has(lastPostId)) {
                this._prefetchedIds.add(lastPostId);
                prefetchNextPage(lastPostId, 'home');
              }
            }

            const prevCount = this.timeline.length;
            this.loadingData = true;
            this.loadMore()
              .then(() => {
                if (this.timeline.length === prevCount) {
                  this._hasMorePosts = false;
                }
              })
              .catch((error) => {
                console.error('Failed to load more timeline posts', error);
              })
              .finally(() => {
                this.loadingData = false;
              });
          }
        },
        {
          root: root,
          rootMargin: nextRootMargin,
          threshold: 0,
        }
      );
      this._observerRootMargin = nextRootMargin;
    }

    // Re-observe the current last item after each render
    this._observer.disconnect();
    this._observer.observe(lastItem);
  }

  private async _setupPullToRefresh() {
    // Prevent duplicate setup
    if (this._pullToRefreshSetup) return;

    // Wait for list to render
    await this.updateComplete;

    // Additional wait to ensure list is ready
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const scrollContainer = this.shadowRoot?.querySelector(
      '#mainList'
    ) as HTMLElement;

    if (scrollContainer) {
      // Clear cached reference to ensure fresh lookup
      this._scrollContainer = scrollContainer;

      scrollContainer.addEventListener(
        'touchstart',
        this._handleTouchStart.bind(this),
        { passive: true }
      );
      scrollContainer.addEventListener(
        'touchmove',
        this._handleTouchMove.bind(this),
        { passive: false }
      );
      scrollContainer.addEventListener(
        'touchend',
        this._handleTouchEnd.bind(this),
        { passive: true }
      );

      this._pullToRefreshSetup = true;
    }
  }

  private _getScrollContainer(): HTMLElement | null {
    if (!this._scrollContainer) {
      this._scrollContainer = this.shadowRoot?.querySelector(
        '#mainList'
      ) as HTMLElement;
    }
    return this._scrollContainer;
  }

  private _getRefreshIndicator(): HTMLElement | null {
    if (!this._refreshIndicator) {
      this._refreshIndicator = this.shadowRoot?.querySelector(
        '#refresh-indicator'
      ) as HTMLElement;
    }
    return this._refreshIndicator;
  }

  private _getRefreshIcon(): HTMLElement | null {
    if (!this._refreshIcon) {
      this._refreshIcon = this._getRefreshIndicator()?.querySelector(
        '.indicator-container'
      ) as HTMLElement;
    }
    return this._refreshIcon;
  }

  private _getRefreshIconInner(): HTMLElement | null {
    return this._getRefreshIndicator()?.querySelector('md-icon') as HTMLElement;
  }

  _handleTouchStart(e: TouchEvent) {
    if (!this.autoLoad) {
      return;
    }

    const scrollContainer = this._getScrollContainer();
    if (!scrollContainer) {
      this._isPulling = false;
      return;
    }

    const scrollTop = scrollContainer.scrollTop;

    // ONLY allow pull-to-refresh if we're at the very top (scrollTop <= 1 for tolerance)
    if (scrollTop <= 1) {
      this._pullStartY = e.touches[0].clientY;
      this._isPulling = true;
    } else {
      // Not at top - do not enable pull-to-refresh
      this._isPulling = false;
    }
  }

  _handleTouchMove(e: TouchEvent) {
    const scrollContainer = this._getScrollContainer();
    if (!scrollContainer) return;

    const scrollTop = scrollContainer.scrollTop;

    // If not at top, never do pull-to-refresh
    if (scrollTop > 1) {
      this._isPulling = false;
      this._pullDistance = 0;
      return;
    }

    // If we didn't start the pull gesture, ignore
    if (!this._isPulling) return;

    const y = e.touches[0].clientY;
    const deltaY = y - this._pullStartY;

    // Only trigger pull-to-refresh if pulling DOWN (positive deltaY)
    if (deltaY > 0) {
      // Prevent default scroll behavior when pulling down at top
      if (e.cancelable) e.preventDefault();

      this._pullDistance = deltaY * 0.5;

      // Use requestAnimationFrame for smooth, batched DOM updates
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }

      this._rafId = requestAnimationFrame(() => {
        const indicator = this._getRefreshIndicator();
        const container = this._getRefreshIcon();
        const icon = this._getRefreshIconInner();

        if (indicator) {
          indicator.style.height = `${Math.min(this._pullDistance, 150)}px`;
          indicator.style.transition = 'none';
        }

        if (container) {
          // Calculate progress (0 to 1)
          const progress = Math.min(this._pullDistance / this._threshold, 1);
          // Scale from 0.5 to 1 as you pull
          const scale = 0.5 + progress * 0.5;
          // Opacity from 0 to 1
          const opacity = progress;

          container.style.transition = 'none';
          container.style.transform = `scale(${scale})`;
          container.style.opacity = `${opacity}`;
        }

        if (icon) {
          // MD3-style: rotate multiple times as you pull (up to 540 degrees)
          const progress = Math.min(this._pullDistance / this._threshold, 1);
          const rotation = progress * 540;
          icon.style.transition = 'none';
          icon.style.transform = `rotate(${rotation}deg)`;
        }

        this._rafId = null;
      });

      if (this._pullDistance >= this._threshold && !this._hapticTriggered) {
        import('../utils/haptics').then(({ hapticImpact }) =>
          hapticImpact('medium')
        );
        this._hapticTriggered = true;
      } else if (this._pullDistance < this._threshold) {
        this._hapticTriggered = false;
      }
    } else {
      // User is scrolling up (negative deltaY) - cancel pull-to-refresh
      // and let normal scrolling happen
      this._isPulling = false;
      this._pullDistance = 0;
      const indicator = this._getRefreshIndicator();
      if (indicator) {
        indicator.style.height = '0px';
      }
    }
  }

  async _handleTouchEnd() {
    if (!this._isPulling) return;
    this._isPulling = false;
    this._hapticTriggered = false;

    // Cancel any pending animation frame
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    const indicator = this._getRefreshIndicator();
    const container = this._getRefreshIcon();
    const icon = this._getRefreshIconInner();

    // Re-enable transitions for smooth animation
    if (indicator) {
      indicator.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (container) {
      container.style.transition =
        'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
    }
    if (icon) {
      icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    if (this._pullDistance >= this._threshold) {
      if (indicator) indicator.classList.add('refreshing');

      // Reset height to fixed loading height
      if (indicator) indicator.style.height = '60px';
      if (container) {
        container.style.transform = 'scale(1)';
        container.style.opacity = '1';
      }
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
      }

      await this.refreshTimeline(true);

      if (indicator) {
        indicator.classList.remove('refreshing');
        indicator.style.height = '0px';
      }
      if (container) {
        container.style.transform = 'scale(0.5)';
        container.style.opacity = '0';
      }
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
      }
    } else {
      // Snap back animation - animate back to initial state
      if (indicator) indicator.style.height = '0px';
      if (container) {
        container.style.transform = 'scale(0.5)';
        container.style.opacity = '0';
      }
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
      }
    }

    this._pullDistance = 0;
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!this.autoLoad) {
      return;
    }

    this._unsubscribeNetworkQuality = onNetworkQualityChange(() => {
      this._setupInfiniteScroll();
    });

    // In guest mode, don't override the timeline type set by the parent component
    // (the parent forces 'federated' which is the only valid type for unauthenticated users)
    if (!this.guestMode) {
      const { get } = await import('idb-keyval');
      const savedTimelineType = await get('timelineType');

      if (savedTimelineType) {
        const legacyMap: Record<string, string> = {
          'public': 'federated',
          'for you': 'home',
          'home and some trending': 'home',
        };
        const migratedTimelineType =
          legacyMap[savedTimelineType] ?? savedTimelineType;
        this.timelineType = migratedTimelineType as typeof this.timelineType;
        if (migratedTimelineType !== savedTimelineType) {
          const { set } = await import('idb-keyval');
          await set('timelineType', migratedTimelineType);
        }
      }
    }

    // Check cache first
    const { getTimelineCache } = await import('../services/timeline-cache');
    const cachedTimeline = getTimelineCache(this.timelineType);
    if (cachedTimeline && cachedTimeline.data.length > 0) {
      this.timeline = cachedTimeline.data;
      this.loadingData = false;

      // Restore scroll position after render
      await this.updateComplete;
      requestAnimationFrame(() => {
        const list = this.shadowRoot?.querySelector('#mainList') as HTMLElement;
        if (list && cachedTimeline.scrollPosition > 0) {
          list.scrollTop = cachedTimeline.scrollPosition;
        }
      });

      // Background check for new posts (stale-while-revalidate)
      this.checkForNewPosts();
    } else {
      // No cache, fetch fresh data
      await this.refreshTimeline();
    }

    // Setup scroll position tracking for caching
    window.requestIdleCallback(
      async () => {
        const list = this.shadowRoot?.querySelector('#mainList') as HTMLElement;

        if (!list) {
          return;
        }

        // Track scroll position for caching
        let scrollTimeout: number;
        list.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = window.setTimeout(async () => {
            this.lastScrollPosition = list.scrollTop;

            const { updateCacheScrollPosition } =
              await import('../services/timeline-cache');
            updateCacheScrollPosition(
              this.timelineType,
              this.lastScrollPosition
            );
          }, 150);
        });
      },
      { timeout: 3000 }
    );
  }

  /** Check if connection is too slow for background prefetch */
  private _isDataSaverEnabled(): boolean {
    return isSlowConnection();
  }

  public async refreshTimeline(skipCache: boolean = true) {
    if (!this.autoLoad) {
      return;
    }

    // Guard against concurrent loads during refresh
    this.isRefreshing = true;
    this.loadingData = true;
    this._hasMorePosts = true;

    try {
      await this._doRefreshTimeline(skipCache);
    } finally {
      this.isRefreshing = false;
      this.loadingData = false;
      // Re-observe after loadingData clears so the observer fires correctly.
      // The observer may have fired during the refresh (while loadingData=true)
      // and skipped loadMore. Re-calling here re-triggers it if the last item
      // is still within the rootMargin.
      await this.updateComplete;
      this._setupInfiniteScroll();
    }
  }

  private async _doRefreshTimeline(skipCache: boolean) {
    // Clear any pending new posts since we're doing a full refresh
    this.pendingNewPosts = [];

    if (skipCache) {
      const { clearTimelineCache } = await import('../services/timeline-cache');
      clearTimelineCache(this.timelineType);
      await resetLastPageID(this.timelineType);
    }

    // Save current timeline data before refreshing
    if (!skipCache && this.timeline.length > 0) {
      const { saveTimelineCache } = await import('../services/timeline-cache');
      saveTimelineCache(
        this.timelineType,
        this.timeline,
        this.lastScrollPosition
      );
    }

    const rawPosts = await this._fetchTimelinePosts();
    if (rawPosts.length === 0) return;

    this.timeline = [];
    await this.updateComplete;

    // Deduplicate by post ID
    const uniquePosts = Array.from(
      new Map(rawPosts.map((post: Post) => [post.id, post])).values()
    ) as Post[];

    // Enrich posts with reply context and apply filters
    this.timeline = filterTimelinePosts(
      await enrichPostsWithReplyContext(groupSelfThreads(uniquePosts)),
      this._filterContext
    );

    // Save to cache after successful fetch
    const { saveTimelineCache } = await import('../services/timeline-cache');
    saveTimelineCache(this.timelineType, this.timeline, 0);

    this.requestUpdate();
  }

  /** Fetch raw posts for the current timeline type. */
  private async _fetchTimelinePosts(): Promise<Post[]> {
    switch (this.timelineType) {
      case 'home':
        return getPaginatedHomeTimeline('home');
      case 'local': {
        const { getPublicTimeline } = await import('../services/timeline');
        return getPublicTimeline(true);
      }
      case 'federated': {
        if (this.guestMode) return getPreviewTimeline();
        const { getPublicTimeline } = await import('../services/timeline');
        return getPublicTimeline(false);
      }
      case 'media': {
        const posts = await getPaginatedHomeTimeline('home');
        return posts.filter((post: Post) => post.media_attachments.length > 0);
      }
      default: {
        if (this.timelineType.startsWith('list:')) {
          const listId = this.timelineType.split(':')[1];
          const { getListTimeline } = await import('../services/lists');
          return getListTimeline(listId);
        }
        return [];
      }
    }
  }

  async loadMore() {
    // Don't attempt pagination during a refresh or with an empty timeline
    if (this.isRefreshing || this.timeline.length === 0) {
      return;
    }

    // Get the last post ID to use for pagination
    const lastPostId = this.timeline[this.timeline.length - 1].id;

    let timelineData: Post[] = [];
    switch (this.timelineType) {
      case 'home':
      case 'media':
        timelineData = await getPaginatedHomeTimeline('home', lastPostId);
        break;
      case 'local': {
        const { getPublicTimeline } = await import('../services/timeline');
        timelineData = await getPublicTimeline(true, lastPostId);
        break;
      }
      case 'federated': {
        if (this.guestMode) {
          timelineData = await getPreviewTimeline();
        } else {
          const { getPublicTimeline } = await import('../services/timeline');
          timelineData = await getPublicTimeline(false, lastPostId);
        }
        break;
      }
      default: {
        if (this.timelineType.startsWith('list:')) {
          const listId = this.timelineType.split(':')[1];
          const { getListTimeline } = await import('../services/lists');
          timelineData = await getListTimeline(listId, lastPostId);
          break;
        }
        timelineData = await getPaginatedHomeTimeline('home', lastPostId);
        break;
      }
    }

    // Deduplicate posts by ID to prevent showing duplicates
    const existingIds = new Set(this.timeline.map((post) => post.id));
    const newPosts = timelineData.filter((post) => !existingIds.has(post.id));

    if (newPosts.length === 0) {
      return;
    }

    // Enrich new posts with reply context and apply filters
    const enrichedNewPosts = filterTimelinePosts(
      await enrichPostsWithReplyContext(groupSelfThreads(newPosts)),
      this._filterContext
    );

    this.timeline = [...this.timeline, ...enrichedNewPosts];

    const { saveTimelineCache } = await import('../services/timeline-cache');
    // Update cache with new data
    saveTimelineCache(
      this.timelineType,
      this.timeline,
      this.lastScrollPosition
    );
  }

  /**
   * Check for new posts in the background without disrupting the user.
   * If new posts are found, store them in pendingNewPosts to show "X new posts" button.
   */
  private async checkForNewPosts() {
    if (this.isCheckingForNewPosts || this.timeline.length === 0) {
      return;
    }

    this.isCheckingForNewPosts = true;

    try {
      let freshPosts: Post[] = [];

      // Fetch fresh data based on timeline type
      switch (this.timelineType) {
        case 'home': {
          freshPosts = await getPaginatedHomeTimeline('home');
          break;
        }
        case 'local': {
          const { getPublicTimeline } = await import('../services/timeline');
          freshPosts = await getPublicTimeline(true);
          break;
        }
        case 'federated': {
          if (this.guestMode) {
            freshPosts = await getPreviewTimeline();
          } else {
            const { getPublicTimeline } = await import('../services/timeline');
            freshPosts = await getPublicTimeline(false);
          }
          break;
        }
        case 'media': {
          const mediaData = await getPaginatedHomeTimeline('home');
          freshPosts = mediaData.filter(
            (post: Post) => post.media_attachments.length > 0
          );
          break;
        }
        default: {
          if (this.timelineType.startsWith('list:')) {
            const listId = this.timelineType.split(':')[1];
            const { getListTimeline } = await import('../services/lists');
            freshPosts = await getListTimeline(listId);
          }
          break;
        }
      }

      if (freshPosts.length === 0) {
        return;
      }

      // Deduplicate fresh posts
      const uniqueFreshPosts = Array.from(
        new Map(freshPosts.map((post: Post) => [post.id, post])).values()
      ) as Post[];

      // Find posts that are newer than our current first post
      const currentFirstId = this.timeline[0]?.id;
      if (!currentFirstId) {
        return;
      }

      // Filter to only posts with IDs greater than our current first post
      // Mastodon IDs are Snowflake-like, so lexicographic comparison works for ordering
      const newPosts = uniqueFreshPosts.filter(
        (post) => post.id > currentFirstId
      );

      if (newPosts.length > 0) {
        // Enrich new posts with reply context
        const enrichedNewPosts = await enrichPostsWithReplyContext(
          groupSelfThreads(newPosts)
        );
        this.pendingNewPosts = enrichedNewPosts;
        // Ensure md-button is loaded before the "new posts" button renders
        ensureDialogComponents();
      }
    } catch {
      // Silently fail — user still has cached content
    } finally {
      this.isCheckingForNewPosts = false;
    }
  }

  /**
   * Show pending new posts by prepending them to the timeline.
   * Called when user clicks the "X new posts" button.
   */
  public async showPendingPosts() {
    if (this.pendingNewPosts.length === 0) {
      return;
    }

    // Scroll to top first
    const list = this.shadowRoot?.querySelector('#mainList') as HTMLElement;
    if (list) {
      list.scrollTop = 0;
    }

    // Prepend new posts to timeline
    this.timeline = [...this.pendingNewPosts, ...this.timeline];
    this.pendingNewPosts = [];

    // Update cache with new data
    const { saveTimelineCache } = await import('../services/timeline-cache');
    saveTimelineCache(this.timelineType, this.timeline, 0);
  }

  handleReplies(data: Array<Post>) {
    // fire custom event
    this.dispatchEvent(
      new CustomEvent<RepliesDetail>('replies', {
        detail: {
          data,
        },
      })
    );
  }

  async showImage(imageURL: string) {
    // Navigate - the router handles view transitions internally
    await router.navigate(`/home/img-preview?src=${imageURL}`);
  }

  async showAnalyze(
    data: AnalyzeData,
    imageData: ImageAnalyzeData | null,
    tweet: Post
  ) {
    // Ensure md-dialog and md-button are loaded before showing
    ensureDialogComponents();

    this.analyzeData = null;
    this.imageDesc = undefined;
    this.analyzeTweet = null;

    if (
      data.results &&
      data.results?.documents?.[0] &&
      data.results.documents[0].entities &&
      data.results.documents[0].entities?.length !== 0
    ) {
      this.analyzeData = data.results.documents[0].entities;
    }

    if (imageData?.descriptionResult?.values?.[0]) {
      this.imageDesc = imageData.descriptionResult.values[0].text;
    }

    this.analyzeTweet = tweet;

    const dialog = this.shadowRoot?.querySelector('#analyze') as HTMLElement & {
      show(): void;
    };
    dialog?.show();
  }

  async changeTimelineType(
    type: 'home' | 'local' | 'federated' | 'media' | `list:${string}`
  ) {
    this.timelineType = type;

    await this.refreshTimeline();

    this.requestUpdate();

    const { set } = await import('idb-keyval');

    await set('timelineType', type);
  }

  handleSummary($event: CustomEvent<HandleSummaryDetail>) {
    // keep passing it up
    this.dispatchEvent(
      new CustomEvent<HandleSummaryDetail>('handle-summary', {
        detail: {
          data: $event.detail.data,
        },
      })
    );
  }

  handleTranslating($event: CustomEvent<HandleTranslatingDetail>) {
    // keep passing it up
    this.dispatchEvent(
      new CustomEvent<HandleTranslatingDetail>('handle-translating', {
        detail: {
          tweet: $event.detail.tweet,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  handleOpen(tweet: Post) {
    this.dispatchEvent(
      new CustomEvent<OpenPostDetail>('open', {
        detail: {
          tweet,
        },
      })
    );
  }

  handleEdit(tweet: Post) {
    this.dispatchEvent(
      new CustomEvent('edit', {
        detail: { tweet },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      ${
        this.header
          ? html`<div id="timeline-header">
              <md-dropdown>
                <div slot="trigger" class="timeline-title">
                  <span>${this.timelineTitle}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7 10l5 5 5-5z" fill="currentColor" />
                  </svg>
                </div>

                <md-menu>
                  <md-menu-item
                    @click="${() => this.changeTimelineType('home')}"
                  >
                    Home
                  </md-menu-item>
                  <md-divider></md-divider>
                  <md-menu-item
                    @click="${() => this.changeTimelineType('local')}"
                  >
                    Local
                  </md-menu-item>
                  <md-menu-item
                    @click="${() => this.changeTimelineType('federated')}"
                  >
                    Federated
                  </md-menu-item>
                  ${
                    !this.guestMode
                      ? html`
                          <md-divider></md-divider>
                          ${this.lists.map(
                            (list) => html`
                              <md-menu-item
                                @click=${() =>
                                  this.changeTimelineType(`list:${list.id}`)}
                              >
                                ${list.title}
                              </md-menu-item>
                            `
                          )}
                          ${
                            this.lists.length
                              ? html`<md-divider></md-divider>`
                              : null
                          }
                          <md-menu-item
                            @click=${() =>
                              this.dispatchEvent(
                                new CustomEvent('manage-lists', {
                                  bubbles: true,
                                  composed: true,
                                })
                              )}
                          >
                            Manage lists...
                          </md-menu-item>
                        `
                      : null
                  }
                </md-menu>
              </md-dropdown>

              <md-icon-button
                id="refresh-manual-button"
                circle
                @click="${async () => {
                  const { clearTimelineCache } =
                    await import('../services/timeline-cache');
                  clearTimelineCache(this.timelineType);
                  this.refreshTimeline(true);
                }}"
              >
                <md-icon src="/assets/refresh-circle-outline.svg"></md-icon>
              </md-icon-button>
            </div>`
          : null
      }

      <div id="refresh-indicator">
        <div class="indicator-container">
          <md-icon src="/assets/loading-indicator.svg"></md-icon>
        </div>
      </div>

      ${
        this.pendingNewPosts.length > 0
          ? html`
              <div id="new-posts-button">
                <md-button
                  variant="filled"
                  @click="${() => this.showPendingPosts()}"
                >
                  <md-icon
                    slot="prefix"
                    src="/assets/arrow-up-outline.svg"
                  ></md-icon>
                  ${this.pendingNewPosts.length} new
                  post${this.pendingNewPosts.length === 1 ? '' : 's'}
                </md-button>
              </div>
            `
          : null
      }
      ${
        this.loadingData && this.timeline.length === 0
          ? html`<md-skeleton-card count="5"></md-skeleton-card>`
          : html`
              <ul
                id="mainList"
                part="list"
                class="scroller-fallback scrollbar-hidden"
                role="list"
              >
                ${this.timeline.map((item, index) =>
                  this._renderTimelineItem(item, index)
                )}
                ${
                  this.loadingData
                    ? html`<li
                        id="load-more-indicator"
                        style="list-style: none;"
                      >
                        <md-icon src="/assets/loading-indicator.svg"></md-icon>
                        Loading more...
                      </li>`
                    : null
                }
              </ul>
            `
      }
    `;
  }
}
