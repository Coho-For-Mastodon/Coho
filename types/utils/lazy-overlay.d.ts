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
export declare function createOverlayState(): OverlayState;
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
export declare function renderOverlay(
  state: OverlayState,
  template: () => TemplateResult
): TemplateResult | typeof nothing;
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
export declare class LazyOverlayManager {
  private states;
  private host;
  constructor(
    host: {
      requestUpdate(): void;
      updateComplete: Promise<boolean>;
    },
    overlayIds?: string[]
  );
  /**
   * Get the state of an overlay.
   */
  getState(id: string): OverlayState;
  /**
   * Check if an overlay is visible.
   */
  isVisible(id: string): boolean;
  /**
   * Show an overlay (adds it to DOM).
   * Returns a promise that resolves after the host updates and the element is ready for animation.
   */
  show(id: string): Promise<void>;
  /**
   * Hide an overlay (removes it from DOM after a delay for animations).
   * @param delay - Delay in ms before removing from DOM (default: 300ms for animations)
   */
  hide(id: string, delay?: number): Promise<void>;
  /**
   * Immediately hide an overlay without animation delay.
   */
  hideImmediately(id: string): void;
  /**
   * Render an overlay only when it should be visible.
   */
  render(
    id: string,
    template: () => TemplateResult
  ): TemplateResult | typeof nothing;
  /**
   * Check if an overlay has ever been loaded (useful for lazy-loading components).
   */
  hasLoaded(id: string): boolean;
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
export { nothing };
