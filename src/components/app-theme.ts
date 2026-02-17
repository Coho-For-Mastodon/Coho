import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './md/md-button.js';
import './md/md-icon.js';

import { getSettings, setSettings, Settings } from '../services/settings';
import { applyThemeColor } from '../utils/theme-color';

@customElement('app-theme')
export class AppTheme extends LitElement {
  @state() primary_color: string = '#5171a5';
  @state() font_size: string = '16px';

  settings: Settings | undefined;

  static styles = [
    css`
      :host {
        display: block;

        content-visibility: auto;
        contain: layout style paint;
      }

      md-button::part(button) {
        height: 48px;
        width: 48px;
        border-radius: var(--md-sys-shape-corner-circle);
      }

      #open-button {
        position: fixed;
        bottom: 20px;
        left: 16px;
      }

      #blue {
        background-color: #5171a5;
      }

      #green {
        background-color: #95b8d1;
      }

      #red {
        background-color: #b8e0d4;
      }

      #yellow {
        background-color: #d6eadf;
      }

      #purple {
        background-color: #eac4d5;
      }

      #orange {
        background-color: #c095e4;
      }

      #pink {
        background-color: #f8bbd0;
      }

      #brown {
        background-color: #d7ccc8;
      }

      #deep-purple {
        background-color: #673ab7;
      }

      #indigo {
        background-color: #3f51b5;
      }

      #light-blue {
        background-color: #03a9f4;
      }

      #cyan {
        background-color: #00bcd4;
      }

      #teal {
        background-color: #009688;
      }

      #light-green {
        background-color: #8bc34a;
      }

      #lime {
        background-color: #cddc39;
      }

      #amber {
        background-color: #ffc107;
      }

      #deep-orange {
        background-color: #ff5722;
      }

      #grey {
        background-color: #9e9e9e;
      }

      #blue-grey {
        background-color: #607d8b;
      }

      #custom {
        background-color: #057dcd;
      }

      .color {
        width: 40px;
        height: 40px;
        border-radius: var(--md-sys-shape-corner-circle);
        cursor: pointer;
        border: 4px solid var(--sl-color-primary-600);
      }

      #colors-grid {
        display: grid;
        grid-template-columns: repeat(3, 0.2fr);
        gap: 18px;
      }

      span {
        font-size: var(--md-sys-typescale-title-large-font-size);
        font-weight: bold;
        margin-bottom: 16px;
        display: block;
      }

      #wrapper {
        display: flex;
        flex-direction: column;
        gap: 40px;
      }
    `,
  ];

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    this.settings = await getSettings();
    console.log('this.settings', this.settings);

    const potentialColor = this.settings.primary_color;
    const potentialFontSize = this.settings.font_size;

    if (potentialColor) {
      this.primary_color = potentialColor;
      applyThemeColor(potentialColor);
    } else {
      // get css variable color
      const color = getComputedStyle(document.body).getPropertyValue(
        '--sl-color-primary-600'
      );
      this.primary_color = color;

      document
        .querySelector('html')!
        .style.setProperty('--primary-color', color);
    }

    if (potentialFontSize) {
      this.font_size = potentialFontSize;
      document.body.style.setProperty(
        '--sl-font-size-medium',
        potentialFontSize
      );
    } else {
      // get css variable size
      const fontSize = getComputedStyle(document.body).getPropertyValue(
        '--sl-font-size-medium'
      );
      this.font_size = fontSize;
    }
  }

  chooseColor(color: string) {
    this.primary_color = color;

    setSettings({
      primary_color: color,
      font_size: this.font_size,
      data_saver: this.settings!.data_saver,
      wellness: this.settings!.wellness,
      focus: this.settings!.focus,
    });

    // Apply to both Shoelace and MD3 design tokens
    applyThemeColor(color);
  }

  changeFontSize(size: string) {
    setSettings({
      primary_color: this.settings!.primary_color,
      font_size: `${size}px`,
      data_saver: this.settings!.data_saver,
      wellness: this.settings!.wellness,
      focus: this.settings!.focus,
    });

    this.font_size = `${size}px`;

    // set css variable color
    document.documentElement.style.setProperty(
      '--sl-font-size-medium',
      `${size}px`
    );
  }

  async customColor() {
    const eyeDropper = new window.EyeDropper();

    const color = await eyeDropper.open();
    this.chooseColor(color.sRGBHex);
  }

  render() {
    return html`
      <div id="wrapper">
        <div>
          <span>Primary Color</span>
          <div id="colors-grid">
            <!-- list of pastel colors -->
            <div
              class="color"
              id="blue"
              @click="${() => this.chooseColor('#5171a5')}"
            ></div>
            <div
              class="color"
              id="green"
              @click="${() => this.chooseColor('#95b8d1')}"
            ></div>
            <div
              class="color"
              id="red"
              @click="${() => this.chooseColor('#b8e0d4')}"
            ></div>
            <div
              class="color"
              id="yellow"
              @click="${() => this.chooseColor('#d6eadf')}"
            ></div>
            <div
              class="color"
              id="purple"
              @click="${() => this.chooseColor('#eac4d5')}"
            ></div>
            <div
              class="color"
              id="orange"
              @click="${() => this.chooseColor('#c095e4')}"
            ></div>
            <div
              class="color"
              id="pink"
              @click="${() => this.chooseColor('#f8bbd0')}"
            ></div>
            <div
              class="color"
              id="brown"
              @click="${() => this.chooseColor('#d7ccc8')}"
            ></div>
            <div
              class="color"
              id="custom"
              @click="${() => this.chooseColor('#057dcd')}"
            ></div>

            ${'EyeDropper' in window
              ? html`<md-button circle @click="${() => this.customColor()}">
                  <md-icon src="/assets/add-outline.svg"></md-icon>
                </md-button>`
              : null}
          </div>
        </div>
      </div>
    `;
  }
}
