import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { localized, msg } from '@lit/localize';

import './md/md-text-field';
import './md/md-text-area';
import './md/md-button';
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

  // Form values - Profile
  @state() private displayName = '';
  @state() private bio = '';
  @state() private fields: ProfileField[] = [];
  @state() private newAvatar: File | null = null;
  @state() private newHeader: File | null = null;
  @state() private avatarPreviewUrl = '';
  @state() private headerPreviewUrl = '';

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
      border-radius: var(--md-sys-shape-corner-circle);
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
      border-radius: var(--md-sys-shape-corner-large);
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
      border-radius: var(--md-sys-shape-corner-circle);
      object-fit: cover;
      border: 3px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .header-preview {
      width: 200px;
      height: 67px;
      border-radius: var(--md-sys-shape-corner-medium);
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
      border-radius: var(--md-sys-shape-corner-circle);
    }

    .header-preview + .image-change-overlay {
      border-radius: var(--md-sys-shape-corner-medium);
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
        border-radius: var(--md-sys-shape-corner-medium);
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
        fields_attributes: this.fields.filter((f) => f.name || f.value),
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
                  src=${this.avatarPreviewUrl ||
                  '/assets/icons/new-icons/icon-256x256.png'}
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
                  src=${this.headerPreviewUrl ||
                  '/assets/icons/new-icons/icon-256x256.png'}
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
            </div>
          </div>
        </div>

        <!-- Profile Fields Section -->
        <div class="section-card">
          <span class="section-title">${msg('Profile Metadata')}</span>
          <p
            style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); margin: 0;"
          >
            ${msg('Add up to 4 custom fields to display on your profile.')}
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
                    label=${msg('Remove field')}
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

  render() {
    if (this.loading) {
      return this.renderLoading();
    }

    if (this.error) {
      return this.renderError();
    }

    return html`
      <div class="container">
        ${this.renderProfileTab()}

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
