import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getFollowing } from '../services/account';

import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-following')
export class Appfollowing extends LitElement {
  @state() following: Account[] = [];

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
        height: 100vh;
      }

      main {
        padding-top: 50px;
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin: 0;
        padding: 0;
        list-style: none;

        height: 81vh;
        overflow-y: scroll;
        overflow-x: hidden;

        padding-left: 6em;
        padding-right: 6em;
      }

      h2 {
        padding-left: 4em;
        margin-bottom: 0;
      }

      ul li {
        background: var(--sl-color-gray-50);
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
      }

      @media (max-width: 820px) {
        ul {
          padding: 12px;
        }

        h2 {
          padding: 12px;
        }
      }

      @media (prefers-color-scheme: light) {
        ul li {
          color: black;
        }
      }
    `,
  ];

  async firstUpdated() {
    // get id from url query params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      const followingData = await getFollowing(id);
      this.following = [...followingData];
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('You are Following')}</h2>
        <ul class="scrollbar-hidden">
          ${this.following.map((follower) => {
            return html`
              ${follower && follower.id
                ? html`<li>
                    <user-profile .account=${follower}></user-profile>
                  </li>`
                : null}
            `;
          })}
        </ul>
      </main>
    `;
  }
}
