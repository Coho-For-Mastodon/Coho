import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { router } from './router/routes';

// Initialize localization (must be imported early)
import './config/localization.js';

import './pages/app-login';
import { getSettings } from './services/settings';
import { applyThemeColor } from './utils/theme-color';

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

  connectedCallback() {
    super.connectedCallback();

    // Initialize router (loads initial route's lazy imports)
    router.init();

    // Defer PWA update component - not needed immediately, loads on browser idle
    requestIdleCallback(() => import('./components/pwa-update'), {
      timeout: 5000,
    });
  }

  async handleInitTheme() {
    const settings = await getSettings();
    console.log('settings', settings);

    const potentialColor = settings.primary_color;

    if (potentialColor) {
      // Sync to localStorage for instant theme on next load (migration for existing users)
      if (!localStorage.getItem('coho-theme-color')) {
        localStorage.setItem('coho-theme-color', potentialColor);
      }
      applyThemeColor(potentialColor, { useIdleCallback: true });
    } else {
      // get css variable color
      const color = getComputedStyle(document.body).getPropertyValue(
        '--sl-color-primary-600'
      );
      applyThemeColor(color, { useIdleCallback: true });
    }
  }

  firstUpdated() {
    // Sync localStorage credentials to IndexedDB for service worker access
    this.syncCredentialsToIndexedDB();

    this.handleInitTheme();

    // Preload data during idle time if conditions are good
    // This is lazy-imported to avoid impacting first load bundle size
    this.initIdlePreload();

    // Lazy-load image preview dialog on first preview-image event
    this.initLazyImagePreview();

    // Lazy-load shortcuts help dialog on first show-shortcuts-help event
    this.initLazyShortcutsHelp();

    router.addEventListener('route-changed', () => {
      this.requestUpdate();
    });
  }

  /**
   * Lazy-load and initialize the shortcuts help dialog
   * Only loads when user first presses ? key
   */
  private shortcutsHelpInitialized = false;
  private initLazyShortcutsHelp() {
    const handler = async () => {
      if (this.shortcutsHelpInitialized) return;
      this.shortcutsHelpInitialized = true;

      // Import the component (registers the custom element)
      await import('./components/shortcuts-help-dialog');

      // Wait for the custom element to be defined
      await customElements.whenDefined('shortcuts-help-dialog');

      // Create and append the dialog to the body
      const dialog = document.createElement('shortcuts-help-dialog');
      document.body.appendChild(dialog);

      // Wait a frame then show the dialog
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Show the dialog
      (
        dialog as import('./components/shortcuts-help-dialog').ShortcutsHelpDialog
      ).show();
    };

    window.addEventListener('show-shortcuts-help', handler);
  }

  /**
   * Lazy-load and initialize the image preview dialog
   * Only loads when user first clicks an image
   */
  private imagePreviewInitialized = false;
  private initLazyImagePreview() {
    console.log('[App] Setting up lazy image preview listener');
    const handler = async (e: Event) => {
      console.log(
        '[App] preview-image event received',
        (e as CustomEvent).detail
      );
      if (this.imagePreviewInitialized) {
        console.log('[App] Already initialized, skipping');
        return;
      }
      this.imagePreviewInitialized = true;

      // Import the component (registers the custom element)
      await import('./components/image-preview-dialog');
      console.log('[App] image-preview-dialog imported');

      // Wait for the custom element to be defined
      await customElements.whenDefined('image-preview-dialog');
      console.log('[App] Custom element defined');

      // Create and append the dialog to the shadow root
      const dialog = document.createElement('image-preview-dialog');
      document.body?.appendChild(dialog);
      console.log('[App] Dialog appended to shadow root');

      // Wait a frame to ensure connectedCallback has run and listener is registered
      await new Promise((resolve) => requestAnimationFrame(resolve));
      console.log('[App] Re-dispatching event');

      // Re-dispatch the original event so the dialog can handle it
      window.dispatchEvent(
        new CustomEvent('preview-image', {
          detail: (e as CustomEvent).detail,
          bubbles: true,
          composed: true,
        })
      );
    };

    window.addEventListener('preview-image', handler, { once: true });
  }

  /**
   * Initialize idle-time preloading
   * Lazy imports the preload service to avoid bundle bloat
   */
  private async initIdlePreload() {
    try {
      const { initPreload } = await import('./services/preload');
      await initPreload();
    } catch (error) {
      console.warn('[App] Preload initialization failed:', error);
    }
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

  render() {
    return html`
      ${router.render()}
      <pwa-update></pwa-update>
    `;
  }

  /**
   * Render to light DOM so View Transitions can see the content
   */
  createRenderRoot() {
    return this;
  }
}
