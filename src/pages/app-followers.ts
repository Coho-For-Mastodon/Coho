import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getUsersFollowers } from '../services/account';

import '../components/user-profile';
import type { Account } from '../mastodon/types';

@localized()
@customElement('app-followers')
export class AppFollowers extends LitElement {
  @state() followers: Account[] = [];

  static styles = [
    css`
      :host {
        display: block;

        overflow-y: scroll;
        height: 100vh;
      }

      main {
        padding-top: 50px;
        max-width: var(--layout-max-width, 1200px);
        margin: 0 auto;
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
        animation: slideInFromLeft 0.3s ease-in-out;
        margin-bottom: 0;
      }

      ul li {
        background: var(--sl-color-gray-50);
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;

        animation: slideUp 0.3s ease-in-out;
      }

      @media (max-width: 820px) {
        ul {
          padding: 12px;
        }

        h2 {
          padding: 12px;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(30%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideInFromLeft {
        from {
          transform: translateX(-30%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
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
      const followersData = await getUsersFollowers(id);
      this.followers = [...followersData];
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Your Followers')}</h2>
        <ul class="scrollbar-hidden">
          ${this.followers.map((follower) => {
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
