import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './md/md-text-field';
import './md/md-text-area';
import './md/md-checkbox';
import './md/md-button';
import { editAccount, getCurrentUser } from '../services/account';
import { fileOpen } from 'browser-fs-access';
import type { MdTextField } from './md/md-text-field';
import type { MdTextArea } from './md/md-text-area';
import type { MdCheckbox } from './md/md-checkbox';

@customElement('edit-account')
export class EditAccount extends LitElement {
  @state() newAvatar: File | null = null;
  @state() newHeader: File | null = null;

  @query('#display_name') private displayNameField!: MdTextField;
  @query('#note') private noteField!: MdTextArea;
  @query('#locked') private lockedCheckbox!: MdCheckbox;
  @query('#bot') private botCheckbox!: MdCheckbox;
  @query('#avatar-preview') private avatarPreview!: HTMLImageElement;
  @query('#header-preview') private headerPreview!: HTMLImageElement;
  @query('#avatar') private avatarInput!: HTMLInputElement;
  @query('#header') private headerInput!: HTMLInputElement;

  static styles = [
    css`
      :host {
        display: block;
      }

      form {
        display: flex;
        flex-direction: column;

        width: 50vw;
        padding: 10px;

        gap: 10px;

        background: #ffffff12;
        border-radius: 6px;

        height: 86vh;
        overflow-y: auto;
      }

      form::-webkit-scrollbar {
        display: none;
      }

      form label {
        font-weight: bold;
      }

      md-text-area {
        height: 200px;
      }

      #submit {
        place-self: flex-end;
      }

      .image-wrapper {
        display: flex;
        flex-direction: column;
      }

      .image-wrapper img {
        width: 130px;
        height: 130px;
        object-fit: cover;
        border-radius: 6px;
      }

      .image-wrapper md-button {
        place-self: flex-start;
        margin-top: 10px;
      }

      @media (max-width: 820px) {
        form {
          width: 90vw;
        }
      }
    `,
  ];

  async firstUpdated() {
    this.resetForm();
  }

  async resetForm() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    if (this.displayNameField) {
      this.displayNameField.value = currentUser.display_name;
    }

    if (this.noteField) {
      this.noteField.value = currentUser.note;
    }

    if (this.lockedCheckbox) {
      this.lockedCheckbox.checked = currentUser.locked;
    }

    if (this.botCheckbox) {
      this.botCheckbox.checked = currentUser.bot;
    }

    if (this.avatarPreview) {
      this.avatarPreview.src = currentUser.avatar;
    }

    if (this.headerPreview) {
      this.headerPreview.src = currentUser.header;
    }

    if (this.avatarInput) {
      this.avatarInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          if (this.avatarPreview) {
            this.avatarPreview.src = reader.result as string;
          }
        });
        reader.readAsDataURL(file);
      });
    }

    if (this.headerInput) {
      this.headerInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          if (this.headerPreview) {
            this.headerPreview.src = reader.result as string;
          }
        });
        reader.readAsDataURL(file);
      });
    }
  }

  async submitProfile() {
    const data = {
      display_name: this.displayNameField?.value || '',
      note: this.noteField?.value || '',
      locked: this.lockedCheckbox?.checked ? 'true' : 'false',
      bot: this.botCheckbox?.checked ? 'true' : 'false',
      avatar: this.newAvatar,
      header: this.newHeader,
    };

    console.log(data);

    await editAccount(
      data.display_name,
      data.note,
      data.locked,
      data.bot,
      data.avatar || '',
      data.header || ''
    );
  }

  async changeAvatar() {
    const blob = await fileOpen({
      mimeTypes: ['image/*'],
      startIn: 'pictures',
    });

    const blobURL = URL.createObjectURL(blob);

    if (blobURL) {
      const avatarPreview = this.shadowRoot?.querySelector('#avatar-preview');
      if (avatarPreview) {
        avatarPreview.setAttribute('src', blobURL);

        this.newAvatar = blob;
      }
    }
  }

  async changeHeader() {
    const blob = await fileOpen({
      mimeTypes: ['image/*'],
      startIn: 'pictures',
    });

    const blobURL = URL.createObjectURL(blob);

    if (blobURL) {
      const headerPreview = this.shadowRoot?.querySelector('#header-preview');
      if (headerPreview) {
        headerPreview.setAttribute('src', blobURL);

        this.newHeader = blob;
      }
    }
  }

  render() {
    return html`
      <form>
        <label for="name">Name</label>
        <md-text-field
          type="text"
          id="display_name"
          name="display_name"
          .placeholder="${'Your name..'}"
        ></md-text-field>

        <label for="bio">Bio</label>
        <md-text-area
          id="note"
          name="note"
          .placeholder="${'Write something about yourself..'}"
        >
        </md-text-area>

        <div class="image-wrapper">
          <label for="avatar">Avatar</label>

          <img
            id="avatar-preview"
            src="/assets/icons/256-icon.png"
            alt="Avatar preview"
          />

          <md-button variant="filled" @click="${() => this.changeAvatar()}"
            >Choose New</md-button
          >
        </div>

        <div class="image-wrapper">
          <label for="header">Header</label>

          <img
            id="header-preview"
            src="/assets/icons/256-icon.png"
            alt="Header preview"
          />

          <md-button variant="filled" @click="${() => this.changeHeader()}"
            >Choose New</md-button
          >
        </div>

        <label for="locked">Locked</label>
        <md-checkbox id="locked" name="locked"></md-checkbox>

        <label for="bot">Bot</label>
        <md-checkbox id="bot" name="bot"></md-checkbox>

        <md-button
          @click="${() => this.submitProfile()}"
          id="submit"
          variant="filled"
          >Submit</md-button
        >
      </form>
    `;
  }
}
