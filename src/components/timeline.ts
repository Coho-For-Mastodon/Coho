import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  getPreviewTimeline,
  enrichPostsWithReplyContext,
  getPaginatedHomeTimeline,
  mixTimeline,
  getLastPlaceTimeline,
} from '../services/timeline';
import { Post } from '../interfaces/Post';
import {
  saveTimelineCache,
  getTimelineCache,
  updateCacheScrollPosition,
  clearTimelineCache,
} from '../services/timeline-cache';

import type {
  RepliesDetail,
  HandleSummaryDetail,
  HandleTranslatingDetail,
  OpenPostDetail,
  AnalyzeEventDetail,
  OpenImageDetail,
} from '../types/events';

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

import '../components/md/md-dialog';
import '../components/md/md-button';
import '../components/md/md-icon';
import '../components/md/md-skeleton-card';
import '../components/md/md-divider';
import '@lit-labs/virtualizer';
import { VisibilityChangedEvent } from '@lit-labs/virtualizer';

import '../components/timeline-item';
import '../components/search';
import '../components/md/md-select';
import '../components/md/md-option';
import '../components/md/md-dropdown';
import '../components/md/md-menu';
import '../components/md/md-menu-item';

import { router } from '../utils/router';

@customElement('app-timeline')
export class Timeline extends LitElement {
  @state() timeline: Post[] = [];
  @state() loadingData: boolean = false;
  @state() lastScrollPosition: number = 0;

  @state() imgPreview: string | undefined = undefined;

  @state() analyzeData: AnalyzeEntity[] | null = null;
  @state() imageDesc: string | undefined = undefined;
  @state() analyzeTweet: Post | null = null;

  @state() isRefreshing: boolean = false;
  private _pullStartY: number = 0;
  private _isPulling: boolean = false;
  private _pullDistance: number = 0;
  private _threshold: number = 80;
  private _hapticTriggered: boolean = false;

  @property({ type: String }) timelineType:
    | 'home'
    | 'public'
    | 'media'
    | 'for you'
    | 'home and some trending' = 'home';

  @property({ type: Array }) data: Post[] | undefined;
  @property({ type: Boolean }) header: boolean = true;
  @property({ type: Boolean }) autoLoad: boolean = true;

  get timelineTitle() {
    switch (this.timelineType) {
      case 'home':
        return 'Home';
      case 'public':
        return 'Public';
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
        border-radius: 4px;

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

      #img-preview {
        --width: 80vw;
      }

      #img-preview::part(panel) {
        height: 90vh;
      }

