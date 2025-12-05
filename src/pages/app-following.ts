import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getFollowing } from '../services/account';

import '../components/user-profile';
import type { Account } from '../mastodon/types';

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
        padding-top: 60px;
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
      }

      ul li {
        background: var(--sl-color-gray-50);
        border-radius: 6px;
        padding: 10px;
      }

      li a {
        text-decoration: none;
        color: white;
      }

      @media (prefers-color-scheme: light) {
        ul li {
          color: black;
        }

        li a {
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
        <h2>You are Following</h2>
        <ul class="scrollbar-hidden">
          ${this.following.map((follower) => {
      return html`
              ${follower && follower.id
          ? html`<li>
                    <a href="/account?id=${follower.id}">
                      <user-profile .account=${follower}></user-profile>
                    </a>
                  </li>`
          : null}
            `;
    })}
        </ul>
      </main>
    `;
  }
}
