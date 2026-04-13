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
    this.network_status = true;
  }

  connectedCallback() {
    super.connectedCallback();

    window.addEventListener('offline', this._handleOffline);
    window.addEventListener('online', this._handleOnline);
    this.network_status = navigator.onLine;
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener('offline', this._handleOffline);
    window.removeEventListener('online', this._handleOnline);
  }

  private _handleOffline = () => {
    this.network_status = false;
    this.showOfflineToast();
  };

  private _handleOnline = () => {
    if (this.network_status === false) {
      this.network_status = true;
      this.showBackOnlineToast();
    }
  };

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
          'You have entered offline mode. Coho will still work, including if you close and reopen the app, but some functionality may be limited.'
        )}
      >
      </md-toast>

      <md-toast
        id="back-online-toast"
        variant="success"
        duration="3000"
        closable
        message=${msg(
          'You are back online. Coho will resume normal functionality.'
        )}
      >
      </md-toast>
    `;
  }
}
