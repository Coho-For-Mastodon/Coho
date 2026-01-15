import { ReactiveController, ReactiveControllerHost } from 'lit';
import { TabChangeEvent } from '../types/events';

export class TabController implements ReactiveController {
  private host: ReactiveControllerHost;

  activeTab: string = 'general';
  tabsOrientation: 'horizontal' | 'vertical' = 'vertical';
  tabsPlacement: 'top' | 'bottom' | 'start' | 'end' = 'start';

  // Track previous tab to detect double-tap on home
  private _wasOnHomeTab = false;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);

    // Initialize tabs state based on screen size
    if (window.matchMedia('(max-width: 820px)').matches) {
      this.tabsOrientation = 'horizontal';
      this.tabsPlacement = 'bottom';
    } else {
      this.tabsOrientation = 'vertical';
      this.tabsPlacement = 'start';
    }
  }

  hostConnected() {
    window
      .matchMedia('(max-width: 820px)')
      .addEventListener('change', this.handleMediaChange);
  }

  hostDisconnected() {
    window
      .matchMedia('(max-width: 820px)')
      .removeEventListener('change', this.handleMediaChange);
  }

  private handleMediaChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      this.tabsOrientation = 'horizontal';
      this.tabsPlacement = 'bottom';
    } else {
      this.tabsOrientation = 'vertical';
      this.tabsPlacement = 'start';
    }
    this.host.requestUpdate();
  };

  /**
   * Switch to a tab by name - shared logic for programmatic and user-initiated tab changes
   */
  async switchToTab(
    name: string,
    resetHomeTracking = false,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ): Promise<void> {
    this.activeTab = name;

    // Reset home tab tracking when switching away from home
    if (resetHomeTracking && name !== 'general') {
      this._wasOnHomeTab = false;
    }

    // Persist active tab to sessionStorage for navigation restoration
    try {
      sessionStorage.setItem('coho:activeTab', name);
    } catch {
      // sessionStorage may be unavailable in some privacy contexts; ignore.
    }

    // Lazy load components based on which tab is shown
    if (loadCallback) {
      await loadCallback(name);
    }

    this.host.requestUpdate();

    // Handle notification-specific side effects
    if (sideEffectsCallback) {
      await sideEffectsCallback(name);
    }
  }

  async openATab(
    name: string,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ) {
    console.log('tab name', name);
    await this.switchToTab(name, false, loadCallback, sideEffectsCallback);
  }

  async handleTabChange(
    event: TabChangeEvent,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ) {
    const panel = event.detail.panel;
    await this.switchToTab(panel, true, loadCallback, sideEffectsCallback);
  }

  reloadHome(refreshCallback?: () => void) {
    // Only refresh if we were already on the home tab (double-tap to refresh behavior)
    // The _wasOnHomeTab flag is set before tab-change fires, so it reflects the previous state
    if (this._wasOnHomeTab && refreshCallback) {
      refreshCallback();
    }
    // Always update the flag for next click
    this._wasOnHomeTab = true;

    // Reset tab query param if present (uses replaceState to avoid adding history entry)
    const url = new URL(window.location.href);
    if (url.searchParams.has('tab')) {
      url.searchParams.delete('tab');
      history.replaceState(null, '', url.pathname + url.search);
    }

    // Clear persisted tab so next visit defaults to 'general'
    sessionStorage.removeItem('coho:activeTab');

    // Sync component state
    this.activeTab = 'general';
    this.host.requestUpdate();
  }
}
