import { LitElement } from 'lit';
/**
 * Custom drawer component to replace sl-drawer
 * Supports:
 * - placement: 'end' (right), 'start' (left), 'bottom', 'top'
 * - label: drawer title
 * - show() and hide() methods
 * - default slot and footer slot
 */
export declare class OtterDrawer extends LitElement {
  label: string;
  placement: 'start' | 'end' | 'top' | 'bottom';
  private open;
  private dragging;
  private dragStartY;
  private dragCurrentY;
  private dragStartTime;
  private dragPointerId;
  static styles: import('lit').CSSResult;
  render(): import('lit-html').TemplateResult<1>;
  /**
   * Show the drawer with optional animation
   */
  show(): Promise<void>;
  /**
   * Hide the drawer
   */
  hide(): Promise<void>;
  /**
   * Handle escape key to close drawer
   */
  connectedCallback(): void;
  disconnectedCallback(): void;
  private _handleKeyDown;
  private get drawerEl();
  private resetDragState;
  private onDragStart;
  private onDragMove;
  private onDragEnd;
}
declare global {
  interface HTMLElementTagNameMap {
    'otter-drawer': OtterDrawer;
  }
}
