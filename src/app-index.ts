import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { router } from './router/routes';

// Initialize localization (must be imported early)
import './config/localization.js';

import './pages/app-login';
import {
  bootstrapSession,
  getActiveAccount,
  syncActiveToIndexedDb,
} from './services/auth-session';

@customElement('app-index')
export class AppIndex extends LitElement {
  /**
   * Whether the user is authenticated (has valid credentials stored)
   * True = returning authenticated user, False = brand new user or logged out
   */
  @state() isAuthenticated = false;

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

  private readonly _onRouteChanged = () => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();

    try {
      await bootstrapSession();
    } catch (error) {
      console.error('[App] Failed to bootstrap auth session', error);
    }

    // If the app was cold-launched via an OAuth deep link (App Link / Universal Link),
    // consume the launch URL and complete the token exchange before routing starts.
    await this.handleNativeLaunchCallback();

    // Register route-changed listener BEFORE router.init() to avoid missing the
    // initial route-changed event in browsers with native Navigation API + URLPattern
    // support (where init() completes synchronously before firstUpdated() runs).
    router.addEventListener('route-changed', this._onRouteChanged);

    // Load polyfills for browsers without native Navigation API / URLPattern
    if (!('navigation' in window)) {
      await import('@virtualstate/navigation');
    }
    if (typeof URLPattern === 'undefined') {
      await import('urlpattern-polyfill');
    }

    // Initialize router (loads initial route's lazy imports)
    await router.init();

    // Ensure the initial route renders after init completes
    this.requestUpdate();

    // Defer PWA update component - not needed in Capacitor native shell
    const { isNativePlatform } = await import('./utils/platform.js');
    if (!isNativePlatform()) {
      requestIdleCallback(() => import('./components/pwa-update'), {
        timeout: 5000,
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    router.removeEventListener('route-changed', this._onRouteChanged);
  }

  /**
   * Check if the app was cold-launched via a native deep link carrying OAuth
   * callback params. If so, complete the token exchange so the user lands
   * authenticated when routing initializes.
   */
  private async handleNativeLaunchCallback() {
    try {
      const { isNativePlatform } = await import('./utils/platform.js');
      if (!isNativePlatform()) return;

      const { consumeLaunchCallback } =
        await import('./services/auth-platform.js');
      const params = await consumeLaunchCallback();
      if (params) {
        const { authToClient } = await import('./services/account.js');
        await authToClient(params.code, params.state);
      }
    } catch (error) {
      console.error('[App] Native launch callback failed', error);
    }
  }

  async handleInitTheme() {
    const { getSettings } = await import('./services/settings');
    const settings = await getSettings();
    console.log('settings', settings);

    const potentialColor = settings.primary_color;

    const { applyThemeColor } = await import('./utils/theme-color');

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
    // and determine authentication state
    this.syncCredentialsToIndexedDB();

    // Check initial authentication state
    this.checkAuthenticationState();
    console.log('[App] isAuthenticated:', this.isAuthenticated);

    if (this.isAuthenticated) {
      this.handleInitTheme();

      // Preload data during idle time, then precache critical components.
      // Component precaching waits for data preload to finish to avoid
      // competing for network/CPU during user interactions.
      this.initIdlePreload().then(() => this.initComponentPrecache());

      // Lazy-load image preview dialog on first preview-image event
      this.initLazyImagePreview();

      // Lazy-load shortcuts help dialog on first show-shortcuts-help event
      this.initLazyShortcutsHelp();
    }
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
   * Precache critical components for offline use.
   * Network-aware: precaches more on fast connections, less on slow ones.
   */
  private async initComponentPrecache() {
    try {
      const { initComponentPrecache } =
        await import('./services/precache-components');
      await initComponentPrecache();
    } catch (error) {
      console.warn('[App] Component precache failed:', error);
    }
  }

  /**
   * Sync credentials from localStorage to IndexedDB
   * This ensures the service worker has access to the latest tokens
   */
  private async syncCredentialsToIndexedDB() {
    await syncActiveToIndexedDb();
    console.log('[App] Synced credentials to IndexedDB');
  }

  /**
   * Check if the user has valid authentication credentials
   * Sets isAuthenticated to true for returning users, false for new users
   */
  private checkAuthenticationState() {
    this.isAuthenticated = Boolean(
      getActiveAccount() ||
      (localStorage.getItem('accessToken') && localStorage.getItem('server'))
    );
    console.log(
      '[App] Authentication state:',
      this.isAuthenticated ? 'authenticated' : 'new user'
    );
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
