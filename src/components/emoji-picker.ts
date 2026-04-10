import { LitElement, html, css } from 'lit';
import { customElement, state, property, query } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import { localized, msg } from '@lit/localize';

import './md/md-text-field';

import type { Emoji } from '../mastodon/types/account';
import { getPickerEmojis, type EmojiCategory } from '../services/custom-emojis';

@localized()
@customElement('emoji-picker')
export class EmojiPicker extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) anchorElement: HTMLElement | null = null;

  @state() private _categories: EmojiCategory[] = [];
  @state() private _query = '';

  @query('.picker') private _pickerEl!: HTMLElement;

  static styles = css`
    :host {
      display: contents;
    }

    .picker {
      margin: 0;
      padding: 0;
      border: none;
      background: var(--md-sys-color-surface-container, #f3edf7);
      border-radius: var(--md-sys-shape-corner-large, 16px);
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.12);
      width: 320px;
      max-width: calc(100vw - 32px);
      max-height: 360px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: fixed;
      inset: auto;

      opacity: 1;
      transform: translateY(0);
      transition:
        opacity 0.15s ease-out,
        transform 0.15s ease-out,
        display 0.15s ease-out allow-discrete,
        overlay 0.15s ease-out allow-discrete;
    }

    .picker:not(:popover-open) {
      opacity: 0;
      transform: translateY(4px);
    }

    @starting-style {
      .picker:popover-open {
        opacity: 0;
        transform: translateY(4px);
      }
    }

    .picker::backdrop {
      background: transparent;
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

  updated(changed: PropertyValues) {
    if (changed.has('open') || changed.has('anchorElement')) {
      if (this.open) {
        this._categories = getPickerEmojis();
        this._query = '';
      }
      this._syncPopover();
    }
  }

  private _syncPopover() {
    const el = this._pickerEl;
    if (!el) return;

    if (this.open && !el.matches(':popover-open')) {
      this._positionPicker();
      el.showPopover();
    } else if (!this.open && el.matches(':popover-open')) {
      el.hidePopover();
    }
  }

  private _positionPicker() {
    const el = this._pickerEl;
    if (!el) return;

    // Use the provided anchor element, or fall back to previous sibling / host
    const anchor =
      this.anchorElement ??
      (this.previousElementSibling as HTMLElement | null) ??
      this;
    const anchorRect = anchor.getBoundingClientRect();
    const pickerWidth = 320;
    const pickerHeight = 360;

    // Default: above the anchor, right-aligned to anchor's right edge
    let top = anchorRect.top - pickerHeight - 4;
    let left = anchorRect.right - pickerWidth;

    // Flip below if not enough space above
    if (top < 8) {
      top = anchorRect.bottom + 6;
    }

    // Clamp horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  private _handleToggle(e: ToggleEvent) {
    if (e.newState === 'closed' && this.open) {
      this.open = false;
      this._emitClose();
    }
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
    const categories = this._filteredCategories();

    return html`
      <div class="picker" popover="auto" @toggle=${this._handleToggle}>
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
