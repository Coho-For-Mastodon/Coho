import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Post } from '../interfaces/Post';
import { getPreviewTimeline } from '../services/timeline';

import '../components/timeline-item';
import '@lit-labs/virtualizer';
import { VisibilityChangedEvent } from '@lit-labs/virtualizer';

@customElement('preview-timeline')
export class PreviewTimeline extends LitElement {
  @state() timeline: Post[] = [];
  @state() loadingData = false;

  static styles = [
    css`
      :host {
        display: block;
      }

      lit-virtualizer {
        display: block;
        border-radius: 6px;
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
    return html`
      <lit-virtualizer
        part="list"
        scroller
        .items="${this.timeline as Post[]}"
        .renderItem="${(tweet: Post) => html`
          <div class="timeline-item">
            <timeline-item ?show="${false}" .tweet="${tweet}"></timeline-item>
          </div>
        `}"
        @visibilityChanged="${this._handleVisibilityChanged}"
      >
      </lit-virtualizer>
    `;
  }
}
