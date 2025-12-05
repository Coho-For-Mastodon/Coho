import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import './md/md-menu.js';
import './md/md-menu-item.js';

@customElement('right-click')
export class RightClick extends LitElement {
  static styles = [
    css`
      :host {
        display: block;

        content-visibility: auto;
        contain: layout style paint;

        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        right: 0;
        bottom: 0;
        z-index: 2;

        pointer-events: none;
      }

      #context-menu {
        position: fixed;
        z-index: 10000;
        width: fit-content;
        overflow-x: hidden;
        background: #1blala;
        border-radius: 5px;
        display: none;
        pointer-events: none;
        opacity: 0;

        backdrop-filter: blur(48px);

        animation-name: fadeIn;
        animation-duration: 0.12s;
        animation-fill-mode: forwards;
        animation-timing-function: ease-in-out;
        transform-origin: top left;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }

        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      #context-menu.visible {
        display: block;
        pointer-events: auto;
      }
    `,
  ];

  firstUpdated() {
    const contextMenu = this.shadowRoot?.getElementById('context-menu');
    const scope = document.querySelector('body');

    // check if we are on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (scope && contextMenu && !isMobile) {
      if (scope && contextMenu) {
        scope.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          const { clientX: mouseX, clientY: mouseY } = event;
          contextMenu.style.top = `${mouseY}px`;
          contextMenu.style.left = `${mouseX}px`;

          contextMenu.classList.remove('visible');

          setTimeout(() => {
            contextMenu.classList.add('visible');
          }, 300);

          event.preventDefault();
        });

        scope.addEventListener('click', (e) => {
          if ((e.target as HTMLElement)?.offsetParent !== contextMenu) {
            contextMenu.classList.remove('visible');
          }
        });
      }
    }
  }

  render() {
    return html`
      <div id="context-menu">
        <slot></slot>
      </div>
    `;
  }
}
