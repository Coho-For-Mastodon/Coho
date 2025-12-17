import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { getMessages } from '../services/messages';

import '../components/header';

@localized()
@customElement('app-messages')
export class AppMessages extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
      }

      ul {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;

        height: 81vh;
        overflow-y: scroll;
        overflow-x: hidden;
      }
    `,
  ];

  async firstUpdated() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const messages = await getMessages();
          console.log('messages', messages);

          observer.disconnect();
        }
      });
    }, options);

    observer.observe(this);
  }

  render() {
    return html`
      <ul class="scrollbar-hidden">
        <h2>${msg('Coming soon...')}</h2>
      </ul>
    `;
  }
}
