import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { router } from './utils/router';

import './pages/app-login';
import './components/header';
import './components/image-preview-dialog';
import { getSettings, Settings } from './services/settings';

// ============================================================================
// STALE ASSET RECOVERY
// ============================================================================
// When the app updates but the browser still has old index.html cached,
// chunk loads will fail because the hashed filenames have changed.
// This handler detects such failures and triggers a hard refresh.
let hasAttemptedRecovery = false;

const handleChunkLoadError = async (error: Error | string) => {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';

  // Check for common chunk/module load failure patterns
  const isChunkError =
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('error loading dynamically imported module') ||
    errorMessage.includes('Importing a module script failed') ||
    // Network errors when fetching JS files
    (errorMessage.includes('Failed to fetch') && errorMessage.includes('.js'));

  if (isChunkError && !hasAttemptedRecovery) {
    hasAttemptedRecovery = true;
    console.error(
      '[App] Chunk load failed, clearing caches and reloading...',
      errorMessage
    );

    try {
      // Clear all caches to force fresh assets
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('[App] Cleared all caches');
      }

      // Unregister service worker to ensure clean state
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        console.log('[App] Unregistered service workers');
      }
    } catch (e) {
      console.error('[App] Failed to clear caches:', e);
    }

    // Hard reload to bypass any remaining caches
    window.location.reload();
  }
};

// Listen for unhandled errors (catches synchronous chunk load failures)
window.addEventListener(
  'error',
  (event) => {
    handleChunkLoadError(event.message || event.error?.message || '');
  },
  true
);

// Listen for unhandled promise rejections (catches async import() failures)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || String(reason) || '';
  handleChunkLoadError(message);
});

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
      const conn = (navigator as { connection?: NetworkInformation })
        .connection;

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
        (
          document as Document & {
            startViewTransition: (callback: () => void) => void;
          }
        ).startViewTransition(() => {
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
