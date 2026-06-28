import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import './md/md-dialog';
import './md/md-switch';
import './md/md-button';
import './md/md-select';
import './md/md-option';
import './md/md-divider';
import './md/md-skeleton';

import type { PushAlerts, PushPolicy } from '../mastodon/types/notification';

/**
 * Dialog for managing push notification preferences.
 * Fetches the current push subscription from the Mastodon server and allows
 * toggling individual notification types and the push policy.
 */
@localized()
@customElement('notification-preferences-dialog')
export class NotificationPreferencesDialog extends LitElement {
  @state() private _open = false;
  @state() private _loading = false;
  @state() private _saving = false;
  @state() private _hasSubscription = false;
  @state() private _error = '';

  @state() private _alerts: PushAlerts = {
    follow: true,
    favourite: true,
    reblog: true,
    mention: true,
    poll: true,
    follow_request: true,
    status: true,
    update: true,
    quote: true,
    quoted_update: true,
  };

  @state() private _policy: PushPolicy = 'all';

  static styles = css`
    :host {
      display: contents;
    }

    .prefs-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 300px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .setting-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting-label h4 {
      margin: 0;
      font-size: var(--md-sys-typescale-body-medium-font-size);
      font-weight: var(--md-sys-typescale-body-medium-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .setting-label p {
      margin: 0;
      font-size: var(--md-sys-typescale-body-small-font-size);
      color: var(--md-sys-color-on-surface-variant);
    }

    .section-header {
      margin: 12px 0 4px;
      font-size: var(--md-sys-typescale-title-small-font-size);
      font-weight: var(--md-sys-typescale-title-small-font-weight);
      color: var(--md-sys-color-on-surface);
    }

    .no-subscription {
      padding: 16px 0;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      font-size: var(--md-sys-typescale-body-medium-font-size);
    }

    .error-message {
      padding: 8px 12px;
      border-radius: var(--md-sys-shape-corner-small);
      background: var(--md-sys-color-error-container);
      color: var(--md-sys-color-on-error-container);
      font-size: var(--md-sys-typescale-body-small-font-size);
    }

    .skeleton-rows {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }

    .skeleton-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .policy-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
    }

    .footer-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  `;

  /**
   * Opens the dialog and fetches fresh push subscription state from the server.
   */
  async show() {
    this._open = true;
    this._error = '';
    await this._loadSubscription();
  }

  private async _loadSubscription() {
    this._loading = true;

    try {
      const { getPushSubscription } = await import('../services/notifications');
      const sub = await getPushSubscription();

      if (sub) {
        this._hasSubscription = true;
        this._alerts = { ...sub.alerts };
        this._policy = sub.policy || 'all';
      } else {
        this._hasSubscription = false;
      }
    } catch (err) {
      console.error('Failed to load push subscription:', err);
      this._error = msg('Failed to load notification preferences.');
      this._hasSubscription = false;
    } finally {
      this._loading = false;
    }
  }

  private _toggleAlert(key: keyof PushAlerts) {
    this._alerts = {
      ...this._alerts,
      [key]: !this._alerts[key],
    };
  }

  private _handlePolicyChange(e: CustomEvent<{ value: string }>) {
    this._policy = e.detail.value as PushPolicy;
  }

  private async _save() {
    this._saving = true;
    this._error = '';

    try {
      const { modifyPush } = await import('../services/notifications');
      const result = await modifyPush({
        alerts: this._alerts,
        policy: this._policy,
      });

      if (result) {
        this._open = false;
      } else {
        this._error = msg('Failed to save notification preferences.');
      }
    } catch (err) {
      console.error('Failed to save push preferences:', err);
      this._error = msg('Failed to save notification preferences.');
    } finally {
      this._saving = false;
    }
  }

  private _close() {
    this._open = false;
  }

  private _renderSkeleton() {
    return html`
      <div class="skeleton-rows">
        ${Array.from({ length: 6 }).map(
          () => html`
            <div class="skeleton-row">
              <md-skeleton width="160px" height="20px"></md-skeleton>
              <md-skeleton width="48px" height="24px"></md-skeleton>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderAlertRow(
    key: keyof PushAlerts,
    label: string,
    description: string
  ) {
    return html`
      <div class="setting-row">
        <div class="setting-label">
          <h4>${label}</h4>
          <p>${description}</p>
        </div>
        <md-switch
          ?checked="${this._alerts[key]}"
          ?disabled="${this._saving}"
          @change="${() => this._toggleAlert(key)}"
        ></md-switch>
      </div>
    `;
  }

  private _renderPreferences() {
    if (!this._hasSubscription) {
      return html`
        <div class="no-subscription">
          <p>${msg('Push notifications are not enabled.')}</p>
          <p>
            ${msg(
              'Turn on push notifications using the toggle above to configure alert preferences.'
            )}
          </p>
        </div>
      `;
    }

    return html`
      <div class="prefs-content">
        <h3 class="section-header">${msg('Notification Types')}</h3>

        ${this._renderAlertRow(
          'mention',
          msg('Mentions'),
          msg('Someone mentions you in a post')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'follow',
          msg('New Followers'),
          msg('Someone follows you')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'follow_request',
          msg('Follow Requests'),
          msg('Someone requests to follow you')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'reblog',
          msg('Boosts'),
          msg('Someone boosts your post')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'favourite',
          msg('Favourites'),
          msg('Someone favourites your post')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'poll',
          msg('Polls'),
          msg('A poll you voted in or created has ended')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'status',
          msg('New Posts'),
          msg('Someone you subscribed to posts')
        )}

        <md-divider></md-divider>

        ${this._renderAlertRow(
          'update',
          msg('Post Edits'),
          msg('A post you interacted with was edited')
        )}

        <md-divider></md-divider>

        <h3 class="section-header">${msg('Receive Notifications From')}</h3>

        <div class="policy-row">
          <md-select
            value="${this._policy}"
            variant="outlined"
            ?disabled="${this._saving}"
            @change="${this._handlePolicyChange}"
          >
            <md-option value="all">${msg('Everyone')}</md-option>
            <md-option value="followed">${msg('People you follow')}</md-option>
            <md-option value="follower">${msg('Your followers')}</md-option>
            <md-option value="none">${msg('Nobody')}</md-option>
          </md-select>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <md-dialog
        .open="${this._open}"
        label="${msg('Notification Preferences')}"
        @md-dialog-hide="${() => this._close()}"
      >
        ${
          this._error
            ? html`<div class="error-message">${this._error}</div>`
            : nothing
        }
        ${this._loading ? this._renderSkeleton() : this._renderPreferences()}

        <div slot="footer" class="footer-actions">
          <md-button
            variant="text"
            @click="${() => this._close()}"
            ?disabled="${this._saving}"
          >
            ${msg('Cancel')}
          </md-button>
          ${
            this._hasSubscription && !this._loading
              ? html`
                  <md-button
                    variant="filled"
                    @click="${() => this._save()}"
                    ?disabled="${this._saving}"
                  >
                    ${this._saving ? msg('Saving...') : msg('Save')}
                  </md-button>
                `
              : nothing
          }
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'notification-preferences-dialog': NotificationPreferencesDialog;
  }
}
