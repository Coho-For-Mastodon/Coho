import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './md/md-button.js';
import './md/md-icon.js';

import { getSettings, setSettings, Settings } from '../services/settings';

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
        border-radius: 50%;
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
        border-radius: 50%;
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
      this.applyThemeColor(potentialColor);
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
    this.applyThemeColor(color);
  }

  /**
   * Apply theme color to both Shoelace and MD3 design tokens
   */
  private applyThemeColor(color: string) {
    const root = document.documentElement;

    // Shoelace tokens
    root.style.setProperty('--sl-color-primary-600', color);
    root.style.setProperty('--primary-color', color);

    const littleLighter = this.LightenDarkenColor(color, 40);
    root.style.setProperty('--sl-color-primary-500', littleLighter);

    const littleDarker = this.LightenDarkenColor(color, -40);
    root.style.setProperty('--sl-color-primary-700', littleDarker);

    // MD3 tokens - primary color (set on :root for highest priority)
    root.style.setProperty('--md-sys-color-primary', color);
    root.style.setProperty('--md-sys-color-outline', color);

    // Also update body for legacy support
    document.body.style.setProperty('--sl-color-primary-600', color);
    document.body.style.setProperty('--md-sys-color-primary', color);
    document.body.style.setProperty('--md-sys-color-outline', color);

    // Update theme-color meta tags with tinted background
    this.updateThemeMetaTags(color);
  }

  /**
   * Parse any color format (hex, rgb, rgba) to RGB components
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    color = color.trim();

    // Handle rgb/rgba format: rgb(r, g, b) or rgb(r g b)
    const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    // Handle hex format
    let hex = color.replace('#', '');
    // Handle shorthand hex (#abc -> #aabbcc)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  /**
   * Mix two colors in sRGB color space
   * @param color1 First color (hex or rgb format)
   * @param color2 Second color (hex or rgb format)
   * @param weight Weight of color1 (0-100)
   */
  private mixColors(color1: string, color2: string, weight: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);
    const w = weight / 100;

    const r = Math.round(c1.r * w + c2.r * (1 - w));
    const g = Math.round(c1.g * w + c2.g * (1 - w));
    const b = Math.round(c1.b * w + c2.b * (1 - w));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Update the theme-color meta tags with tinted background colors
   * This affects the Window Controls Overlay / titlebar area
   */
  private updateThemeMetaTags(primaryColor: string) {
    // Calculate tinted backgrounds matching CSS: color-mix(in srgb, primary X%, base)
    // These match --md-sys-color-background from md-tokens.css:
    // Dark: color-mix(in srgb, var(--md-sys-color-primary) 5%, #141314)
    // Light: color-mix(in srgb, var(--md-sys-color-primary) 10%, #ffffff)
    const lightBackground = this.mixColors(primaryColor, '#ffffff', 10);
    const darkBackground = this.mixColors(primaryColor, '#141314', 5);

    // Find and update the meta tags
    const darkMeta = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
    );
    const lightMeta = document.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
    );

    if (darkMeta) {
      darkMeta.setAttribute('content', darkBackground);
    }
    if (lightMeta) {
      lightMeta.setAttribute('content', lightBackground);
    }
  }

  LightenDarkenColor(col: string, amt: number) {
    let usePound = false;
    if (col[0] == '#') {
      col = col.slice(1);
      usePound = true;
    }

    const num = parseInt(col, 16);

    let r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if (r < 0) r = 0;

    let b = ((num >> 8) & 0x00ff) + amt;

    if (b > 255) b = 255;
    else if (b < 0) b = 0;

    let g = (num & 0x0000ff) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16);
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
