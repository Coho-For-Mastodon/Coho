import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

import './md/md-dialog';
import './md/md-button';

@localized()
@customElement('shortcuts-help-dialog')
export class ShortcutsHelpDialog extends LitElement {
  @state() open: boolean = false;

  static styles = css`
    :host {
      display: contents;
    }

    md-dialog::part(dialog) {
      max-width: 600px;
      max-height: 80vh;
    }

    h3 {
      margin-top: 20px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--md-sys-color-primary, #6750a4);
    }

    h3:first-child {
      margin-top: 0;
    }

    .shortcut-list {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .shortcut-item {
      display: contents;
    }

    .shortcut-description {
      font-size: 14px;
      color: var(--md-sys-color-on-surface, #1c1b1f);
    }

    .shortcut-keys {
      display: flex;
      gap: 4px;
      justify-content: flex-end;
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 8px;
      font-family: ui-monospace, 'SF Mono', Monaco, 'Andale Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      background: var(
        --md-sys-color-surface-container-high,
        rgba(0, 0, 0, 0.08)
      );
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: var(--md-sys-shape-corner-small);
      box-shadow: 0 1px 0 var(--md-sys-color-outline-variant, #cac4d0);
    }

    .plus {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    @media (prefers-color-scheme: dark) {
      .shortcut-description {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      kbd {
        background: var(
          --md-sys-color-surface-container-highest,
          rgba(255, 255, 255, 0.12)
        );
        border-color: var(--md-sys-color-outline-variant, #444);
        box-shadow: 0 1px 0 var(--md-sys-color-outline-variant, #444);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      'show-shortcuts-help',
      this._handleShowShortcutsHelp
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      'show-shortcuts-help',
      this._handleShowShortcutsHelp
    );
  }

  private _handleShowShortcutsHelp = () => {
    this.show();
  };

  public show() {
    this.open = true;
  }

  public hide() {
    this.open = false;
  }

  private _renderShortcut(description: string, keys: string[]) {
    return html`
      <li class="shortcut-item">
        <span class="shortcut-description">${description}</span>
        <span class="shortcut-keys">
          ${keys.map(
            (key, index) => html`
              <kbd>${key}</kbd>
              ${
                index < keys.length - 1 ? html`<span class="plus">+</span>` : ''
              }
            `
          )}
        </span>
      </li>
    `;
  }

  render() {
    return html`
      <md-dialog
        .open=${this.open}
        @md-dialog-hide=${() => (this.open = false)}
        label="${msg('Keyboard Shortcuts')}"
      >
        <div>
          <h3>${msg('Navigation')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('Go to Home'), ['g', 'h'])}
            ${this._renderShortcut(msg('Go to Notifications'), ['g', 'n'])}
            ${this._renderShortcut(msg('Go to Search'), ['g', 's'])}
            ${this._renderShortcut(msg('Go to Bookmarks'), ['g', 'b'])}
            ${this._renderShortcut(msg('Go to Favorites'), ['g', 'f'])}
            ${this._renderShortcut(msg('Go to Profile'), ['g', 'p'])}
            ${this._renderShortcut(msg('Go to Messages'), ['g', 'm'])}
          </ul>

          <h3>${msg('Timeline')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('Next post'), ['j'])}
            ${this._renderShortcut(msg('Previous post'), ['k'])}
            ${this._renderShortcut(msg('Refresh timeline'), ['.'])}
          </ul>

          <h3>${msg('Post Actions (when focused)')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('Open post'), ['Enter'])}
            ${this._renderShortcut(msg('Reply'), ['r'])}
            ${this._renderShortcut(msg('Boost'), ['b'])}
            ${this._renderShortcut(msg('Favorite'), ['f'])}
            ${this._renderShortcut(msg('Bookmark'), ['s'])}
            ${this._renderShortcut(msg('Expand thread'), ['x'])}
          </ul>

          <h3>${msg('Actions')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('New post'), ['n'])}
            ${this._renderShortcut(msg('Focus search'), ['/'])}
            ${this._renderShortcut(msg('Show shortcuts help'), ['?'])}
          </ul>

          <h3>${msg('Composing')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('Publish post'), ['Ctrl/⌘', 'Enter'])}
          </ul>

          <h3>${msg('Media')}</h3>
          <ul class="shortcut-list">
            ${this._renderShortcut(msg('Previous image'), ['←'])}
            ${this._renderShortcut(msg('Next image'), ['→'])}
            ${this._renderShortcut(msg('Close preview'), ['Esc'])}
          </ul>
        </div>

        <md-button slot="footer" variant="filled" @click=${() => this.hide()}>
          ${msg('Close')}
        </md-button>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shortcuts-help-dialog': ShortcutsHelpDialog;
  }
}
