import { LitElement } from 'lit';
import './md/md-button.js';
import './md/md-icon.js';
import { Settings } from '../services/settings';
export declare class AppTheme extends LitElement {
    primary_color: string;
    font_size: string;
    settings: Settings | undefined;
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    chooseColor(color: string): void;
    /**
     * Apply theme color to both Shoelace and MD3 design tokens
     */
    private applyThemeColor;
    /**
     * Parse any color format (hex, rgb, rgba) to RGB components
     */
    private parseColor;
    /**
     * Mix two colors in sRGB color space
     * @param color1 First color (hex or rgb format)
     * @param color2 Second color (hex or rgb format)
     * @param weight Weight of color1 (0-100)
     */
    private mixColors;
    /**
     * Update the theme-color meta tags with tinted background colors
     * This affects the Window Controls Overlay / titlebar area
     */
    private updateThemeMetaTags;
    LightenDarkenColor(col: string, amt: number): string;
    changeFontSize(size: string): void;
    customColor(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}
