import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { getHashtagTimeline } from '../services/timeline';
import type { Post } from '../interfaces/Post';
import '../components/post-detail-dialog';
import type { PostDetailDialog } from '../components/post-detail-dialog';

@customElement('app-hashtags')
export class AppHashtags extends LitElement {
  @state() data: Post[] | undefined;
  @state() tag: string | null | undefined;

  @query('post-detail-dialog') private postDetailDialog!: PostDetailDialog;

  static styles = [
    css`
      :host {
        display: block;
        height: 100vh;
      }

      main {
        padding: 10px;
        padding-top: calc(60px + env(safe-area-inset-top, 0px));
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        margin-top: 12px;
        /* margin-left: 20vw; */
        align-items: center;
        /* margin-right: 20vw; */
        max-width: var(--layout-max-width, 1200px);
        margin-left: auto;
        margin-right: auto;
      }

      app-timeline {
        flex: 1;
        overflow: hidden;

        width: 100%;
        max-width: 600px;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 0;
          padding-right: 0;
        }
      }
    `,
  ];

  protected async firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ) {
    // get tag from url
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');

    this.tag = tag;

    if (tag) {
      // get hashtag data
      const hashtagData = await getHashtagTimeline(tag);

      console.log('hashtagData', hashtagData);

      this.data = hashtagData;
    }
  }

  private handleOpenPost(tweet: Post) {
    this.postDetailDialog?.open(tweet);
  }

  render() {
    return html`
      <app-header ?enableBack=${true}></app-header>

      <main>
        <h3>${this.tag ? `#${this.tag}` : ''}</h3>

        <app-timeline
          .data=${this.data}
          .header=${false}
          .autoLoad=${false}
          @open="${(e: CustomEvent<{ tweet: Post }>) =>
            this.handleOpenPost(e.detail.tweet)}"
        ></app-timeline>
      </main>

      <!-- Post Detail Dialog -->
      <post-detail-dialog></post-detail-dialog>
    `;
  }
}
