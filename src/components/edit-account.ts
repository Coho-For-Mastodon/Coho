import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { localized, msg } from '@lit/localize';

import './md/md-text-field';
import './md/md-text-area';
import './md/md-switch';
import './md/md-button';
import './md/md-segmented-button';
import './md/md-select';
import './md/md-option';
import './md/md-skeleton';
import './md/md-icon';
import './md/md-icon-button';
import './md/md-toast';

import { editAccount, getCredentials } from '../services/account';
import { fileOpen } from 'browser-fs-access';
import { router } from '../router/routes';

// Character limits per Mastodon API
const LIMITS = {
  displayName: 30,
  bio: 500,
  fieldName: 255,
  fieldValue: 255,
  maxFields: 4,
};

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

interface ProfileField {
  name: string;
  value: string;
}

@localized()
@customElement('edit-account')
export class EditAccount extends LitElement {
  // Loading and UI states
  @state() private loading = true;
  @state() private saving = false;
  @state() private error: string | null = null;
  @state() private activeSection: 'profile' | 'privacy' | 'posting' = 'profile';

  // Form values - Profile
  @state() private displayName = '';
  @state() private bio = '';
  @state() private fields: ProfileField[] = [];
  @state() private newAvatar: File | null = null;
  @state() private newHeader: File | null = null;
  @state() private avatarPreviewUrl = '';
  @state() private headerPreviewUrl = '';

  // Form values - Privacy
  @state() private locked = false;
  @state() private bot = false;
  @state() private discoverable = true;
  @state() private hideCollections = false;
  @state() private indexable = true;

