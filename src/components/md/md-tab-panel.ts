import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * MD3 Tab Panel
 *
 * Content container for tabs. Visibility controlled by parent md-tabs component.
 *
 * @slot default - Panel content
 *
 * @example
 * ```html
 * <md-tab-panel name="accounts">
 *   <p>Account list content here</p>
 * </md-tab-panel>
 * ```
 */
@customElement('md-tab-panel')
export class MdTabPanel extends LitElement {
  /**
   * Panel identifier matching md-tab's panel property
   */
  @property({ type: String }) name = '';

  /**
   * Whether panel is currently active (visible)
   */
  @property({ type: Boolean, reflect: true }) active = false;

  static styles = css`
    :host {
      display: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      animation: fadeIn 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    :host([active]) {
      display: block;
    }

    .panel-content {
      width: 100%;
      height: 100%;
      overflow: hidden;
      padding: 16px;
      padding-top: 0;
      box-sizing: border-box;
    }

    /* Optional slide animation */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Vertical tabs - slide from left/right */
    :host-context(md-tabs[orientation='vertical']) {
      animation: slideFromLeft 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes slideFromLeft {
      from {
        opacity: 0;
        transform: translateX(-16px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    :host-context(md-tabs[orientation='vertical'][placement='end']) {
      animation: slideFromRight 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes slideFromRight {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Mobile: reduce padding */
    @media (max-width: 820px) {
      .panel-content {
        padding: 12px;
        padding-top: 0;
      }
    }

    /* Allow custom padding override */
    :host([no-padding]) .panel-content {
      padding: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('active')) {
      this.setAttribute('aria-hidden', this.active ? 'false' : 'true');
    }
  }

  render() {
    return html`
      <div class="panel-content" part="panel-content">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-tab-panel': MdTabPanel;
  }
}