      #img-preview img {
        width: 100%;
        height: max-content;
        border-radius: 6px;
      }

      lit-virtualizer {
        display: block;
        border-radius: 6px;
        margin: 0;
        padding: 0;

        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior-y: contain;
      }

      .timeline-list-item {
        margin-bottom: 0px;
        width: 100%;
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
        border-radius: 50%;
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
        border-radius: 6px;
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
        transition: height 0.2s ease;
        flex-shrink: 0;
        z-index: 100;
        position: relative;
      }

      #refresh-indicator md-icon {
        transform: rotate(0deg);
        transition: transform 0.2s ease;
        width: 32px;
        height: 32px;
        font-size: 32px;
        color: var(--md-sys-color-primary);
      }

      #refresh-indicator.refreshing {
        height: 60px;
      }

      #refresh-indicator.refreshing md-icon {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
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
        border-radius: 8px;
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
    `,
  ];

  firstUpdated() {
    // The lit-virtualizer with scroller attribute is itself the scroll container
    this._setupPullToRefresh();
  }

  private async _setupPullToRefresh() {
    // Wait for lit-virtualizer to render
    await this.updateComplete;

    // Additional wait to ensure virtualizer is ready
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // lit-virtualizer with scroller attribute is itself the scroll container
    const scrollContainer = this.shadowRoot?.querySelector(
      'lit-virtualizer'
    ) as HTMLElement;

    if (scrollContainer) {
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
    }
  }

  private _getScrollContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector('lit-virtualizer') as HTMLElement;
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

      const indicator = this.shadowRoot?.querySelector(
        '#refresh-indicator'
      ) as HTMLElement;
      const icon = indicator?.querySelector('md-icon') as HTMLElement;

      if (indicator) {
        indicator.style.height = `${Math.min(this._pullDistance, 150)}px`;
        indicator.style.transition = 'none';
      }

      if (icon) {
        const rotation = Math.min(
          (this._pullDistance / this._threshold) * 360,
          360
        );
        icon.style.transform = `rotate(${rotation}deg)`;
      }

      if (this._pullDistance >= this._threshold && !this._hapticTriggered) {
        if (navigator.vibrate) navigator.vibrate(10);
        this._hapticTriggered = true;
      } else if (this._pullDistance < this._threshold) {
        this._hapticTriggered = false;
      }
    } else {
      // User is scrolling up (negative deltaY) - cancel pull-to-refresh
      // and let normal scrolling happen
      this._isPulling = false;
      this._pullDistance = 0;
      const indicator = this.shadowRoot?.querySelector(
        '#refresh-indicator'
      ) as HTMLElement;
      if (indicator) {
        indicator.style.height = '0px';
      }
    }
  }

  async _handleTouchEnd() {
    if (!this._isPulling) return;
    this._isPulling = false;
    this._hapticTriggered = false;

    const indicator = this.shadowRoot?.querySelector(
      '#refresh-indicator'
    ) as HTMLElement;
    if (indicator) {
      indicator.style.transition = 'height 0.2s ease'; // Re-enable transition
    }

    if (this._pullDistance >= this._threshold) {
      this.isRefreshing = true;
      if (indicator) indicator.classList.add('refreshing');

      // Reset height to fixed loading height
      if (indicator) indicator.style.height = '60px';

      await this.refreshTimeline(true);

      this.isRefreshing = false;
      if (indicator) {
        indicator.classList.remove('refreshing');
        indicator.style.height = '0px';
      }
    } else {
      if (indicator) indicator.style.height = '0px';
    }

    this._pullDistance = 0;
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!this.autoLoad) {
      return;
    }

    const { get } = await import('idb-keyval');
    const savedTimelineType = await get('timelineType');

    console.log('saved timeline type', savedTimelineType);

    if (savedTimelineType) {
      this.timelineType = savedTimelineType;
    }

    // Check cache first
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
    } else {
      // No cache, fetch fresh data
      console.log('No cache found, fetching fresh timeline');
      this.loadingData = true;
      await this.refreshTimeline();
      this.loadingData = false;
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
          scrollTimeout = window.setTimeout(() => {
            this.lastScrollPosition = virtualizer.scrollTop;
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

  /** Handle visibility changes from lit-virtualizer to trigger load more */
  private async _handleVisibilityChanged(e: VisibilityChangedEvent) {
    if (!this.autoLoad) {
      return;
    }

    const { last } = e;
    // Load more when we're close to the end
    if (
      last >= this.timeline.length - 5 &&
      !this.loadingData &&
      this.timeline.length > 0
    ) {
      this.loadingData = true;
      await this.loadMore();
      this.loadingData = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (!this.autoLoad) {
      return;
    }

    // Save timeline to cache when navigating away
    if (this.timeline.length > 0) {
      console.log('Saving timeline to cache on disconnect');
      saveTimelineCache(
        this.timelineType,
        this.timeline,
        this.lastScrollPosition
      );
    }
  }

  public async refreshTimeline(skipCache: boolean = true) {
    if (!this.autoLoad) {
      return;
    }

    console.log('refreshing timeline', this.timelineType);

    // Save current timeline data before refreshing
    if (!skipCache && this.timeline.length > 0) {
      saveTimelineCache(
        this.timelineType,
        this.timeline,
        this.lastScrollPosition
      );
    }

    switch (this.timelineType) {
      case 'for you': {
        const timelineDataMix = await mixTimeline('home');
        console.log('timelineData', timelineDataMix);

        this.timeline = [];
        await this.hasUpdated;

        // Deduplicate by post ID
        const uniqueMix = Array.from(
          new Map(timelineDataMix.map((post: Post) => [post.id, post])).values()
        ) as Post[];

        // Enrich posts with reply context
        this.timeline = await enrichPostsWithReplyContext(uniqueMix);

        // Save to cache after successful fetch
        saveTimelineCache(this.timelineType, this.timeline, 0);

        this.requestUpdate();
        break;
      }
      case 'home and some trending': {
        const timelineDataMix2 = await mixTimeline('home');
        console.log('timelineData', timelineDataMix2);

        this.timeline = [];
        await this.hasUpdated;

        // Deduplicate by post ID
        const uniqueMix2 = Array.from(
          new Map(
            timelineDataMix2.map((post: Post) => [post.id, post])
          ).values()
        ) as Post[];

        // Enrich posts with reply context
        this.timeline = await enrichPostsWithReplyContext(uniqueMix2);

        // Save to cache after successful fetch
        saveTimelineCache(this.timelineType, this.timeline, 0);

        this.requestUpdate();
        break;
      }
      case 'home': {
        const last_read_id = sessionStorage.getItem('latest-read');
        if (last_read_id) {
          const timelineData = await getLastPlaceTimeline();

          this.timeline = [];
          await this.hasUpdated;

          if (timelineData) {
            // Deduplicate by post ID
            const uniqueLastPlace = Array.from(
              new Map(
                timelineData.map((post: Post) => [post.id, post])
              ).values()
            ) as Post[];

            // Enrich posts with reply context
            this.timeline = await enrichPostsWithReplyContext(uniqueLastPlace);
          }

          // Save to cache after successful fetch
          saveTimelineCache(this.timelineType, this.timeline, 0);

          this.requestUpdate();
          break;
        }

        console.log('LOOK HERE');
        const timelineData = await getPaginatedHomeTimeline('home');
        console.log('timelineData', timelineData);

        this.timeline = [];
        await this.hasUpdated;

        // Deduplicate by post ID
        const uniqueHome = Array.from(
          new Map(timelineData.map((post: Post) => [post.id, post])).values()
        ) as Post[];

        // Enrich posts with reply context
        this.timeline = await enrichPostsWithReplyContext(uniqueHome);

        // Save to cache after successful fetch
        saveTimelineCache(this.timelineType, this.timeline, 0);

        this.requestUpdate();
        break;
      }
      case 'public': {
        const timelineDataPub = await getPreviewTimeline();
        console.log(timelineDataPub);

        this.timeline = [];
        await this.hasUpdated;

        // Deduplicate by post ID
        const uniquePub = Array.from(
          new Map(timelineDataPub.map((post: Post) => [post.id, post])).values()
        ) as Post[];

        // Enrich posts with reply context
        this.timeline = await enrichPostsWithReplyContext(uniquePub);

        // Save to cache after successful fetch
        saveTimelineCache(this.timelineType, this.timeline, 0);

        this.requestUpdate();
        break;
      }
      case 'media': {
        console.log('media timeline');
        const timelineDataMedia = await getPaginatedHomeTimeline('home');

        // filter out tweets that don't have media
        const mediaFiltered = (timelineDataMedia as Array<Post>).filter(
          (tweet: Post) => tweet.media_attachments.length > 0
        );
        console.log(mediaFiltered);

        // Deduplicate by post ID
        const uniqueMedia = Array.from(
          new Map(mediaFiltered.map((post: Post) => [post.id, post])).values()
        ) as Post[];

        // Enrich posts with reply context
        this.timeline = await enrichPostsWithReplyContext(uniqueMedia);

        // Save to cache after successful fetch
        saveTimelineCache(this.timelineType, this.timeline, 0);

        this.requestUpdate();
        break;
      }

      default:
        break;
    }
  }

  async loadMore() {
    const timelineData: Post[] = await getPaginatedHomeTimeline(
      this.timelineType ? this.timelineType : 'home'
    );
    console.log(timelineData);

    // Deduplicate posts by ID to prevent showing duplicates
    const existingIds = new Set(this.timeline.map((post) => post.id));
    const newPosts = timelineData.filter((post) => !existingIds.has(post.id));

    // Enrich new posts with reply context
    const enrichedNewPosts = await enrichPostsWithReplyContext(newPosts);

    this.timeline = [...this.timeline, ...enrichedNewPosts];

    // Update cache with new data
    saveTimelineCache(
      this.timelineType,
      this.timeline,
      this.lastScrollPosition
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
    // this.imgPreview = imageURL;

    // const dialog = this.shadowRoot?.querySelector('#img-preview') as any;
    // await dialog.show();

    if ('startViewTransition' in document) {
      await document.startViewTransition();
      router.navigate(`/home/img-preview?src=${imageURL}`);
    } else {
      router.navigate(`/home/img-preview?src=${imageURL}`);
    }
  }

  async showAnalyze(
    data: AnalyzeData,
    imageData: ImageAnalyzeData | null,
    tweet: Post
  ) {
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
    await dialog?.show();
  }

  async changeTimelineType(
    type: 'home' | 'public' | 'media' | 'for you' | 'home and some trending'
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

  render() {
    return html`
      <md-dialog
        id="img-preview"
        .open=${!!this.imgPreview}
        label="Image Preview"
      >
        ${this.imgPreview
          ? html`<img
              src="${this.imgPreview}"
              style="width:100%;border-radius:6px;"
            />`
          : null}
      </md-dialog>

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
                  @click="${() => this.changeTimelineType('public')}"
                >
                  Public
                </md-menu-item>
              </md-menu>
            </md-dropdown>

            <md-icon-button
              id="refresh-manual-button"
              circle
              @click="${() => {
                clearTimelineCache(this.timelineType);
                this.refreshTimeline(true);
              }}"
            >
              <md-icon src="/assets/refresh-circle-outline.svg"></md-icon>
            </md-icon-button>
          </div>`
        : null}

      <div id="refresh-indicator">
        <md-icon src="/assets/refresh-circle-outline.svg"></md-icon>
      </div>

      ${this.loadingData && this.timeline.length === 0
        ? html`<md-skeleton-card count="5"></md-skeleton-card>`
        : html`
            <lit-virtualizer
              id="mainList"
              part="list"
              class="scrollbar-hidden"
              scroller
              .items=${this.timeline}
              .renderItem=${((tweet: Post) =>
                html`<div class="timeline-list-item">
                  <timeline-item
                    @open="${($event: CustomEvent) =>
                      this.handleOpen($event.detail.tweet)}"
                    @summarize="${($event: CustomEvent<HandleSummaryDetail>) =>
                      this.handleSummary($event)}"
                    @translating="${(
                      $event: CustomEvent<HandleTranslatingDetail>
                    ) => this.handleTranslating($event)}"
                    tweetID="${tweet.id}"
                    @delete="${() => this.refreshTimeline()}"
                    @analyze="${($event: CustomEvent<AnalyzeEventDetail>) =>
                      this.showAnalyze(
                        $event.detail.data as AnalyzeData,
                        $event.detail.imageData as ImageAnalyzeData | null,
                        $event.detail.tweet
                      )}"
                    @openimage="${($event: CustomEvent<OpenImageDetail>) =>
                      this.showImage($event.detail.imageURL)}"
                    ?show="${true}"
                    @replies="${($event: CustomEvent<RepliesDetail>) =>
                      this.handleReplies($event.detail.data)}"
                    .tweet="${tweet}"
                  ></timeline-item>
                  <md-divider
                    style="margin-top: 12px; margin-bottom: 12px;"
                  ></md-divider>
                </div>`) as unknown}
              @visibilityChanged=${this._handleVisibilityChanged}
            >
            </lit-virtualizer>
          `}
    `;
  }
}
