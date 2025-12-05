import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-area.js';
import './md/md-skeleton.js';

@customElement('media-edit-dialog')
export class MediaEditDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) imageSrc = '';
  @property({ type: String }) description = '';
  @property({ type: String }) mediaId = '';

  @state() imageLoaded = false;

  static styles = css`
    .preview-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
      background: var(--md-sys-color-surface-container, #f0f0f0);
      border-radius: 8px;
      padding: 1rem;
      min-height: 300px;
      align-items: center;
    }

    img {
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
      border-radius: 4px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    md-text-area {
      margin-bottom: 1rem;
      display: block;
    }
  `;

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('imageSrc')) {
      this.imageLoaded = false;
    }
  }

  private handleImageLoad() {
    this.imageLoaded = true;
  }

  private handleSave() {
    this.dispatchEvent(
      new CustomEvent('save', {
        detail: {
          id: this.mediaId,
          description: this.description,
        },
      })
    );
    this.close();
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  private handleDialogHide(e: Event) {
    e.stopPropagation();
    this.close();
  }

  private handleDialogShow(e: Event) {
    e.stopPropagation();
  }

  render() {
    return html`
      <md-dialog
        label="Edit Media Description"
        .open="${this.open}"
        @md-dialog-hide="${this.handleDialogHide}"
        @md-dialog-show="${this.handleDialogShow}"
      >
        <div class="preview-container">
          ${!this.imageLoaded
        ? html`<md-skeleton width="100%" height="300px"></md-skeleton>`
        : ''}
          ${this.imageSrc
        ? html` <img
                src="${this.imageSrc}"
                alt="Preview"
                @load="${this.handleImageLoad}"
                style="${this.imageLoaded ? '' : 'display: none;'}"
              />`
        : ''}
        </div>

        <md-text-area
          label="Alt Text"
          placeholder="Describe this image for people with visual impairments"
          rows="4"
          .value="${this.description}"
          @input="${(e: Event) => (this.description = (e.target as HTMLTextAreaElement).value)}"
        ></md-text-area>

        <div slot="footer" class="actions">
          <md-button variant="text" @click="${this.close}">Cancel</md-button>
          <md-button variant="filled" @click="${this.handleSave}"
            >Save</md-button
          >
        </div>
      </md-dialog>
    `;
  }
}
