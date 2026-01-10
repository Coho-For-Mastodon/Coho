import { TemplateResult, nothing } from 'lit';

/**
 * Lazy Overlay Rendering Utility
 *
 * This utility helps reduce DOM overhead by only rendering overlays
 * (dialogs, drawers, toasts) when they are actually needed.
 *
 * Instead of always having overlays in the DOM:
 * ```html
 * <md-dialog id="settings">...</md-dialog>  <!-- Always in DOM -->
 * ```
 *
 * With lazy rendering, they only appear when opened:
 * ```ts
 * ${this.settingsDialogVisible ? html`<md-dialog>...</md-dialog>` : nothing}
 * ```
 */

export type OverlayState = {
  visible: boolean;
  loaded: boolean;
};

/**
 * Creates an initial overlay state object.
 */
export function createOverlayState(): OverlayState {
  return { visible: false, loaded: false };
}

/**
 * Helper to render an overlay only when it should be visible.
 * The overlay stays in DOM briefly after hide to allow close animations.
 *
 * @param state - The overlay state
 * @param template - Function that returns the template to render
 * @returns Template result or nothing
 *
 * @example
 * ```ts
 * // In your component
 * @state() private settingsDrawerState = createOverlayState();
 *
 * render() {
 *   return html`
 *     ${renderOverlay(this.settingsDrawerState, () => html`
 *       <otter-drawer id="settings-drawer" @sl-hide="${() => this.hideOverlay('settings')}">
 *         <settings-content></settings-content>
 *       </otter-drawer>
 *     `)}
 *   `;
 * }
 * ```
 */
export function renderOverlay(
  state: OverlayState,
  template: () => TemplateResult
): TemplateResult | typeof nothing {
  return state.visible ? template() : nothing;
}

/**
 * Manager class for handling multiple lazy overlays in a component.
 * Provides a cleaner API for components with many overlays.
 *
 * @example
 * ```ts
 * class MyComponent extends LitElement {
 *   private overlays = new LazyOverlayManager(this, [
 *     'settings-drawer',
 *     'theming-drawer',
 *     'install-dialog',
 *   ]);
 *
 *   async openSettings() {
 *     await this.overlays.show('settings-drawer');
 *     // After updateComplete, query and call .show() on the element
 *   }
 *
 *   render() {
 *     return html`
 *       ${this.overlays.render('settings-drawer', () => html`
 *         <otter-drawer id="settings-drawer">...</otter-drawer>
 *       `)}
 *     `;
 *   }
 * }
 * ```
 */
export class LazyOverlayManager {
  private states: Map<string, OverlayState> = new Map();
  private host: {
    requestUpdate(): void;
    updateComplete: Promise<boolean>;
  };

  constructor(
    host: { requestUpdate(): void; updateComplete: Promise<boolean> },
    overlayIds: string[] = []
  ) {
    this.host = host;
    for (const id of overlayIds) {
      this.states.set(id, createOverlayState());
    }
  }

  /**
   * Get the state of an overlay.
   */
  getState(id: string): OverlayState {
    let state = this.states.get(id);
    if (!state) {
      state = createOverlayState();
      this.states.set(id, state);
    }
    return state;
  }

  /**
   * Check if an overlay is visible.
   */
  isVisible(id: string): boolean {
    return this.getState(id).visible;
  }

  /**
   * Show an overlay (adds it to DOM).
   * Returns a promise that resolves after the host updates and the element is ready for animation.
   */
  async show(id: string): Promise<void> {
    const state = this.getState(id);
    if (!state.visible) {
      state.visible = true;
      state.loaded = true;
      this.host.requestUpdate();
      await this.host.updateComplete;
      // Wait for the next frame to ensure the element is fully painted
      // before triggering show animation
      await new Promise((resolve) => requestAnimationFrame(resolve));
      // Double RAF for more reliable animation start
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  /**
   * Hide an overlay (removes it from DOM after a delay for animations).
   * @param delay - Delay in ms before removing from DOM (default: 300ms for animations)
   */
  async hide(id: string, delay: number = 350): Promise<void> {
    const state = this.getState(id);
    if (state.visible) {
      // Allow time for close animation before removing from DOM
      await new Promise((resolve) => setTimeout(resolve, delay));
      state.visible = false;
      this.host.requestUpdate();
    }
  }

  /**
   * Immediately hide an overlay without animation delay.
   */
  hideImmediately(id: string): void {
    const state = this.getState(id);
    state.visible = false;
    this.host.requestUpdate();
  }

  /**
   * Render an overlay only when it should be visible.
   */
  render(
    id: string,
    template: () => TemplateResult
  ): TemplateResult | typeof nothing {
    return renderOverlay(this.getState(id), template);
  }

  /**
   * Check if an overlay has ever been loaded (useful for lazy-loading components).
   */
  hasLoaded(id: string): boolean {
    return this.getState(id).loaded;
  }
}

/**
 * Decorator factory to create a lazy overlay property.
 * Use this with the @state decorator pattern.
 *
 * @example
 * ```ts
 * class MyComponent extends LitElement {
 *   @state() settingsVisible = false;
 *
 *   async openSettings() {
 *     this.settingsVisible = true;
 *     await this.updateComplete;
 *     this.settingsDrawer?.show();
 *   }
 *
 *   handleSettingsHide() {
 *     // Delay to allow close animation
 *     setTimeout(() => { this.settingsVisible = false; }, 350);
 *   }
 *
 *   render() {
 *     return html`
 *       ${this.settingsVisible ? html`
 *         <otter-drawer
 *           id="settings"
 *           @otter-drawer-hide="${() => this.handleSettingsHide()}"
 *         >...</otter-drawer>
 *       ` : nothing}
 *     `;
 *   }
 * }
 * ```
 */

// Re-export nothing for convenience
export { nothing };
