import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { classMap } from 'lit/directives/class-map.js';
// import { enableVibrate } from '../utils/handle-vibrate';
import { router } from '../utils/router';
import { parseEmojis } from '../utils/emoji-parser';
import { Account } from '../mastodon';

@customElement('user-profile')
export class UserProfile extends LitElement {
  @property({ type: Object }) account: Account | undefined = undefined;

  @property({ type: Boolean }) small: boolean = false;
  @property({ type: Boolean }) boosted: boolean = false;

  static styles = [
    css`
      :host {
        display: block;
        cursor: pointer;
        contain: content;
      }

      p,
      h4 {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 196px;
        white-space: nowrap;
      }

      .headerBlock {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .headerBlock img#avatar {
        height: 50px;
        width: 50px;
        border-radius: 50%;
        contain: strict;

        border: solid var(--sl-color-primary-600) 2px;

        content-visibility: auto;
      }

      .headerBlock p {
        margin-top: 0;
        color: grey;
      }

      div.small img {
        height: 36px;
        width: 36px;

        content-visibility: auto;
        contain: strict;
      }

      div.small p {
        display: none;
      }

      div.small h4 {
        margin-top: 0;
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
      }

      .headerBlock h4 {
        margin-bottom: 0;
      }

      .boosted h4 {
        font-size: var(--md-sys-typescale-body-small-font-size);
      }

      .boosted img#avatar {
        width: 20px;
        height: 20px;
      }

      @media (max-width: 500px) {
        p,
        h4 {
          max-width: 40vw;
        }
      }
    `,
  ];

  async firstUpdated() {
    // set up intersection observer
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadImage();

          observer.unobserve(entry.target);
        }
      });
    }, options);

    observer.observe(this.shadowRoot?.querySelector('img') as Element);

    window.requestIdleCallback(async () => {
      if (this.shadowRoot) {
        const { enableVibrate } = await import('../utils/handle-vibrate');
        enableVibrate(this.shadowRoot);
      }
    });
  }

  loadImage() {
    const img = this.shadowRoot?.querySelector('img');
    if (img) {
      const src = img.getAttribute('data-src');
      if (src) {
        img.setAttribute('src', src);
        img.removeAttribute('data-src');
      }
    }
  }

  async openUser() {
    // @ts-expect-error - viewTransitionName not yet in CSSStyleDeclaration types
    this.shadowRoot!.querySelector('.headerBlock')!.viewTransitionName =
      'profile-image';

    if ('startViewTransition' in document) {
      await document.startViewTransition();
      router.navigate(`/account?id=${this.account?.id}`);
      setTimeout(() => {
        // @ts-expect-error - viewTransitionName not yet in CSSStyleDeclaration types
        this.shadowRoot!.querySelector('.headerBlock')!.viewTransitionName = '';
      }, 800);
    } else {
      router.navigate(`/account?id=${this.account?.id}`);
    }
  }

  render() {
    return html`
      <div
        @click="${() => this.openUser()}"
        class=${classMap({
          small: this.small === true,
          headerBlock: true,
          boosted: this.boosted,
        })}
        slot="header"
      >
        <img
          id="avatar"
          src="/assets/icons/new-icons/icon-72x72.png"
          data-src="${this.account?.avatar_static ||
          '/assets/icons/new-icons/icon-72x72.png'}"
        />
        <div>
          <h4
            .innerHTML="${parseEmojis(
              this.account?.display_name || 'Loading...',
              this.account?.emojis || [],
              true
            )}"
          ></h4>
          <p>${this.account?.acct || 'Loading...'}</p>
        </div>
      </div>
    `;
  }
}
