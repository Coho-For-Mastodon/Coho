import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';
import { getPreviewTimeline } from '../services/timeline';
import { shouldDisableVirtualScroll } from '../utils/browser';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

import '../components/timeline-item';
import '@lit-labs/virtualizer';
import { VisibilityChangedEvent } from '@lit-labs/virtualizer';

@customElement('preview-timeline')
export class PreviewTimeline extends LitElement {
  @state() timeline: Post[] = [];
  @state() loadingData = false;
  private _observer: IntersectionObserver | null = null;

  static styles = [
    css`
      :host {
        display: block;
      }

      lit-virtualizer {
        display: block;
        border-radius: var(--md-sys-shape-corner-small);
        margin: 0;
        padding: 0;
        width: 100%;
        height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .scroller-fallback {
        display: block;
        border-radius: var(--md-sys-shape-corner-small);
        margin: 0;
        padding: 0;
        width: 100%;
        height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .timeline-item {
        width: 100%;
      }
    `,
  ];

  async firstUpdated() {
    const previewData = await getPreviewTimeline();
    this.timeline = previewData;
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

  async loadMore() {
    const previewData = await getPreviewTimeline();
    this.timeline = [...this.timeline, ...previewData];
  }

  render() {
    return shouldDisableVirtualScroll()
      ? html`
          <div class="scroller-fallback" part="list">
            ${this.timeline.map(
              (tweet) => html`
                <div class="timeline-item">
                  <timeline-item
                    ?show="${false}"
                    .tweet="${tweet}"
                  ></timeline-item>
                </div>
              `
            )}
            <div id="infinite-scroll-trigger" style="height: 1px;"></div>
          </div>
        `
      : html`
          <lit-virtualizer
            part="list"
            scroller
            .items="${this.timeline as Post[]}"
            .renderItem="${(tweet: Post) => html`
              <div class="timeline-item">
                <timeline-item
                  ?show="${false}"
                  .tweet="${tweet}"
                ></timeline-item>
              </div>
            `}"
            @visibilityChanged="${this._handleVisibilityChanged}"
          >
          </lit-virtualizer>
        `;
  }
}
