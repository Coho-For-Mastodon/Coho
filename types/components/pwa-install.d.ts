import { LitElement } from 'lit';
import './md/md-button.js';
import './md/md-icon.js';
declare global {
  interface Navigator {
    install?: () => Promise<{
      id: string;
    }>;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<{
      outcome: 'accepted' | 'dismissed';
    }>;
    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
    }>;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}
/**
 * PWA Install Component
 * Provides install prompts via Web Install API, beforeinstallprompt, or Safari instructions.
 * Designed to be embedded inside a dialog or bottom sheet by a parent component.
 */
export declare class PwaInstall extends LitElement {
  /** Whether the app is already installed (standalone mode) */
  private isInstalled;
  /** Whether the user has dismissed the install prompt */
  private isDismissed;
  /** The install method available on this platform */
  private installMethod;
  /** Stored beforeinstallprompt event for fallback */
  private deferredPrompt;
  /** Whether installation is in progress */
  private installing;
  /** Show mode: 'content' just shows the content, useful when embedded */
  mode: 'content' | 'auto';
  private static DISMISS_KEY;
  private static DISMISS_DURATION;
  static styles: import('lit').CSSResult;
  connectedCallback(): void;
  /**
   * Expose debug API on window for console testing
   * Usage in browser console:
   *   window.pwaInstallDebug.showPrompt() - Force show the install UI
   *   window.pwaInstallDebug.resetDismissal() - Clear dismissal state
   *   window.pwaInstallDebug.setMethod('safari') - Test different install methods
   *   window.pwaInstallDebug.getState() - Get current component state
   */
  private exposeDebugAPI;
  disconnectedCallback(): void;
  private setupEventListeners;
  private removeEventListeners;
  private handleBeforeInstallPrompt;
  private handleAppInstalled;
  private detectInstallMethod;
  private checkStandaloneMode;
  private checkDismissed;
  private saveDismissed;
  /** Check if install prompt should be shown */
  get canShow(): boolean;
  /** Check if any install method is available */
  get hasInstallMethod(): boolean;
  /** Check if Web Install API is available */
  get hasWebInstallAPI(): boolean;
  /** Trigger the install flow */
  install(): Promise<void>;
  /** Dismiss the install prompt */
  dismiss(): Promise<void>;
  /** Reset dismissal (for testing or settings) */
  resetDismissal(): Promise<void>;
  private renderBenefits;
  private renderSafariInstructions;
  private renderInstallActions;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'pwa-install': PwaInstall;
  }
}
