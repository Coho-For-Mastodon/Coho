import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import './md/md-button.js';
import './md/md-icon.js';

// Extend Navigator interface for Web Install API
declare global {
  interface Navigator {
    install?: () => Promise<{ id: string }>;
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

type InstallMethod =
  | 'web-install-api'
  | 'beforeinstallprompt'
  | 'safari'
  | 'none';

/**
 * PWA Install Component
 * Provides install prompts via Web Install API, beforeinstallprompt, or Safari instructions.
 * Designed to be embedded inside a dialog or bottom sheet by a parent component.
 */
@customElement('pwa-install')
export class PwaInstall extends LitElement {
  /** Whether the app is already installed (standalone mode) */
  @state() private isInstalled = false;

  /** Whether the user has dismissed the install prompt */
  @state() private isDismissed = false;

  /** The install method available on this platform */
  @state() private installMethod: InstallMethod = 'none';

  /** Stored beforeinstallprompt event for fallback */
  @state() private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** Whether installation is in progress */
  @state() private installing = false;

  /** Show mode: 'content' just shows the content, useful when embedded */
  @property({ type: String }) mode: 'content' | 'auto' = 'content';

  private static DISMISS_KEY = 'pwa-install-dismissed';
  private static DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  static styles = css`
    :host {
      display: block;
    }

    .install-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px;
      gap: 16px;
    }

    .app-icon {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .install-title {
      font-size: var(--md-sys-typescale-headline-small-font-size, 24px);
      font-weight: 500;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
    }

    .install-description {
      font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0;
      max-width: 280px;
      line-height: 1.5;
    }

    .benefits-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 300px;
      text-align: left;
      margin: 8px 0;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .benefit-icon {
      width: 24px;
      height: 24px;
      color: var(--md-sys-color-primary, #6750a4);
      flex-shrink: 0;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 280px;
      margin-top: 8px;
    }

    .actions md-button {
      width: 100%;
    }

    /* Safari instructions */
    .safari-instructions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 300px;
      text-align: left;
    }

    .safari-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container, #eaddff);
      color: var(--md-sys-color-on-primary-container, #21005d);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }

    .step-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .step-title {
      font-weight: 500;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .step-description {
      font-size: var(--md-sys-typescale-body-small-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .share-icon {
      display: inline-flex;
      vertical-align: middle;
      width: 18px;
      height: 18px;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .install-title {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .install-description {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      .benefit-item {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .step-number {
        background: var(--md-sys-color-primary-container, #4f378b);
        color: var(--md-sys-color-on-primary-container, #eaddff);
      }

      .step-title {
        color: var(--md-sys-color-on-surface, #e6e1e5);
      }

      .step-description {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.detectInstallMethod();
    this.checkDismissed();
    this.checkStandaloneMode();
    this.setupEventListeners();
    this.exposeDebugAPI();
  }

  /**
   * Expose debug API on window for console testing
   * Usage in browser console:
   *   window.pwaInstallDebug.showPrompt() - Force show the install UI
   *   window.pwaInstallDebug.resetDismissal() - Clear dismissal state
   *   window.pwaInstallDebug.setMethod('safari') - Test different install methods
   *   window.pwaInstallDebug.getState() - Get current component state
   */
  private exposeDebugAPI() {
    (window as unknown as { pwaInstallDebug: unknown }).pwaInstallDebug = {
      showPrompt: () => {
        this.isInstalled = false;
        this.isDismissed = false;
        if (this.installMethod === 'none') {
          this.installMethod = 'beforeinstallprompt';
        }
        this.requestUpdate();
        // Dispatch event to notify parent (app-home) to show the install UI
        this.dispatchEvent(
          new CustomEvent('pwa-install-ready', {
            bubbles: true,
            composed: true,
          })
        );
        console.log(
          '[PWA Install Debug] Forcing prompt to show. Click the install button in header or call window.pwaInstallDebug.openDialog()'
        );
      },
      openDialog: () => {
        // Find app-home through the router outlet
        const appHome =
          document
            .querySelector('app-index')
            ?.shadowRoot?.querySelector('app-home') ||
          document.querySelector('app-home');
        if (appHome?.shadowRoot) {
          const dialog = appHome.shadowRoot.querySelector(
            '#install-dialog'
          ) as HTMLElement & { show(): void };
          if (dialog) {
            dialog.show();
            console.log('[PWA Install Debug] Opening install dialog');
          } else {
            console.log(
              '[PWA Install Debug] install-dialog not found in app-home'
            );
          }
        } else {
          console.log('[PWA Install Debug] Could not find app-home');
        }
      },
      resetDismissal: async () => {
        await this.resetDismissal();
        console.log('[PWA Install Debug] Dismissal state cleared');
      },
      setMethod: (method: InstallMethod) => {
        this.installMethod = method;
        this.requestUpdate();
        console.log(`[PWA Install Debug] Install method set to: ${method}`);
      },
      getState: () => {
        const state = {
          isInstalled: this.isInstalled,
          isDismissed: this.isDismissed,
          installMethod: this.installMethod,
          hasDeferredPrompt: !!this.deferredPrompt,
          canShow: this.canShow,
          hasInstallMethod: this.hasInstallMethod,
        };
        console.table(state);
        return state;
      },
      simulateInstall: () => {
        this.handleAppInstalled();
        console.log('[PWA Install Debug] Simulated app installed event');
      },
    };
    console.log('[PWA Install] Debug API available at window.pwaInstallDebug');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener(
      'beforeinstallprompt',
      this.handleBeforeInstallPrompt
    );
    window.addEventListener('appinstalled', this.handleAppInstalled);
  }

  private removeEventListeners() {
    window.removeEventListener(
      'beforeinstallprompt',
      this.handleBeforeInstallPrompt
    );
    window.removeEventListener('appinstalled', this.handleAppInstalled);
  }

  private handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    this.deferredPrompt = e;
    // Update install method if we don't have Web Install API or Safari
    // Don't override Safari detection since beforeinstallprompt doesn't work there
    if (
      this.installMethod !== 'web-install-api' &&
      this.installMethod !== 'safari'
    ) {
      this.installMethod = 'beforeinstallprompt';
    }
  };

  private handleAppInstalled = () => {
    this.isInstalled = true;
    this.deferredPrompt = null;
    this.dispatchEvent(
      new CustomEvent('pwa-installed', { bubbles: true, composed: true })
    );
  };

  private detectInstallMethod() {
    const ua = navigator.userAgent;

    // Check iOS FIRST - iOS Safari doesn't support any install APIs
    // This must come before API checks because Chrome DevTools can emulate
    // iOS UA while still having navigator.install available
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if (isIOS) {
      this.installMethod = 'safari';
      return;
    }

    // Check for Web Install API (Chromium browsers with new API)
    if ('install' in navigator && typeof navigator.install === 'function') {
      this.installMethod = 'web-install-api';
      return;
    }

    // Check for Safari on macOS (no Chrome)
    const hasSafari = /Safari/i.test(ua);
    const hasChrome = /Chrome|CriOS/i.test(ua);
    if (hasSafari && !hasChrome) {
      this.installMethod = 'safari';
      return;
    }

    // Default - will be updated if beforeinstallprompt fires
    this.installMethod = 'none';
  }

  private checkStandaloneMode() {
    // Check various standalone mode indicators
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    this.isInstalled = isStandalone;

    // Listen for display mode changes
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', (e) => {
        if (e.matches) {
          this.isInstalled = true;
        }
      });
  }

  private async checkDismissed() {
    try {
      const { get } = await import('idb-keyval');
      const dismissedAt = await get(PwaInstall.DISMISS_KEY);

      if (dismissedAt && typeof dismissedAt === 'number') {
        const now = Date.now();
        if (now - dismissedAt < PwaInstall.DISMISS_DURATION) {
          this.isDismissed = true;
        } else {
          // Clear old dismissal
          const { del } = await import('idb-keyval');
          await del(PwaInstall.DISMISS_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private async saveDismissed() {
    try {
      const { set } = await import('idb-keyval');
      await set(PwaInstall.DISMISS_KEY, Date.now());
      this.isDismissed = true;
    } catch {
      // Ignore storage errors
    }
  }

  /** Check if install prompt should be shown */
  public get canShow(): boolean {
    return (
      !this.isInstalled && !this.isDismissed && this.installMethod !== 'none'
    );
  }

  /** Check if any install method is available */
  public get hasInstallMethod(): boolean {
    return this.installMethod !== 'none' || this.deferredPrompt !== null;
  }

  /** Check if Web Install API is available */
  public get hasWebInstallAPI(): boolean {
    return this.installMethod === 'web-install-api';
  }

  /** Trigger the install flow */
  async install() {
    if (this.installing) return;

    this.installing = true;

    try {
      // Try Web Install API first
      if (this.installMethod === 'web-install-api' && navigator.install) {
        await navigator.install();
        this.dispatchEvent(
          new CustomEvent('pwa-install-success', {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      // Fall back to beforeinstallprompt
      if (this.deferredPrompt) {
        const result = await this.deferredPrompt.prompt();
        if (result.outcome === 'accepted') {
          this.dispatchEvent(
            new CustomEvent('pwa-install-success', {
              bubbles: true,
              composed: true,
            })
          );
        } else {
          this.dispatchEvent(
            new CustomEvent('pwa-install-dismissed', {
              bubbles: true,
              composed: true,
            })
          );
        }
        this.deferredPrompt = null;
        return;
      }

      // Safari - just dismiss since we show instructions
      this.dismiss();
    } catch (error) {
      console.error('[PWA Install] Error during installation:', error);
      this.dispatchEvent(
        new CustomEvent('pwa-install-error', {
          detail: { error },
          bubbles: true,
          composed: true,
        })
      );
    } finally {
      this.installing = false;
    }
  }

  /** Dismiss the install prompt */
  async dismiss() {
    await this.saveDismissed();
    this.dispatchEvent(
      new CustomEvent('pwa-install-dismiss', { bubbles: true, composed: true })
    );
  }

  /** Reset dismissal (for testing or settings) */
  async resetDismissal() {
    try {
      const { del } = await import('idb-keyval');
      await del(PwaInstall.DISMISS_KEY);
      this.isDismissed = false;
    } catch {
      // Ignore storage errors
    }
  }

  private renderBenefits() {
    return html`
      <div class="benefits-list">
        <div class="benefit-item">
          <svg class="benefit-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
            />
          </svg>
          <span>Launch from your dock or home screen</span>
        </div>
        <div class="benefit-item">
          <svg class="benefit-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z"
            />
          </svg>
          <span>Opens in its own window</span>
        </div>
        <div class="benefit-item">
          <svg class="benefit-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
            />
          </svg>
          <span>Notification badges on app icon</span>
        </div>
      </div>
    `;
  }

  private renderSafariInstructions() {
    return html`
      <div class="safari-instructions">
        <div class="safari-step">
          <span class="step-number">1</span>
          <div class="step-content">
            <span class="step-title">Tap the Share button</span>
            <span class="step-description">
              Look for
              <svg class="share-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"
                />
              </svg>
              in the toolbar
            </span>
          </div>
        </div>
        <div class="safari-step">
          <span class="step-number">2</span>
          <div class="step-content">
            <span class="step-title">Scroll and tap "Add to Home Screen"</span>
            <span class="step-description"
              >It may be in the second row of actions</span
            >
          </div>
        </div>
        <div class="safari-step">
          <span class="step-number">3</span>
          <div class="step-content">
            <span class="step-title">Tap "Add" to confirm</span>
            <span class="step-description"
              >Coho will appear on your home screen</span
            >
          </div>
        </div>
      </div>
    `;
  }

  private renderInstallActions() {
    if (this.installMethod === 'safari') {
      return html`
        <div class="actions">
          <md-button variant="text" @click="${() => this.dismiss()}"
            >Got it</md-button
          >
        </div>
      `;
    }

    return html`
      <div class="actions">
        <md-button
          variant="filled"
          @click="${() => this.install()}"
          ?disabled="${this.installing}"
        >
          ${this.installing ? 'Installing...' : 'Install'}
        </md-button>
        <md-button variant="text" @click="${() => this.dismiss()}"
          >Not now</md-button
        >
      </div>
    `;
  }

  render() {
    // If already installed or dismissed, render nothing
    if (this.isInstalled) {
      return html``;
    }

    return html`
      <div class="install-content">
        <img
          class="app-icon"
          src="/assets/icons/new-icons/icon-192x192.png"
          alt="Coho"
        />

        <h2 class="install-title">Install Coho</h2>

        <p class="install-description">
          ${this.installMethod === 'safari'
            ? 'Add Coho to your home screen for the best experience'
            : 'Install Coho for a more immersive experience'}
        </p>

        ${this.installMethod === 'safari'
          ? this.renderSafariInstructions()
          : this.renderBenefits()}
        ${this.renderInstallActions()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pwa-install': PwaInstall;
  }
}
