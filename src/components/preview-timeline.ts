import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';
import { getPreviewTimeline } from '../services/timeline';
import {
  createIntersectionObserver,
  disconnectIntersectionObserver,
} from '../utils/intersection-observer';

import '../components/timeline-item';

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
    this._setupInfiniteScroll();
  }

  private _hasMore = true;

  private _setupInfiniteScroll() {
    const root = this.shadowRoot?.querySelector('.scroller-fallback');
    if (!root) return;

    const items = root.querySelectorAll('.timeline-item');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    if (!this._observer) {
      this._observer = createIntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !this.loadingData &&
            this._hasMore &&
            this.timeline.length > 0
          ) {
            const prevCount = this.timeline.length;
            this.loadingData = true;
            this.loadMore().finally(() => {
              this.loadingData = false;
              if (this.timeline.length === prevCount) {
                this._hasMore = false;
              }
            });
          }
        },
        {
          root: root,
          rootMargin: '500px',
          threshold: 0,
        }
      );
    }

    this._observer.disconnect();
    this._observer.observe(lastItem);
  }

  async loadMore() {
    const previewData = await getPreviewTimeline();
    this.timeline = [...this.timeline, ...previewData];
  }

  render() {
    return html`
      <div class="scroller-fallback" part="list">
        ${this.timeline.map(
          (tweet) => html`
            <div class="timeline-item">
              <timeline-item ?show="${false}" .tweet="${tweet}"></timeline-item>
            </div>
          `
        )}
      </div>
    `;
  }
}
