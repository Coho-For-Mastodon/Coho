import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { router } from '../utils/router';

import './md/md-button';

/**
 * A subtle banner prompting guest users to sign in.
 * Displays at the bottom of the screen with a login call-to-action.
 */
@localized()
@customElement('guest-login-banner')
export class GuestLoginBanner extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      pointer-events: none;
    }

    .banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--md-sys-color-surface-container, #1e1e24);
      border-top: 1px solid var(--md-sys-color-outline-variant, #444);
      pointer-events: auto;
    }

    .banner-text {
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #c4c4c4);
    }

    .sign-in-link {
      font-size: 13px;
      font-weight: 500;
      color: var(--md-sys-color-primary, #6750a4);
      cursor: pointer;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }

    .sign-in-link:hover {
      background: var(
        --md-sys-color-primary-container,
        rgba(103, 80, 164, 0.15)
      );
    }

    @media (prefers-color-scheme: light) {
      .banner {
        background: var(--md-sys-color-surface-container, #f3edf7);
      }
    }

    @media (max-width: 824px) {
      /* Push banner above mobile nav tabs */
      :host {
        bottom: 74px;
      }
    }
  `;

  private handleSignIn() {
    router.navigate('/');
  }

  render() {
    return html`
      <div class="banner">
        <span class="banner-text">${msg('Browsing as guest')}</span>
        <a class="sign-in-link" @click="${this.handleSignIn}"
          >${msg('Sign in')}</a
        >
      </div>
    `;
  }
}
