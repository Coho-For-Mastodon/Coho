import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('timeline-list')
export class TimelineList extends LitElement {
  static styles = css`
    :host {
      display: block;
      contain: layout style paint;
      content-visibility: auto;
    }

    ul {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
      gap: var(--timeline-list-gap, 16px);
      height: var(--timeline-list-height, 90vh);
      overflow-y: scroll;
      overflow-x: hidden;
    }
  `;

  render() {
    return html`<ul part="list" class="scrollbar-hidden">
      <slot></slot>
    </ul>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'timeline-list': TimelineList;
  }
}
