import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-area.js';
import './md/md-skeleton.js';
import {
  FILTER_PRESETS,
  applyFilter,
  generateFilterThumbnail,
} from '../services/image-filters';

@localized()
@customElement('media-edit-dialog')
export class MediaEditDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) imageSrc = '';
  @property({ type: String }) description = '';
  @property({ type: String }) mediaId = '';

  @state() imageLoaded = false;
  @state() generating = false;
  @state() promptAPIAvailable = false;
  @state() selectedFilter = 'none';
  @state() filterThumbnails: Record<string, string> = {};
  @state() previewUrl = ''; // The filtered preview
  @state() editedBlob: Blob | null = null;
  @state() isProcessing = false;
  @state() isUploading = false;

  async connectedCallback() {
    super.connectedCallback();
    const { isPromptAPIAvailable } = await import('../services/ai');
    this.promptAPIAvailable = isPromptAPIAvailable();
  }

  static styles = css`
    .preview-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
      background: transparent;
      border-radius: 8px;
      padding: 1rem;
      min-height: 200px;
      max-height: 300px;
      align-items: center;
      overflow: hidden;
      position: relative;
    }

    img {
      max-width: 100%;
      max-height: 280px;
      object-fit: contain;
      border-radius: 4px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    md-text-area {
      margin-bottom: 0.5rem;
      display: block;
    }

    .generate-alt-container {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 1rem;
    }

    .generate-alt-container md-button {
      font-size: var(--md-sys-typescale-label-small-font-size, 12px);
    }

    .filter-section {
      margin-bottom: 1rem;
    }

    .filter-section-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .filter-presets {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0;
      -webkit-overflow-scrolling: touch;
    }

    .filter-preset {
      flex-shrink: 0;
      width: 70px;
      cursor: pointer;
      text-align: center;
      border-radius: 8px;
      padding: 4px;
      border: 2px solid transparent;
      transition: all 150ms ease;
      background: transparent;
    }

    .filter-preset:hover {
      background: var(--md-sys-color-surface-container-high, #e6e0e9);
    }

    .filter-preset.active {
      border-color: var(--md-sys-color-primary, #6750a4);
      background: var(--md-sys-color-primary-container, #eaddff);
    }

    .filter-preset-image {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      object-fit: cover;
      background: var(--md-sys-color-surface-container, #f0f0f0);
    }

    .filter-preset-label {
      font-size: 11px;
      margin-top: 4px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .filter-preset.active .filter-preset-label {
      color: var(--md-sys-color-on-primary-container, #21005d);
      font-weight: 500;
    }

    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }

    .processing-text {
      color: white;
      font-size: 14px;
    }

    @media (prefers-color-scheme: dark) {
      .filter-preset:hover {
        background: var(--md-sys-color-surface-container-high, #2b2930);
      }
    }
  `;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('imageSrc') && this.imageSrc) {
      this.imageLoaded = false;
      this.selectedFilter = 'none';
      this.previewUrl = '';
      this.editedBlob = null;
      this.filterThumbnails = {};
      this.isUploading = false;
      // Generate thumbnails when image source changes
      this.generateThumbnails();
    }
  }

  private async generateThumbnails() {
    if (!this.imageSrc) return;

    for (const [key, filter] of Object.entries(FILTER_PRESETS)) {
      try {
        const thumbnail = await generateFilterThumbnail(this.imageSrc, filter);
        this.filterThumbnails = { ...this.filterThumbnails, [key]: thumbnail };
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${key}:`, error);
      }
    }
  }

  private handleImageLoad() {
    this.imageLoaded = true;
  }

  private async handleFilterSelect(filterKey: string) {
    if (this.isProcessing || filterKey === this.selectedFilter) return;

    this.selectedFilter = filterKey;

    // If selecting original, clear the edited state
    if (filterKey === 'none') {
      this.previewUrl = '';
      this.editedBlob = null;
      return;
    }

    // Apply the filter
    try {
      this.isProcessing = true;
      const filter = FILTER_PRESETS[filterKey];
      const { blob, dataUrl } = await applyFilter(this.imageSrc, filter);
      this.previewUrl = dataUrl;
      this.editedBlob = blob;
    } catch (error) {
      console.error('Failed to apply filter:', error);
      this.selectedFilter = 'none';
      this.previewUrl = '';
      this.editedBlob = null;
    } finally {
      this.isProcessing = false;
    }
  }

  private handleSave() {
    this.isUploading = true;
    this.dispatchEvent(
      new CustomEvent('save', {
        detail: {
          id: this.mediaId,
          description: this.description,
          editedBlob: this.editedBlob, // Include edited image if filter was applied
        },
      })
    );
    // Dialog will be closed by parent after upload completes via completeUpload()
  }

  // Called by parent when upload is complete
  public completeUpload(success: boolean) {
    this.isUploading = false;
    if (success) {
      this.close();
    }
  }

  private close() {
    this.open = false;
    // Clean up preview URL to free memory
    if (this.previewUrl) {
      this.previewUrl = '';
    }
    this.editedBlob = null;
    this.selectedFilter = 'none';
    this.isUploading = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleDialogHide(e: Event) {
    e.stopPropagation();
    this.close();
  }

  private handleDialogShow(e: Event) {
    e.stopPropagation();
  }

  private async handleGenerateAlt() {
    if (!this.imageSrc || this.generating) return;

    this.generating = true;
    const { generateAltText } = await import('../services/ai');
    const result = await generateAltText(this.imageSrc);
    if (result) {
      this.description = result;
    }
    this.generating = false;
  }

  private getCurrentPreviewUrl(): string {
    return this.previewUrl || this.imageSrc;
  }

  render() {
    const currentPreview = this.getCurrentPreviewUrl();

    return html`
      <md-dialog
        label=${msg('Edit Image')}
        .open="${this.open}"
        @md-dialog-hide="${this.handleDialogHide}"
        @md-dialog-show="${this.handleDialogShow}"
      >
        <div class="preview-container">
          ${!this.imageLoaded
            ? html`<md-skeleton width="100%" height="200px"></md-skeleton>`
            : ''}
          ${currentPreview
            ? html`<img
                src="${currentPreview}"
                alt="Preview"
                @load="${this.handleImageLoad}"
                style="${this.imageLoaded ? '' : 'display: none;'}"
              />`
            : ''}
          ${this.isProcessing
            ? html`<div class="processing-overlay">
                <span class="processing-text"
                  >${msg('Applying filter...')}</span
                >
              </div>`
            : ''}
        </div>

        <div class="filter-section">
          <div class="filter-section-title">${msg('Filters')}</div>
          <div class="filter-presets">
            ${Object.entries(FILTER_PRESETS).map(
              ([key, filter]) => html`
                <button
                  class="filter-preset ${this.selectedFilter === key
                    ? 'active'
                    : ''}"
                  @click="${() => this.handleFilterSelect(key)}"
                  ?disabled="${this.isProcessing}"
                >
                  ${this.filterThumbnails[key]
                    ? html`<img
                        class="filter-preset-image"
                        src="${this.filterThumbnails[key]}"
                        alt="${filter.name}"
                      />`
                    : html`<div
                        class="filter-preset-image"
                        style="display: flex; align-items: center; justify-content: center;"
                      >
                        <md-skeleton width="60px" height="60px"></md-skeleton>
                      </div>`}
                  <div class="filter-preset-label">${filter.name}</div>
                </button>
              `
            )}
          </div>
        </div>

        <md-text-area
          label=${msg('Alt Text')}
          placeholder=${msg(
            'Describe this image for people with visual impairments'
          )}
          rows="3"
          .value="${this.description}"
          ?disabled="${this.isUploading}"
          @input="${(e: Event) =>
            (this.description = (e.target as HTMLTextAreaElement).value)}"
        ></md-text-area>

        ${this.promptAPIAvailable
          ? html`
              <div class="generate-alt-container">
                <md-button
                  variant="text"
                  size="small"
                  ?disabled="${this.generating || this.isUploading}"
                  @click="${this.handleGenerateAlt}"
                  title=${msg('On-device AI')}
                >
                  ${this.generating
                    ? msg('Generating...')
                    : msg('Generate Alt Text')}
                </md-button>
              </div>
            `
          : ''}

        <div slot="footer" class="actions">
          <md-button
            variant="text"
            @click="${this.close}"
            ?disabled="${this.isUploading}"
            >${msg('Cancel')}</md-button
          >
          <md-button
            variant="filled"
            @click="${this.handleSave}"
            ?disabled="${this.isProcessing || this.isUploading}"
          >
            ${this.isUploading
              ? msg('Uploading...')
              : this.isProcessing
                ? msg('Processing...')
                : msg('Save')}
          </md-button>
        </div>
      </md-dialog>
    `;
  }
}
