import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { router } from './utils/router';

import './pages/app-login';
import './components/header';
import './components/image-preview-dialog';
import { getSettings, Settings } from './services/settings';

@customElement('app-index')
export class AppIndex extends LitElement {
  static get styles() {
    return css`
      main {
        padding-left: 0;
        padding-right: 0;
        padding-bottom: 16px;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 0;
          padding-right: 0;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }

        to {
          opacity: 0;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0.2;
        }

        to {
          opacity: 1;
        }
      }
    `;
  }

  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();

    // Sync localStorage credentials to IndexedDB for service worker access
    await this.syncCredentialsToIndexedDB();

    const settings = await getSettings();
    console.log('settings', settings);

    const potentialColor = settings.primary_color;

    if (potentialColor) {
      this.applyThemeColor(potentialColor);
    } else {
      // get css variable color
      const color = getComputedStyle(document.body).getPropertyValue(
        '--sl-color-primary-600'
      );
      this.applyThemeColor(color);
    }

    // Warm cache on app boot if conditions are good
    this.warmCacheIfAppropriate(settings);
  }

  /**
   * Sync credentials from localStorage to IndexedDB
   * This ensures the service worker has access to the latest tokens
   */
  private async syncCredentialsToIndexedDB() {
    const accessToken = localStorage.getItem('accessToken');
    const server = localStorage.getItem('server');

    if (accessToken && server) {
      const { set } = await import('idb-keyval');
      await set('accessToken', accessToken);
      await set('server', server);
      console.log('[App] Synced credentials to IndexedDB');
    }
  }

  /**
   * Warm the service worker cache for notifications, bookmarks, and favorites
   * Only if user has good network and data saver is off
   */
  private async warmCacheIfAppropriate(settings: Settings) {
    // Skip if data saver mode is enabled
    if (settings.data_saver) {
      console.log('[App] Cache warming skipped: Data saver enabled');
      return;
    }

    // Check if user is authenticated
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.log('[App] Cache warming skipped: Not authenticated');
      return;
    }

    console.log('checking cache warming: accessToken', accessToken);

    // Check network connection quality
    if ('connection' in navigator) {
      const conn = (navigator as { connection?: NetworkInformation }).connection;

      // Skip on slow connections (2G, slow-2g) or if saveData is enabled
      if (
        conn?.saveData ||
        conn?.effectiveType === '3g' ||
        conn?.effectiveType === '2g' ||
        conn?.effectiveType === 'slow-2g'
      ) {
        console.log(
          '[App] Cache warming skipped: Slow connection or saveData enabled'
        );
        return;
      }
    }

    console.log(
      '[App] Conditions met for cache warming.',
      navigator.serviceWorker.controller
    );

    // All conditions met - trigger cache warming in service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[App] Triggering cache warming...');
      navigator.serviceWorker.controller.postMessage({ type: 'WARM_CACHE' });
    }
  }

  /**
   * Apply theme color to both Shoelace and MD3 design tokens
   */
  private applyThemeColor(color: string) {
    const root = document.documentElement;

    // Shoelace tokens
    root.style.setProperty('--sl-color-primary-600', color);
    root.style.setProperty('--primary-color', color);

    // MD3 tokens - primary color (set on :root for highest priority)
    root.style.setProperty('--md-sys-color-primary', color);
    root.style.setProperty('--md-sys-color-outline', color);

    // Generate lighter/darker variants for better MD3 integration
    const lighterVariant = this.adjustColorBrightness(color, 40);
    const darkerVariant = this.adjustColorBrightness(color, -40);

    root.style.setProperty('--sl-color-primary-500', lighterVariant);
    root.style.setProperty('--sl-color-primary-700', darkerVariant);

    // Also update body for legacy support
    document.body.style.setProperty('--sl-color-primary-600', color);
    document.body.style.setProperty('--md-sys-color-primary', color);
    document.body.style.setProperty('--md-sys-color-outline', color);
  }

  /**
   * Adjust color brightness (from app-theme component)
   */
  private adjustColorBrightness(col: string, amt: number): string {
    let usePound = false;
    if (col[0] === '#') {
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

  firstUpdated() {
    router.addEventListener('route-changed', () => {
      if ('startViewTransition' in document) {
        (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(() => {
          this.requestUpdate();
        });
      } else {
        this.requestUpdate();
      }
    });
  }

  render() {
    return html`
      ${router.render()}
      <image-preview-dialog></image-preview-dialog>
    `;
  }
}
