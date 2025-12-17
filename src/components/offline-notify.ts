import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-toast.js';
import type { MdToast } from './md/md-toast.js';

@localized()
@customElement('offline-notify')
export class OfflineNotify extends LitElement {
  @state() public network_status: boolean = true;
  @state() back_online: boolean = false;

  @query('#offline-toast') private offlineToast!: MdToast;
  @query('#back-online-toast') private backOnlineToast!: MdToast;

  static styles = [
    css`
      :host {
        display: block;
      }

      .offline {
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `,
  ];

  constructor() {
    super();

    window.addEventListener('offline', () => {
      this.network_status = false;

      this.showOfflineToast();
    });

    window.addEventListener('online', () => {
      if (this.network_status === false) {
        this.network_status = true;

        this.showBackOnlineToast();
      }
    });

    this.network_status = navigator.onLine;
  }

  showOfflineToast() {
    if (this.offlineToast) {
      this.offlineToast.show();
    }
  }

  showBackOnlineToast() {
    if (this.backOnlineToast) {
      this.backOnlineToast.show();
    }
  }

  render() {
    return html`
      <md-toast
        id="offline-toast"
        variant="warning"
        duration="4000"
        closable
        message=${msg(
          'You have entered offline mode. Otter will still work, including if you close and reopen the app, but some functionality may be limited.'
        )}
      >
      </md-toast>

      <md-toast
        id="back-online-toast"
        variant="success"
        duration="3000"
        closable
        message=${msg(
          'You are back online. Otter will resume normal functionality.'
        )}
      >
      </md-toast>
    `;
  }
}
