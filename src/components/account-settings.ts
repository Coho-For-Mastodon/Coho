import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-switch';
import './md/md-select';
import './md/md-option';
import './md/md-card';
import './md/md-skeleton';

import { editAccount, getCredentials } from '../services/account';

// Common languages for default post language
const LANGUAGES = [
  { code: '', label: 'Default (Server)' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'uk', label: 'Українська' },
];

/**
 * Account settings component for the settings drawer.
 * Handles privacy settings and posting defaults, auto-saving on change.
 */
@localized()
@customElement('account-settings')
export class AccountSettings extends LitElement {
  @state() private loading = true;
  @state() private saving = false;

  // Privacy settings
  @state() private locked = false;
  @state() private bot = false;
  @state() private discoverable = true;
  @state() private hideCollections = false;
  @state() private indexable = true;

  // Posting defaults
  @state() private defaultPrivacy:
    'public' | 'unlisted' | 'private' | 'direct' = 'public';
  @state() private defaultSensitive = false;
  @state() private defaultLanguage = '';

  static styles = css`
    :host {
      display: contents;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }

    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .toggle-row:not(:last-child) {
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .toggle-info {
      flex: 1;
      margin-right: 16px;
    }

    .toggle-label {
      font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
      color: var(--md-sys-color-on-surface);
    }

    .toggle-description {
      font-size: var(--md-sys-typescale-body-small-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 2px;
    }

    .select-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 0;
    }

    .select-group:not(:last-child) {
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .input-label {
      font-size: var(--md-sys-typescale-body-small-font-size, 12px);
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    md-select {
      width: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadCredentials();
  }

  private async loadCredentials() {
    this.loading = true;
    try {
      const credentials = await getCredentials();

      this.locked = credentials.locked || false;
      this.bot = credentials.bot || false;
      this.discoverable = credentials.discoverable ?? true;
      this.hideCollections = credentials.hide_collections ?? false;
      this.indexable = credentials.indexable ?? true;

      this.defaultPrivacy = credentials.source?.privacy || 'public';
      this.defaultSensitive = credentials.source?.sensitive || false;
      this.defaultLanguage = credentials.source?.language || '';
    } catch (err) {
      console.error('[AccountSettings] Failed to load credentials:', err);
    } finally {
      this.loading = false;
    }
  }

  private async saveSettings() {
    if (this.saving) return;
    this.saving = true;

    try {
      await editAccount({
        locked: this.locked,
        bot: this.bot,
        discoverable: this.discoverable,
        hide_collections: this.hideCollections,
        indexable: this.indexable,
        source: {
          privacy: this.defaultPrivacy,
          sensitive: this.defaultSensitive,
          language: this.defaultLanguage || undefined,
        },
      });
    } catch (err) {
      console.error('[AccountSettings] Save failed:', err);
    } finally {
      this.saving = false;
    }
  }

  private handleToggle(field: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    switch (field) {
      case 'locked':
        this.locked = checked;
        break;
      case 'bot':
        this.bot = checked;
        break;
      case 'discoverable':
        this.discoverable = checked;
        break;
      case 'hideCollections':
        this.hideCollections = checked;
        break;
      case 'indexable':
        this.indexable = checked;
        break;
      case 'defaultSensitive':
        this.defaultSensitive = checked;
        break;
    }
    this.saveSettings();
  }

  private handleSelectChange(field: string, e: CustomEvent) {
    switch (field) {
      case 'defaultPrivacy':
        this.defaultPrivacy = e.detail.value;
        break;
      case 'defaultLanguage':
        this.defaultLanguage = e.detail.value;
        break;
    }
    this.saveSettings();
  }

  private renderPrivacyContent() {
    if (this.loading) {
      return html`
        <div class="loading-container">
          <md-skeleton style="height: 48px"></md-skeleton>
          <md-skeleton style="height: 48px"></md-skeleton>
          <md-skeleton style="height: 48px"></md-skeleton>
        </div>
      `;
    }

    return html`
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Locked Account')}</div>
          <div class="toggle-description">
            ${msg('Manually approve who can follow you')}
          </div>
        </div>
        <md-switch
          .checked=${this.locked}
          @change=${(e: Event) => this.handleToggle('locked', e)}
        ></md-switch>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Bot Account')}</div>
          <div class="toggle-description">
            ${msg('Mark this account as an automated bot')}
          </div>
        </div>
        <md-switch
          .checked=${this.bot}
          @change=${(e: Event) => this.handleToggle('bot', e)}
        ></md-switch>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Discoverable')}</div>
          <div class="toggle-description">
            ${msg('Show profile in directory and recommendations')}
          </div>
        </div>
        <md-switch
          .checked=${this.discoverable}
          @change=${(e: Event) => this.handleToggle('discoverable', e)}
        ></md-switch>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Hide Follower Counts')}</div>
          <div class="toggle-description">
            ${msg("Don't show follower and following counts publicly")}
          </div>
        </div>
        <md-switch
          .checked=${this.hideCollections}
          @change=${(e: Event) => this.handleToggle('hideCollections', e)}
        ></md-switch>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Indexable')}</div>
          <div class="toggle-description">
            ${msg('Allow public posts to appear in search results')}
          </div>
        </div>
        <md-switch
          .checked=${this.indexable}
          @change=${(e: Event) => this.handleToggle('indexable', e)}
        ></md-switch>
      </div>
    `;
  }

  private renderPostingContent() {
    if (this.loading) {
      return html`
        <div class="loading-container">
          <md-skeleton style="height: 48px"></md-skeleton>
          <md-skeleton style="height: 48px"></md-skeleton>
          <md-skeleton style="height: 48px"></md-skeleton>
        </div>
      `;
    }

    return html`
      <div class="select-group">
        <label class="input-label">${msg('Default Post Privacy')}</label>
        <md-select
          .value=${this.defaultPrivacy}
          @change=${(e: CustomEvent) =>
            this.handleSelectChange('defaultPrivacy', e)}
        >
          <md-option value="public">${msg('Public')}</md-option>
          <md-option value="unlisted">${msg('Unlisted')}</md-option>
          <md-option value="private">${msg('Followers Only')}</md-option>
          <md-option value="direct">${msg('Mentioned Only')}</md-option>
        </md-select>
      </div>

      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-label">${msg('Sensitive Content')}</div>
          <div class="toggle-description">
            ${msg('Mark media as sensitive by default')}
          </div>
        </div>
        <md-switch
          .checked=${this.defaultSensitive}
          @change=${(e: Event) => this.handleToggle('defaultSensitive', e)}
        ></md-switch>
      </div>

      <div class="select-group">
        <label class="input-label">${msg('Default Post Language')}</label>
        <md-select
          .value=${this.defaultLanguage}
          @change=${(e: CustomEvent) =>
            this.handleSelectChange('defaultLanguage', e)}
        >
          ${LANGUAGES.map(
            (lang) =>
              html`<md-option value=${lang.code}>${lang.label}</md-option>`
          )}
        </md-select>
      </div>
    `;
  }

  render() {
    return html`
      <md-card variant="filled">
        <h3 slot="header">${msg('Account & Privacy')}</h3>
        ${this.renderPrivacyContent()}
      </md-card>

      <md-card variant="filled">
        <h3 slot="header">${msg('Posting Defaults')}</h3>
        ${this.renderPostingContent()}
      </md-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'account-settings': AccountSettings;
  }
}
