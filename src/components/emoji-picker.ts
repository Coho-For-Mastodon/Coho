import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import './md/md-text-field';

import type { Emoji } from '../mastodon/types/account';
import { getPickerEmojis, type EmojiCategory } from '../services/custom-emojis';

@localized()
@customElement('emoji-picker')
export class EmojiPicker extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _categories: EmojiCategory[] = [];
  @state() private _query = '';

  private _onDocumentClick = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._emitClose();
    }
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      z-index: 100;
    }

    .picker {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border-radius: var(--md-sys-shape-corner-large, 16px);
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.12);
      width: 320px;
      max-height: 360px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: pickerFadeIn 0.15s ease-out;
    }

    @keyframes pickerFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .search {
      padding: 8px 10px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      flex-shrink: 0;
    }

    .search md-text-field {
      width: 100%;
    }

    .scroll-area {
      overflow-y: auto;
      flex: 1;
      padding: 4px 6px 8px;
    }

    .category-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      padding: 8px 4px 4px;
      position: sticky;
      top: -8px;
      background: var(--md-sys-color-surface-container, #f3edf7);
      z-index: 1;
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
      gap: 2px;
    }

    .emoji-tile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--md-sys-shape-corner-small, 8px);
      cursor: pointer;
      border: none;
      background: transparent;
      padding: 4px;
      transition: background 0.1s ease;
    }

    .emoji-tile:hover {
      background: var(--md-sys-color-surface-container-highest, #e6e0e9);
    }

    .emoji-tile:active {
      background: var(--md-sys-color-primary-container, #eaddff);
    }

    .emoji-tile img {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }

    .empty {
      padding: 16px;
      text-align: center;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 13px;
    }

    @media (max-width: 400px) {
      .picker {
        width: calc(100vw - 32px);
      }
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._categories = getPickerEmojis();
        this._query = '';
        requestAnimationFrame(() => {
          document.addEventListener('click', this._onDocumentClick, true);
        });
      } else {
        document.removeEventListener('click', this._onDocumentClick, true);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocumentClick, true);
  }

  private _emitClose() {
    this.dispatchEvent(
      new CustomEvent('emoji-picker-close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onSearch(e: InputEvent) {
    this._query = (e.target as HTMLInputElement).value.toLowerCase();
  }

  private _selectEmoji(emoji: Emoji) {
    this.dispatchEvent(
      new CustomEvent('emoji-select', {
        detail: { shortcode: emoji.shortcode, url: emoji.url },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _filteredCategories(): EmojiCategory[] {
    if (!this._query) return this._categories;

    const q = this._query;
    const result: EmojiCategory[] = [];
    for (const cat of this._categories) {
      const filtered = cat.emojis.filter((e) =>
        e.shortcode.toLowerCase().includes(q)
      );
      if (filtered.length > 0) {
        result.push({ name: cat.name, emojis: filtered });
      }
    }
    return result;
  }

  render() {
    if (!this.open) return nothing;

    const categories = this._filteredCategories();

    return html`
      <div class="picker">
        <div class="search">
          <md-text-field
            placeholder=${msg('Search emoji...')}
            .value=${this._query}
            @input=${this._onSearch}
          ></md-text-field>
        </div>
        <div class="scroll-area">
          ${categories.length === 0
            ? html`<div class="empty">${msg('No emoji found')}</div>`
            : categories.map(
                (cat) => html`
                  <div class="category-title">${cat.name}</div>
                  <div class="emoji-grid">
                    ${cat.emojis.map(
                      (emoji) => html`
                        <button
                          class="emoji-tile"
                          title=":${emoji.shortcode}:"
                          @click=${() => this._selectEmoji(emoji)}
                        >
                          <img
                            src="${emoji.static_url || emoji.url}"
                            alt=":${emoji.shortcode}:"
                            loading="lazy"
                          />
                        </button>
                      `
                    )}
                  </div>
                `
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'emoji-picker': EmojiPicker;
  }
}
