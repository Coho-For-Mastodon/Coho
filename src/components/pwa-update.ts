import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-toast.js';

@localized()
@customElement('pwa-update')
export class PwaUpdate extends LitElement {
  @state() private updateAvailable = false;
  private updateCallback: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      'pwa-update-available',
      this.handleUpdate as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      'pwa-update-available',
      this.handleUpdate as EventListener
    );
  }

  private handleUpdate = (event: CustomEvent) => {
    this.updateAvailable = true;
    this.updateCallback = event.detail.updateServiceWorker;
  };

  private doUpdate() {
    if (this.updateCallback) {
      this.updateCallback();
      this.updateAvailable = false;
    }
  }

  render() {
    if (!this.updateAvailable) return null;

    return html`
      <md-toast
        open
        message=${msg('New version available')}
        action-label=${msg('Reload')}
        .duration=${0}
        @action-click=${this.doUpdate}
      ></md-toast>
    `;
  }
}
