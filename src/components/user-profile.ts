import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { classMap } from 'lit/directives/class-map.js';
import { router } from '../router/routes';
import { parseEmojis } from '../utils/emoji-parser';
import { Account } from '../mastodon/types';

@customElement('user-profile')
export class UserProfile extends LitElement {
  @property({ type: Object }) account: Account | undefined = undefined;

  @property({ type: Boolean }) small: boolean = false;
  @property({ type: Boolean }) boosted: boolean = false;
  /** Use in flex list rows (blocked/muted): text fills space before trailing actions. */
  @property({ type: Boolean, attribute: 'list-row' }) listRow: boolean = false;

  static styles = [
    css`
      :host {
        display: block;
        cursor: pointer;
        contain: content;
      }

      :host([list-row]) {
        flex: 1;
        min-width: 0;
        align-self: center;
        contain: layout style;
      }

      :host([list-row]) .headerBlock {
        flex: 1;
        min-width: 0;
        width: 100%;
      }

      :host([list-row]) .headerBlock > div {
        min-width: 0;
        flex: 1;
      }

      p,
      h4 {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 196px;
        white-space: nowrap;
      }

      :host([list-row]) p,
      :host([list-row]) h4 {
        max-width: none;
      }

      .headerBlock {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .headerBlock img#avatar {
        height: 50px;
        width: 50px;
        border-radius: var(--md-sys-shape-corner-circle);
        contain: strict;

        border: solid var(--sl-color-primary-600) 2px;

        content-visibility: auto;
      }

      .headerBlock p {
        margin-top: 0;
        color: grey;
      }

      .headerBlock.small img {
        height: 36px;
        width: 36px;

        content-visibility: auto;
        contain: strict;
      }

      .headerBlock.small p {
        display: none;
      }

      .headerBlock.small h4 {
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
        :host(:not([list-row])) p,
        :host(:not([list-row])) h4 {
          max-width: 40vw;
        }
      }
    `,
  ];

  async openUser() {
    // Set viewTransitionName for cross-document view transition
    // @ts-expect-error - viewTransitionName not yet in CSSStyleDeclaration types
    this.shadowRoot!.querySelector('.headerBlock')!.viewTransitionName =
      'profile-image';

    // Navigate - the router handles view transitions internally
    // Pass account via Navigation API state for instant render
    await router.navigate(`/account?id=${this.account?.id}`, {
      state: { account: this.account },
    });

    // Best-effort cleanup (component may be disconnected after navigation)
    try {
      const headerBlock = this.shadowRoot?.querySelector('.headerBlock');
      if (headerBlock) {
        // @ts-expect-error - viewTransitionName not yet in CSSStyleDeclaration types
        headerBlock.viewTransitionName = '';
      }
    } catch {
      // ignore
    }
  }

  render() {
    return html`
      <button
        @click="${() => this.openUser()}"
        class=${classMap({
          small: this.small === true,
          headerBlock: true,
          boosted: this.boosted,
        })}
        slot="header"
        style="background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; text-align: left; width: 100%;"
      >
        <img
          id="avatar"
          src="${
            this.account?.avatar_static ||
            '/assets/icons/new-icons/icon-72x72.png'
          }"
          loading="eager"
          decoding="async"
          alt="${this.account?.display_name || ''}"
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
      </button>
    `;
  }
}
