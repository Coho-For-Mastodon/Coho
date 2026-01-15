import { LitElement } from 'lit';
/**
 * MD3 Tabs Container
 *
 * Container for md-tab and md-tab-panel components.
 * Supports horizontal (top/bottom) and vertical (side) orientations.
 *
 * @fires tab-change - Emitted when active tab changes { detail: { panel: string } }
 *
 * @slot nav - Slot for md-tab elements
 * @slot default - Slot for md-tab-panel elements
 *
 * @example
 * ```html
 * <md-tabs orientation="horizontal" placement="top">
 *   <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
 *   <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
 *
 *   <md-tab-panel name="tab1">Content 1</md-tab-panel>
 *   <md-tab-panel name="tab2">Content 2</md-tab-panel>
 * </md-tabs>
 * ```
 */
export declare class MdTabs extends LitElement {
  /**
   * Orientation of tabs: horizontal (top/bottom) or vertical (side)
   */
  orientation: 'horizontal' | 'vertical';
  /**
   * Placement of tab bar
   * - top/bottom for horizontal orientation
   * - start/end for vertical orientation (side navigation)
   */
  placement: 'top' | 'bottom' | 'start' | 'end';
  /**
   * Active panel name
   */
  active?: string;
  private _activePanel;
  /** Unique ID for this tabs instance (used for aria-controls/aria-labelledby) */
  private _tabsId;
  private _observer;
  private navSlot;
  private panelSlot;
  constructor();
  static styles: import('lit').CSSResult;
  connectedCallback(): void;
  disconnectedCallback(): void;
  firstUpdated(): void;
  updated(changedProperties: Map<string, unknown>): void;
  private _handleTabSelected;
  private _getTabs;
  private _getPanels;
  private _updatePanels;
  /**
   * Handle keyboard navigation within the tablist
   * Implements WAI-ARIA tab pattern: Arrow keys, Home, End
   */
  private _handleTablistKeyDown;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'md-tabs': MdTabs;
  }
}
