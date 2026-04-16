import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getPaginatedHomeTimeline } from '../services/timeline';
import { shouldDisableVirtualScroll } from '../utils/browser';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

import './md/md-skeleton';
import '@lit-labs/virtualizer';
import { VisibilityChangedEvent } from '@lit-labs/virtualizer';

import '../components/timeline-item';
import '../components/search';
import { Post } from '../interfaces/Post';
import type { RepliesEvent } from '../types/events';

@customElement('media-timeline')
export class MediaTimeline extends LitElement {
  @state() timeline: Post[] = [];
  @state() loadingData: boolean = false;
  private _observer: IntersectionObserver | null = null;

  @property({ type: String }) timelineType:
    | 'Home'
    | 'Local'
    | 'Federated'
    | 'Media' = 'Home';

  static styles = [
    css`
      :host {
        display: block;
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

      lit-virtualizer {
        display: block;
        border-radius: var(--md-sys-shape-corner-small);
        margin: 0;
        padding: 0;
        height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .scroller-fallback {
        display: block;
        border-radius: var(--md-sys-shape-corner-small);
        margin: 0;
        padding: 0;
        height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      sl-card {
        --padding: 10px;
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
        height: 241px;
      }

      .fake {
        animation-name: fadein;
        animation-duration: 0.3s;
      }

      @keyframes fadein {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();

    this.loadingData = true;
    // await this.refreshTimeline();
    this.loadingData = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectIntersectionObserver(this._observer);
    this._observer = null;
  }

  updated() {
    if (shouldDisableVirtualScroll()) {
      this._setupInfiniteScroll();
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
          root,
          rootMargin: '500px',
          threshold: 0,
        }
      );
    }

    disconnectIntersectionObserver(this._observer);
    this._observer.observe(trigger);
  }

  /** Handle visibility changes from lit-virtualizer to trigger load more */
  private async _handleVisibilityChanged(e: VisibilityChangedEvent) {
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

  async refreshTimeline() {
    const timelineDataMedia = await getPaginatedHomeTimeline();

    // filter out tweets that don't have media
    const updatedTimeline = (timelineDataMedia as Post[]).filter(
      (tweet: Post) => tweet.media_attachments.length > 0
    );

    this.timeline = updatedTimeline;
  }

  async loadMore() {
    const timelineData = await getPaginatedHomeTimeline();
    // filter out tweets that don't have media
    const updatedTimeline = (timelineData as Post[]).filter(
      (tweet: Post) => tweet.media_attachments.length > 0
    );

    this.timeline = [...this.timeline, ...updatedTimeline];
  }

  handleReplies(data: Array<Post>) {
    // fire custom event
    this.dispatchEvent(
      new CustomEvent('replies', {
        detail: {
          data,
        },
      })
    );
  }

  render() {
    return shouldDisableVirtualScroll()
      ? html`
          <div class="scroller-fallback">
            ${this.timeline.map(
              (tweet) => html`
                <timeline-item
                  ?show="${true}"
                  @replies="${(e: RepliesEvent) =>
                    this.handleReplies(e.detail.data)}"
                  .tweet="${tweet}"
                ></timeline-item>
              `
            )}
            <div id="infinite-scroll-trigger" style="height: 1px;"></div>
          </div>
        `
      : html`
          <lit-virtualizer
            scroller
            .items="${this.timeline as Post[]}"
            .renderItem="${(tweet: Post) => html`
              <timeline-item
                ?show="${true}"
                @replies="${(e: RepliesEvent) =>
                  this.handleReplies(e.detail.data)}"
                .tweet="${tweet}"
              ></timeline-item>
            `}"
            @visibilityChanged="${this._handleVisibilityChanged}"
          >
          </lit-virtualizer>
        `;
  }
}
