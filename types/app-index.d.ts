import { LitElement } from 'lit';
import './pages/app-login';
import './components/header';
import './components/image-preview-dialog';
export declare class AppIndex extends LitElement {
    static get styles(): import("lit").CSSResult;
    constructor();
    connectedCallback(): Promise<void>;
    /**
     * Sync credentials from localStorage to IndexedDB
     * This ensures the service worker has access to the latest tokens
     */
    private syncCredentialsToIndexedDB;
    /**
     * Warm the service worker cache for notifications, bookmarks, and favorites
     * Only if user has good network and data saver is off
     */
    private warmCacheIfAppropriate;
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
    /**
     * Adjust color brightness (from app-theme component)
     */
    private adjustColorBrightness;
    firstUpdated(): void;
    render(): import("lit-html").TemplateResult<1>;
}
