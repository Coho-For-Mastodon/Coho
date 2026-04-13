import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  getPreviewTimeline,
  enrichPostsWithReplyContext,
  groupSelfThreads,
  getPaginatedHomeTimeline,
  mixTimeline,
  prefetchNextPage,
  resetLastPageID,
} from '../services/timeline';
import { Post } from '../interfaces/Post';

import { filterTimelinePosts } from '../services/filters';
import { spinAnimation } from '../styles/animations';
import type { FilterContext } from '../mastodon/types';

import type {
  RepliesDetail,
  HandleSummaryDetail,
  HandleTranslatingDetail,
  OpenPostDetail,
  AnalyzeEventDetail,
  OpenImageDetail,
} from '../types/events';

import { shouldDisableVirtualScroll } from '../utils/browser';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

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
import '@lit-labs/virtualizer';
import { VisibilityChangedEvent } from '@lit-labs/virtualizer';
import type { RenderItemFunction } from '@lit-labs/virtualizer/virtualize.js';

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

  // Bound render function for lit-virtualizer
  private _renderTimelineItem: RenderItemFunction<Post> = (
    tweet: Post,
    index: number
  ) => {
    const isLastItem = index === this.timeline.length - 1;
    const filterTitles = (tweet as Post & { _filterTitles?: string[] })
      ._filterTitles;
    return html`<li class="timeline-list-item">
      <timeline-item
        @open="${($event: CustomEvent) => this.handleOpen($event.detail.tweet)}"
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
      ${isLastItem
        ? html`<div id="load-more-indicator">
            <md-icon src="/assets/refresh-circle-outline.svg"></md-icon>
            <span>Loading more...</span>
          </div>`
        : null}
    </li>`;
  };

  // Cached element references for pull-to-refresh performance
  private _refreshIndicator: HTMLElement | null = null;
  private _refreshIcon: HTMLElement | null = null;
  private _scrollContainer: HTMLElement | null = null;
  private _observer: IntersectionObserver | null = null;
  private _rafId: number | null = null;
  private _pullToRefreshSetup: boolean = false;

  @property({ type: String }) timelineType:
    | 'home'
    | 'local'
    | 'federated'
    | 'media'
    | 'for you'
    | 'home and some trending'
    | `list:${string}` = 'home';

  @property({ type: Boolean }) guestMode: boolean = false;

  @property({ type: Array }) data: Post[] | undefined;
  @property({ type: Boolean }) header: boolean = true;
  @property({ type: Boolean }) autoLoad: boolean = true;
  @property({ type: Array }) lists: Array<{ id: string; title: string }> = [];

  private get _filterContext(): FilterContext {
    switch (this.timelineType) {
      case 'home':
      case 'for you':
      case 'home and some trending':
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
      case 'for you':
        return 'For You';
      case 'home and some trending':
        return 'Home & Trending';
      default:
        return 'Timeline';
    }
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('data') && this.data) {
      this.timeline = this.data;
    }
  }

  static styles = [
    spinAnimation,
    css`
      :host {
        display: block;
        height: 100%;
      }

      md-dialog::part(base) {
        z-index: 99999;
      }

      #mainList li {
        width: 100%;
      }

      timeline-item {
        margin-bottom: 16px;
      }

      #list-actions {
        display: none;
        margin-bottom: 12px;

        background: var(--sl-panel-background-color);
        padding: 8px;
        border-radius: var(--md-sys-shape-corner-extra-small);

        align-items: center;
        justify-content: space-between;
      }

      md-button {
        border: none;
      }

      #timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        gap: 12px;
      }

      #timeline-header md-select {
        flex: 1;
        max-width: 300px;
      }

      @media (prefers-color-scheme: dark) {
        md-button::part(control) {
          --neutral-fill-rest: #242428;
          --netural-fill-stealth-active: #242428;
          color: white;
          border: none;
        }
      }

      #learn-more-header {
        padding-top: 0;
        margin-top: 0;
      }

      lit-virtualizer,
      .scroller-fallback {
        display: block;
        border-radius: var(--md-sys-shape-corner-small);
        margin: 0;
        padding: 0;
        list-style: none;

        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior-y: contain;
      }

      .timeline-list-item {
        margin-bottom: 0px;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        list-style: none;
      }

      #load-more {
        margin: 16px auto;
        display: block;
      }

      sl-card {
        --padding: 10px;
      }

      li {
        animation-name: fadein;
        animation-duration: 0.3s;
      }

      .header-block {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .header-block img {
        height: 62px;
        border-radius: var(--md-sys-shape-corner-circle);
      }

      .header-block h4 {
        margin-bottom: 0;
      }

      .actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .fake md-skeleton {
        height: 302px;
      }

      .fake {
        margin-bottom: 8px;
        animation-name: fadein;
        animation-duration: 0.3s;
      }

      #analyze ul {
        max-height: 200px;
        max-width: 390px;
        height: initial;
      }

      #analyze ul li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        background: var(--primary-color);
        border-radius: var(--md-sys-shape-corner-small);
        padding: 8px;
      }

      #analyze::part(panel) {
        --width: 90vw;
        height: 90vh;
      }

      #analyze::part(body) {
        display: grid;
        grid-template-columns: 29% 69%;
        gap: 16px;
      }

      #analyze timeline-item::part(image) {
        height: 200px;
      }

      #analyze timeline-item {
        overflow: hidden;
      }

      ul {
        overscroll-behavior-y: contain;
        position: relative;
      }

      #refresh-indicator {
        height: 0;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        z-index: 100;
        position: relative;
      }

      #refresh-indicator .indicator-container {
        width: 48px;
        height: 48px;
        border-radius: var(--md-sys-shape-corner-circle);
        background: var(
          --md-sys-color-surface-container-highest,
          rgba(128, 128, 128, 0.15)
        );
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transform: scale(0.5);
        transition:
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          opacity 0.3s ease;
      }

      #refresh-indicator md-icon {
        width: 24px;
        height: 24px;
        font-size: 24px;
        color: var(--md-sys-color-primary);
      }

      #refresh-indicator.refreshing {
        height: 60px;
      }

      #refresh-indicator.refreshing .indicator-container {
        transform: scale(1);
        opacity: 1;
      }

      #refresh-indicator.refreshing md-icon {
        animation: spin 1.4s ease-in-out infinite;
      }

      @media (max-width: 820px) {
        lit-virtualizer {
          height: 85vh;
        }

        #timeline-header md-select {
          max-width: 100%;
        }

        #refresh-manual-button {
          display: none;
        }
      }

      @keyframes fadein {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }

      .timeline-title {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 20px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
        margin-left: -8px;
        border-radius: var(--md-sys-shape-corner-small);
        transition: background-color 0.2s;
        user-select: none;
        color: var(--md-sys-color-on-surface);
      }

      .timeline-title:hover {
        background: var(
          --md-sys-color-surface-container-high,
          rgba(128, 128, 128, 0.1)
        );
      }

      .timeline-title svg {
        width: 24px;
        height: 24px;
        fill: var(--md-sys-color-on-surface-variant);
      }

      md-menu {
        min-width: 200px;
      }

      #load-more-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 24px 16px;
        gap: 8px;
        color: var(--md-sys-color-on-surface-variant, #666);
        font-size: 14px;
      }

      #load-more-indicator md-icon {
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
        color: var(--md-sys-color-primary);
      }

      #new-posts-button {
        position: sticky;
        top: 0;
        z-index: 50;
        display: flex;
        justify-content: center;
        padding: 8px 0;
        animation: slideDown 0.3s ease-out;
      }

      #new-posts-button md-button {
        --md-sys-color-primary: var(--md-sys-color-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ];

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
    this._observer?.disconnect();
    this._cleanupKeyboardNavigation();

    if (!this.autoLoad) {
      return;
    }

    // Save timeline to cache when navigating away
    if (this.timeline.length > 0) {
      console.log('Saving timeline to cache on disconnect');
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
    // Dynamically import hotkeys-js to reduce initial bundle size
    const { default: hotkeys } = await import('hotkeys-js');
    this._hotkeys = hotkeys;

    // Set up j/k navigation with a specific scope for this timeline
    hotkeys('j,k', this._keyboardScope, (event, handler) => {
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
    hotkeys.setScope(this._keyboardScope);

    // Listen for refresh timeline event
    window.addEventListener('refresh-timeline', this._handleRefreshEvent);
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
    const virtualizer = this.shadowRoot?.querySelector(
      'lit-virtualizer'
    ) as HTMLElement & {
      scrollToIndex?: (index: number, position?: string) => void;
    };

    if (virtualizer?.scrollToIndex) {
      virtualizer.scrollToIndex(this.focusedIndex, 'center');
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

    if (shouldDisableVirtualScroll()) {
      this._setupInfiniteScroll();
    }

    // Setup pull-to-refresh when virtualizer becomes available
    if (
      !this._pullToRefreshSetup &&
      !this.loadingData &&
      this.timeline.length > 0
    ) {
      this._setupPullToRefresh();
    }
  }

  private _setupInfiniteScroll() {
    const trigger = this.shadowRoot?.querySelector('#infinite-scroll-trigger');
    const root = this.shadowRoot?.querySelector('.scroller-fallback');

    if (!trigger || !root) return;

    if (!this._observer) {
      this._observer = createIntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingData &&
            this.timeline.length > 0
          ) {
            this.loadMore();
          }
        },
        {
          root: root,
          rootMargin: '500px',
          threshold: 0,
        }
      );
    }

    // Always re-observe to ensure we're tracking the correct element
    disconnectIntersectionObserver(this._observer);
    this._observer.observe(trigger);
  }

  private async _setupPullToRefresh() {
    // Prevent duplicate setup
    if (this._pullToRefreshSetup) return;

    // Wait for lit-virtualizer to render
    await this.updateComplete;

    // Additional wait to ensure virtualizer is ready
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // lit-virtualizer with scroller attribute is itself the scroll container
    const scrollContainer = this.shadowRoot?.querySelector(
      shouldDisableVirtualScroll() ? '.scroller-fallback' : 'lit-virtualizer'
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
        shouldDisableVirtualScroll() ? '.scroller-fallback' : 'lit-virtualizer'
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

    // In guest mode, don't override the timeline type set by the parent component
    // (the parent forces 'federated' which is the only valid type for unauthenticated users)
    if (!this.guestMode) {
      const { get } = await import('idb-keyval');
      const savedTimelineType = await get('timelineType');

      console.log('saved timeline type', savedTimelineType);

      if (savedTimelineType) {
        const migratedTimelineType =
          savedTimelineType === 'public' ? 'federated' : savedTimelineType;
        this.timelineType = migratedTimelineType;
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
      console.log('Restoring timeline from cache');
      this.timeline = cachedTimeline.data;
      this.loadingData = false;

      // Restore scroll position after render
      await this.updateComplete;
      requestAnimationFrame(() => {
        const virtualizer = this.shadowRoot?.querySelector(
          'lit-virtualizer'
        ) as HTMLElement;
        if (virtualizer && cachedTimeline.scrollPosition > 0) {
          virtualizer.scrollTop = cachedTimeline.scrollPosition;
          console.log(
            'Restored scroll position:',
            cachedTimeline.scrollPosition
          );
        }
      });

      // Background check for new posts (stale-while-revalidate)
      this.checkForNewPosts();
    } else {
      // No cache, fetch fresh data
      console.log('No cache found, fetching fresh timeline');
      await this.refreshTimeline();
    }

    // Setup scroll position tracking for caching
    window.requestIdleCallback(
      async () => {
        const virtualizer = this.shadowRoot?.querySelector(
          'lit-virtualizer'
        ) as HTMLElement;

        if (!virtualizer) {
          console.warn('Virtualizer not found');
          return;
        }

        // Track scroll position for caching
        let scrollTimeout: number;
        virtualizer.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = window.setTimeout(async () => {
            this.lastScrollPosition = virtualizer.scrollTop;

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

  /** Check if data saver mode is enabled */
  private _isDataSaverEnabled(): boolean {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection;
    return connection?.saveData === true;
  }

  /** Handle visibility changes from lit-virtualizer to trigger load more */
  private async _handleVisibilityChanged(e: VisibilityChangedEvent) {
    if (!this.autoLoad) {
      return;
    }

    // Skip all pagination work while a refresh is in flight
    if (this.isRefreshing) {
      return;
    }

    const { last } = e;

    // Prefetch at 15 items from end (home timeline only, skip if data saver enabled)
    if (
      last >= this.timeline.length - 15 &&
      this.timeline.length > 0 &&
      this.timelineType === 'home' &&
      !this._isDataSaverEnabled()
    ) {
      const lastPostId = this.timeline[this.timeline.length - 1].id;
      if (!this._prefetchedIds.has(lastPostId)) {
        this._prefetchedIds.add(lastPostId);
        prefetchNextPage(lastPostId, 'home');
      }
    }

    // Load more when we're close to the end
    if (
      last >= this.timeline.length - 5 &&
      !this.loadingData &&
      this.timeline.length > 0
    ) {
      // Set flag immediately to prevent concurrent loads
      this.loadingData = true;

      try {
        await this.loadMore();
      } finally {
        this.loadingData = false;
      }
    }
  }

  public async refreshTimeline(skipCache: boolean = true) {
    if (!this.autoLoad) {
      return;
    }

    // Guard against concurrent loads during refresh
    this.isRefreshing = true;
    this.loadingData = true;

    try {
      await this._doRefreshTimeline(skipCache);
    } finally {
      this.isRefreshing = false;
      this.loadingData = false;
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

    console.log('refreshing timeline', this.timelineType);

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
      case 'for you':
      case 'home and some trending':
        return mixTimeline('home');
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
      case 'for you':
      case 'home and some trending':
      case 'media':
        timelineData = await getPaginatedHomeTimeline(
          this.timelineType ? this.timelineType : 'home',
          lastPostId
        );
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
    console.log('Checking for new posts in background...');

    try {
      let freshPosts: Post[] = [];

      // Fetch fresh data based on timeline type
      switch (this.timelineType) {
        case 'for you':
        case 'home and some trending': {
          freshPosts = await mixTimeline('home');
          break;
        }
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
        console.log(`Found ${enrichedNewPosts.length} new posts`);
      } else {
        console.log('No new posts found');
      }
    } catch (error) {
      // Silently fail - user still has cached content
      console.log(
        'Background check for new posts failed (likely offline):',
        error
      );
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
    const virtualizer = this.shadowRoot?.querySelector(
      'lit-virtualizer'
    ) as HTMLElement;
    if (virtualizer) {
      virtualizer.scrollTop = 0;
    }

    // Prepend new posts to timeline
    this.timeline = [...this.pendingNewPosts, ...this.timeline];
    this.pendingNewPosts = [];

    // Update cache with new data
    const { saveTimelineCache } = await import('../services/timeline-cache');
    saveTimelineCache(this.timelineType, this.timeline, 0);

    console.log(
      'Showed pending posts, timeline now has',
      this.timeline.length,
      'posts'
    );
  }

  handleReplies(data: Array<Post>) {
    console.log('reply', data);

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
    console.log('show image', imageURL);
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
    type:
      | 'home'
      | 'local'
      | 'federated'
      | 'media'
      | 'for you'
      | 'home and some trending'
      | `list:${string}`
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
      ${this.header
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
                <md-menu-item @click="${() => this.changeTimelineType('home')}">
                  Home
                </md-menu-item>
                <md-menu-item
                  @click="${() => this.changeTimelineType('for you')}"
                >
                  For You
                </md-menu-item>
                <md-menu-item
                  @click="${() =>
                    this.changeTimelineType('home and some trending')}"
                >
                  Home & Trending
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
                ${!this.guestMode
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
                      ${this.lists.length
                        ? html`<md-divider></md-divider>`
                        : null}
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
                  : null}
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
        : null}

      <div id="refresh-indicator">
        <div class="indicator-container">
          <md-icon src="/assets/loading-indicator.svg"></md-icon>
        </div>
      </div>

      ${this.pendingNewPosts.length > 0
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
        : null}
      ${this.loadingData && this.timeline.length === 0
        ? html`<md-skeleton-card count="5"></md-skeleton-card>`
        : shouldDisableVirtualScroll()
          ? html`
              <ul
                id="mainList"
                part="list"
                class="scroller-fallback scrollbar-hidden"
              >
                ${this.timeline.map((item, index) =>
                  this._renderTimelineItem(item, index)
                )}
                <li
                  id="infinite-scroll-trigger"
                  style="height: 1px; list-style: none;"
                ></li>
                ${this.loadingData
                  ? html`<li id="load-more-indicator" style="list-style: none;">
                      <md-icon src="/assets/loading-indicator.svg"></md-icon>
                      Loading more...
                    </li>`
                  : null}
              </ul>
            `
          : html`
              <lit-virtualizer
                id="mainList"
                part="list"
                class="scrollbar-hidden"
                role="list"
                scroller
                .items=${this.timeline}
                .renderItem=${this._renderTimelineItem}
                @visibilityChanged=${this._handleVisibilityChanged}
              >
              </lit-virtualizer>
            `}
    `;
  }
}