  // Form values - Posting defaults
  @state() private defaultPrivacy:
    | 'public'
    | 'unlisted'
    | 'private'
    | 'direct' = 'public';
  @state() private defaultSensitive = false;
  @state() private defaultLanguage = '';

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
    }

    .container {
      padding: 16px;
      padding-bottom: 32px;
    }

    /* Loading state */
    .loading-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px;
    }

    .skeleton-header {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .skeleton-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
    }

    .skeleton-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Error state */
    .error-container {
      padding: 24px;
      text-align: center;
    }

    .error-message {
      color: var(--md-sys-color-error, #ba1a1a);
      margin-bottom: 16px;
    }

    /* Segmented button */
    md-segmented-button {
      margin-bottom: 20px;
    }

    .section-content {
      display: none;
    }

    .section-content.active {
      display: block;
    }

    /* Form sections */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px 0 4px;
    }

    .section-card {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    @media (prefers-color-scheme: dark) {
      .section-card {
        background: var(--md-sys-color-surface-container, #211f26);
      }
    }

    /* Image uploads */
    .images-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .image-upload {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .image-upload label {
      font-size: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .image-preview-container {
      position: relative;
      display: inline-block;
    }

    .avatar-preview {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .header-preview {
      width: 200px;
      height: 67px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .image-change-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.2s;
      cursor: pointer;
    }

    .avatar-preview + .image-change-overlay {
      border-radius: 50%;
    }

    .header-preview + .image-change-overlay {
      border-radius: 12px;
    }

    .image-preview-container:hover .image-change-overlay {
      opacity: 1;
    }

    .image-change-overlay md-icon {
      color: white;
      font-size: 24px;
    }

    /* Text inputs */
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-helper {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      display: flex;
      justify-content: space-between;
    }

    .char-count {
      font-variant-numeric: tabular-nums;
    }

    .char-count.warning {
      color: var(--md-sys-color-error, #ba1a1a);
    }

    md-text-field,
    md-text-area {
      width: 100%;
    }

    md-text-area {
      min-height: 120px;
    }

    /* Profile fields */
    .fields-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 12px;
      align-items: start;
    }

    .field-row md-text-field {
      min-width: 0;
    }

    .field-row md-icon-button {
      margin-top: 4px;
    }

    .add-field-btn {
      align-self: flex-start;
    }

    /* Toggle options */
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .toggle-row:last-child {
      border-bottom: none;
    }

    .toggle-info {
      flex: 1;
      margin-right: 16px;
    }

    .toggle-label {
      font-size: 16px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .toggle-description {
      font-size: 13px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-top: 2px;
    }

    /* Select inputs */
    .select-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    md-select {
      width: 100%;
    }

    /* Actions - sticky bottom bar */
    .actions {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 12px 16px;
      background: var(--md-sys-color-surface, #fef7ff);
      border-top: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      z-index: 100;
    }

    @media (prefers-color-scheme: dark) {
      .actions {
        background: var(--md-sys-color-surface, #141218);
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
      }
    }

    /* Toast notifications */
    md-toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    }

    /* Mobile responsive */
    @media (max-width: 600px) {
      .container {
        padding: 12px;
      }

      .section-card {
        padding: 16px;
        border-radius: 12px;
      }

      .images-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .field-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .field-row md-icon-button {
        justify-self: end;
      }

      .header-preview {
        width: 100%;
        max-width: 280px;
        height: auto;
        aspect-ratio: 3 / 1;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadCredentials();
  }

  private async loadCredentials() {
    this.loading = true;
    this.error = null;

    try {
      const credentials = await getCredentials();

      // Populate form with current values
      this.displayName = credentials.display_name || '';
      this.bio = credentials.source?.note || '';
      this.avatarPreviewUrl = credentials.avatar || '';
      this.headerPreviewUrl = credentials.header || '';

      // Profile fields from source (plain text)
      this.fields =
        credentials.source?.fields?.map((f) => ({
          name: f.name,
          value: f.value,
        })) || [];

      // Privacy settings
      this.locked = credentials.locked || false;
      this.bot = credentials.bot || false;
      this.discoverable = credentials.discoverable ?? true;
      this.hideCollections = credentials.hide_collections ?? false;
      this.indexable = credentials.indexable ?? true;

      // Posting defaults
      this.defaultPrivacy = credentials.source?.privacy || 'public';
      this.defaultSensitive = credentials.source?.sensitive || false;
      this.defaultLanguage = credentials.source?.language || '';
    } catch (err) {
      console.error('[EditAccount] Failed to load credentials:', err);
      this.error =
        err instanceof Error ? err.message : 'Failed to load account';
    } finally {
      this.loading = false;
    }
  }

  private async changeAvatar() {
    try {
      const file = await fileOpen({
        mimeTypes: ['image/*'],
        description: 'Avatar image',
        startIn: 'pictures',
      });
      this.newAvatar = file;
      this.avatarPreviewUrl = URL.createObjectURL(file);
    } catch {
      // User cancelled
    }
  }

  private async changeHeader() {
    try {
      const file = await fileOpen({
        mimeTypes: ['image/*'],
        description: 'Header image',
        startIn: 'pictures',
      });
      this.newHeader = file;
      this.headerPreviewUrl = URL.createObjectURL(file);
    } catch {
      // User cancelled
    }
  }

  private addField() {
    if (this.fields.length < LIMITS.maxFields) {
      this.fields = [...this.fields, { name: '', value: '' }];
    }
  }

  private removeField(index: number) {
    this.fields = this.fields.filter((_, i) => i !== index);
  }

  private updateFieldName(index: number, name: string) {
    const updated = [...this.fields];
    updated[index] = { ...updated[index], name };
    this.fields = updated;
  }

  private updateFieldValue(index: number, value: string) {
    const updated = [...this.fields];
    updated[index] = { ...updated[index], value };
    this.fields = updated;
  }

  private async save() {
    this.saving = true;

    try {
      await editAccount({
        display_name: this.displayName,
        note: this.bio,
        avatar: this.newAvatar || undefined,
        header: this.newHeader || undefined,
        locked: this.locked,
        bot: this.bot,
        discoverable: this.discoverable,
        hide_collections: this.hideCollections,
        indexable: this.indexable,
        fields_attributes: this.fields.filter((f) => f.name || f.value),
        source: {
          privacy: this.defaultPrivacy,
          sensitive: this.defaultSensitive,
          language: this.defaultLanguage || undefined,
        },
      });

      // Show success toast
      this.showToast('Profile updated successfully!', 'success');

      // Navigate back after brief delay
      setTimeout(() => {
        router.navigate('/home');
      }, 1000);
    } catch (err) {
      console.error('[EditAccount] Save failed:', err);
      this.showToast(
        err instanceof Error ? err.message : 'Failed to save changes',
        'error'
      );
    } finally {
      this.saving = false;
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    const toast = this.shadowRoot?.querySelector('md-toast');
    if (toast) {
      toast.setAttribute('message', message);
      toast.setAttribute('type', type);
      (toast as HTMLElement & { show: () => void }).show();
    }
  }

  private renderLoading() {
    return html`
      <div class="loading-container">
        <div class="skeleton-header">
          <md-skeleton class="skeleton-avatar"></md-skeleton>
          <div class="skeleton-info">
            <md-skeleton style="height: 24px; width: 60%"></md-skeleton>
            <md-skeleton style="height: 16px; width: 40%"></md-skeleton>
          </div>
        </div>
        <md-skeleton style="height: 48px"></md-skeleton>
        <md-skeleton style="height: 120px"></md-skeleton>
        <md-skeleton style="height: 48px"></md-skeleton>
        <md-skeleton style="height: 48px"></md-skeleton>
      </div>
    `;
  }

  private renderError() {
    return html`
      <div class="error-container">
        <p class="error-message">${this.error}</p>
        <md-button variant="filled" @click=${this.loadCredentials}>
          ${msg('Try Again')}
        </md-button>
      </div>
    `;
  }

  private renderProfileTab() {
    const displayNameCount = this.displayName.length;
    const bioCount = this.bio.length;

    return html`
      <div class="form-section">
        <!-- Images Section -->
        <div class="section-card">
          <span class="section-title">${msg('Profile Images')}</span>
          <div class="images-row">
            <div class="image-upload">
              <label>${msg('Avatar')}</label>
              <div class="image-preview-container">
                <img
                  class="avatar-preview"
                  src=${this.avatarPreviewUrl || '/assets/icons/256-icon.png'}
                  alt=${msg('Avatar preview')}
                />
                <div class="image-change-overlay" @click=${this.changeAvatar}>
                  <md-icon name="camera"></md-icon>
                </div>
              </div>
            </div>

            <div class="image-upload">
              <label>${msg('Header')}</label>
              <div class="image-preview-container">
                <img
                  class="header-preview"
                  src=${this.headerPreviewUrl || '/assets/icons/256-icon.png'}
                  alt=${msg('Header preview')}
                />
                <div class="image-change-overlay" @click=${this.changeHeader}>
                  <md-icon name="camera"></md-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Basic Info Section -->
        <div class="section-card">
          <span class="section-title">${msg('Basic Information')}</span>

          <div class="input-group">
            <label class="input-label">${msg('Display Name')}</label>
            <md-text-field
              .value=${this.displayName}
              @input=${(e: InputEvent) =>
                (this.displayName = (e.target as HTMLInputElement).value)}
              placeholder=${msg('Your display name')}
              maxlength=${LIMITS.displayName}
            ></md-text-field>
            <div class="input-helper">
              <span>${msg('How you appear to others')}</span>
              <span
                class=${classMap({
                  'char-count': true,
                  'warning': displayNameCount > LIMITS.displayName - 5,
                })}
              >
                ${displayNameCount}/${LIMITS.displayName}
              </span>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">${msg('Bio')}</label>
            <md-text-area
              .value=${this.bio}
              @input=${(e: InputEvent) =>
                (this.bio = (e.target as HTMLTextAreaElement).value)}
              placeholder=${msg('Tell people about yourself...')}
              maxlength=${LIMITS.bio}
            ></md-text-area>
            <div class="input-helper">
              <span>${msg('Supports Markdown and custom emoji')}</span>
              <span
                class=${classMap({
                  'char-count': true,
                  'warning': bioCount > LIMITS.bio - 50,
                })}
              >
                ${bioCount}/${LIMITS.bio}
              </span>
            </div>
          </div>
        </div>

        <!-- Profile Fields Section -->
        <div class="section-card">
          <span class="section-title">${msg('Profile Metadata')}</span>
          <p
            style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); margin: 0;"
          >
            ${msg(
              'Add up to 4 custom fields to display on your profile. URLs will be verified for link ownership.'
            )}
          </p>

          <div class="fields-container">
            ${this.fields.map(
              (field, index) => html`
                <div class="field-row">
                  <md-text-field
                    .value=${field.name}
                    @input=${(e: InputEvent) =>
                      this.updateFieldName(
                        index,
                        (e.target as HTMLInputElement).value
                      )}
                    placeholder=${msg('Label')}
                    maxlength=${LIMITS.fieldName}
                  ></md-text-field>
                  <md-text-field
                    .value=${field.value}
                    @input=${(e: InputEvent) =>
                      this.updateFieldValue(
                        index,
                        (e.target as HTMLInputElement).value
                      )}
                    placeholder=${msg('Content')}
                    maxlength=${LIMITS.fieldValue}
                  ></md-text-field>
                  <md-icon-button
                    name="trash"
                    @click=${() => this.removeField(index)}
                    title=${msg('Remove field')}
                  ></md-icon-button>
                </div>
              `
            )}
            ${this.fields.length < LIMITS.maxFields
              ? html`
                  <md-button
                    variant="tonal"
                    class="add-field-btn"
                    @click=${this.addField}
                  >
                    <md-icon name="add" slot="prefix"></md-icon>
                    ${msg('Add Field')}
                  </md-button>
                `
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderPrivacyTab() {
    return html`
      <div class="form-section">
        <div class="section-card">
          <span class="section-title">Account Settings</span>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Locked Account</div>
              <div class="toggle-description">
                Manually approve who can follow you
              </div>
            </div>
            <md-switch
              .checked=${this.locked}
              @change=${(e: Event) =>
                (this.locked = (e.target as HTMLInputElement).checked)}
            ></md-switch>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Bot Account</div>
              <div class="toggle-description">
                Mark this account as an automated bot
              </div>
            </div>
            <md-switch
              .checked=${this.bot}
              @change=${(e: Event) =>
                (this.bot = (e.target as HTMLInputElement).checked)}
            ></md-switch>
          </div>
        </div>

        <div class="section-card">
          <span class="section-title">Discovery</span>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Discoverable</div>
              <div class="toggle-description">
                Show profile in directory and recommendations
              </div>
            </div>
            <md-switch
              .checked=${this.discoverable}
              @change=${(e: Event) =>
                (this.discoverable = (e.target as HTMLInputElement).checked)}
            ></md-switch>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Hide Follower Counts</div>
              <div class="toggle-description">
                Don't show follower and following counts publicly
              </div>
            </div>
            <md-switch
              .checked=${this.hideCollections}
              @change=${(e: Event) =>
                (this.hideCollections = (e.target as HTMLInputElement).checked)}
            ></md-switch>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Indexable</div>
              <div class="toggle-description">
                Allow public posts to appear in search results
              </div>
            </div>
            <md-switch
              .checked=${this.indexable}
              @change=${(e: Event) =>
                (this.indexable = (e.target as HTMLInputElement).checked)}
            ></md-switch>
          </div>
        </div>
      </div>
    `;
  }

  private renderPostingTab() {
    return html`
      <div class="form-section">
        <div class="section-card">
          <span class="section-title">Posting Defaults</span>

          <div class="select-group">
            <label class="input-label">Default Post Privacy</label>
            <md-select
              .value=${this.defaultPrivacy}
              @change=${(e: CustomEvent) =>
                (this.defaultPrivacy = e.detail.value)}
            >
              <md-option value="public">Public</md-option>
              <md-option value="unlisted">Unlisted</md-option>
              <md-option value="private">Followers Only</md-option>
              <md-option value="direct">Mentioned Only</md-option>
            </md-select>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Sensitive Content</div>
              <div class="toggle-description">
                Mark media as sensitive by default
              </div>
            </div>
            <md-switch
              .checked=${this.defaultSensitive}
              @change=${(e: Event) =>
                (this.defaultSensitive = (
                  e.target as HTMLInputElement
                ).checked)}
            ></md-switch>
          </div>

          <div class="select-group">
            <label class="input-label">Default Post Language</label>
            <md-select
              .value=${this.defaultLanguage}
              @change=${(e: CustomEvent) =>
                (this.defaultLanguage = e.detail.value)}
            >
              ${LANGUAGES.map(
                (lang) =>
                  html`<md-option value=${lang.code}>${lang.label}</md-option>`
              )}
            </md-select>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return this.renderLoading();
    }

    if (this.error) {
      return this.renderError();
    }

    return html`
      <div class="container">
        <md-segmented-button
          .value=${this.activeSection}
          @segment-change=${(e: CustomEvent) =>
            (this.activeSection = e.detail.value)}
        >
          <md-segment value="profile">Profile</md-segment>
          <md-segment value="privacy">Privacy</md-segment>
          <md-segment value="posting">Posting</md-segment>
        </md-segmented-button>

        <div
          class="section-content ${this.activeSection === 'profile'
            ? 'active'
            : ''}"
        >
          ${this.renderProfileTab()}
        </div>
        <div
          class="section-content ${this.activeSection === 'privacy'
            ? 'active'
            : ''}"
        >
          ${this.renderPrivacyTab()}
        </div>
        <div
          class="section-content ${this.activeSection === 'posting'
            ? 'active'
            : ''}"
        >
          ${this.renderPostingTab()}
        </div>

        <div class="actions">
          <md-button variant="text" @click=${() => router.navigate('/home')}>
            Cancel
          </md-button>
          <md-button
            variant="filled"
            @click=${this.save}
            ?disabled=${this.saving}
          >
            ${this.saving ? 'Saving...' : 'Save Changes'}
          </md-button>
        </div>
      </div>

      <md-toast></md-toast>
    `;
  }
}
