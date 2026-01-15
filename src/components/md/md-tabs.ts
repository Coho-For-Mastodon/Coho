import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import type { TabChangeDetail } from '../../types/events';
import type { MdTab } from './md-tab';
import type { MdTabPanel } from './md-tab-panel';

// Counter for generating unique IDs across all md-tabs instances
let tabsIdCounter = 0;

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
@customElement('md-tabs')
export class MdTabs extends LitElement {
  /**
   * Orientation of tabs: horizontal (top/bottom) or vertical (side)
   */
  @property({ type: String, reflect: true }) orientation:
    | 'horizontal'
    | 'vertical' = 'horizontal';

  /**
   * Placement of tab bar
   * - top/bottom for horizontal orientation
   * - start/end for vertical orientation (side navigation)
   */
  @property({ type: String, reflect: true }) placement:
    | 'top'
    | 'bottom'
    | 'start'
    | 'end' = 'top';

  /**
   * Active panel name
   */
  @property({ type: String }) active?: string;

  @state() private _activePanel: string = '';

  /** Unique ID for this tabs instance (used for aria-controls/aria-labelledby) */
  private _tabsId = `md-tabs-${++tabsIdCounter}`;

  private _observer: MutationObserver;

  @query('slot[name="nav"]') private navSlot!: HTMLSlotElement;
  @query('slot:not([name])') private panelSlot!: HTMLSlotElement;

  constructor() {
    super();
    this._observer = new MutationObserver(() => {
      // Debounce updates if needed, but for now simple call is fine
      this._updatePanels();
    });
  }

  static styles = css`
    :host {
      display: flex;
      gap: 0;
      width: 100%;
    }

    /* Horizontal orientation */
    :host([orientation='horizontal']) {
      flex-direction: column;
    }

    :host([orientation='horizontal'][placement='bottom']) {
      flex-direction: column-reverse;
    }

    /* Vertical orientation (side navigation) */
    :host([orientation='vertical']) {
      flex-direction: row;
      height: 100%;
    }

    :host([orientation='vertical'][placement='end']) {
      flex-direction: row-reverse;
    }

    .tab-bar {
      display: flex;
      position: relative;
      background: transparent;
      border-bottom: none;
    }

    /* Horizontal tab bar */
    :host([orientation='horizontal']) .tab-bar {
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      /* Fixed tabs - equal width distribution */
      justify-content: stretch;
      border-bottom: 1px solid
        var(--md-sys-color-outline-variant, var(--sl-color-neutral-200));
    }

    :host([orientation='horizontal']) .tab-bar::-webkit-scrollbar {
      display: none;
    }

    :host([orientation='horizontal'][placement='bottom']) .tab-bar {
      border-bottom: none;
      border-top: 1px solid
        var(--md-sys-color-outline-variant, var(--sl-color-neutral-200));
      background: var(--md-sys-color-surface, #f3f3f6);
    }

    /* Vertical tab bar (side navigation) - MD3 navigation rail style */
    :host([orientation='vertical']) .tab-bar {
      flex-direction: column;
      align-items: center;
      border-bottom: none;
      border-right: none;
      width: 80px;
      min-width: 80px;
      max-width: 80px;
      flex-shrink: 0;
      overflow-y: visible;
      overflow-x: hidden;
      background: transparent;
      padding: 12px 0;
      padding-top: 66px;
      gap: 0;
      align-self: stretch;
      height: calc(100% + 54px);
      margin-top: -74px;
      border-radius: 0;
      padding-left: 12px;
      padding-right: 12px;
    }

    :host([orientation='vertical'][placement='end']) .tab-bar {
      border-right: none;
      border-left: none;
    }

    .panel-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    ::slotted(md-tab-panel) {
      display: none;
    }

    ::slotted(md-tab-panel[active]) {
      display: block;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      :host([orientation='horizontal']) .tab-bar {
        background: transparent;
        border-color: var(
          --md-sys-color-outline-variant,
          var(--sl-color-neutral-700)
        );
      }

      :host([orientation='horizontal'][placement='bottom']) .tab-bar {
        background: var(--md-sys-color-surface, #1e1e1e);
      }

      :host([orientation='vertical']) .tab-bar {
        background: transparent;
      }
    }

    /* Mobile adjustments */
    @media (max-width: 820px) {
      /* Move horizontal tabs to bottom on mobile */
      :host([orientation='horizontal']) {
        flex-direction: column-reverse;
      }

      /* Override if explicitly set to bottom placement */
      :host([orientation='horizontal'][placement='bottom']) {
        flex-direction: column-reverse;
      }

      :host([orientation='horizontal']) .tab-bar {
        border-bottom: none;
        border-top: 1px solid
          var(--md-sys-color-outline-variant, var(--sl-color-neutral-200));
        /* Safe area for devices with home indicator */
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      :host([orientation='vertical']) .tab-bar {
        width: 80px;
        min-width: 80px;
        max-width: 80px;
        height: 100%;
        margin-top: 0;
        padding-top: 12px;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      'tab-selected',
      this._handleTabSelected as EventListener
    );
    // Observe light DOM for changes (including nested tabs in wrappers like home-tabs-nav)
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: false, // We handle attributes in updatePanels, looking for structural changes here
      characterData: false,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      'tab-selected',
      this._handleTabSelected as EventListener
    );
    this._observer.disconnect();
  }

  firstUpdated() {
    // Set initial active tab
    if (this.active) {
      this._activePanel = this.active;
    } else {
      // Auto-select first tab if no active specified
      const tabs = this._getTabs();
      if (tabs.length > 0) {
        this._activePanel = tabs[0].panel || '';
      }
    }
    this._updatePanels();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('active') && this.active) {
      this._activePanel = this.active;
      this._updatePanels();
    }

    // Update tabs when orientation or placement changes (for Firefox)
    if (
      changedProperties.has('orientation') ||
      changedProperties.has('placement')
    ) {
      this._updatePanels();
    }
  }

  private _handleTabSelected(e: CustomEvent<{ panel: string }>) {
    e.stopPropagation();
    const panel = e.detail.panel;
    if (panel && panel !== this._activePanel) {
      this._activePanel = panel;
      this._updatePanels();

      // Emit tab-change event
      this.dispatchEvent(
        new CustomEvent<TabChangeDetail>('tab-change', {
          detail: { panel },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _getTabs(): MdTab[] {
    if (!this.navSlot) return [];

    const assigned = this.navSlot.assignedElements();
    const tabs: MdTab[] = [];

    for (const el of assigned) {
      if (el.tagName.toLowerCase() === 'md-tab') {
        tabs.push(el as MdTab);
      } else {
        // Also look for nested tabs (e.g. from Light DOM wrappers like home-tabs-nav)
        const nested = el.querySelectorAll('md-tab');
        if (nested.length > 0) {
          tabs.push(...(Array.from(nested) as MdTab[]));
        }
      }
    }

    return tabs;
  }

  private _getPanels(): MdTabPanel[] {
    if (!this.panelSlot) return [];
    return this.panelSlot
      .assignedElements()
      .filter(
        (el): el is MdTabPanel => el.tagName.toLowerCase() === 'md-tab-panel'
      );
  }

  private _updatePanels() {
    const tabs = this._getTabs();
    const panels = this._getPanels();

    // Update tabs active state and data attributes for Firefox
    tabs.forEach((tab, index) => {
      // Set orientation and placement data attributes for Firefox compatibility
      tab.setAttribute('data-orientation', this.orientation);
      tab.setAttribute('data-placement', this.placement);

      // Set unique IDs for accessibility linking
      const tabId = `${this._tabsId}-tab-${index}`;
      const panelId = `${this._tabsId}-panel-${index}`;
      tab.setAttribute('id', tabId);
      tab.setAttribute('aria-controls', panelId);

      const isActive = tab.panel === this._activePanel;
      if (isActive) {
        tab.setAttribute('active', '');
        // Only the active tab should be in the tab order (roving tabindex)
        tab.setAttribute('tabindex', '0');
      } else {
        tab.removeAttribute('active');
        // Inactive tabs are not in the tab order
        tab.setAttribute('tabindex', '-1');
      }
    });

    // Update panels visibility and accessibility attributes
    panels.forEach((panel, index) => {
      const tabId = `${this._tabsId}-tab-${index}`;
      const panelId = `${this._tabsId}-panel-${index}`;
      panel.setAttribute('id', panelId);
      panel.setAttribute('aria-labelledby', tabId);

      if (panel.name === this._activePanel) {
        panel.setAttribute('active', '');
      } else {
        panel.removeAttribute('active');
      }
    });
  }

  /**
   * Handle keyboard navigation within the tablist
   * Implements WAI-ARIA tab pattern: Arrow keys, Home, End
   */
  private _handleTablistKeyDown(e: KeyboardEvent) {
    const tabs = this._getTabs().filter((tab) => !tab.disabled);
    if (tabs.length === 0) return;

    const isHorizontal = this.orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    let handled = false;
    let targetTab: MdTab | undefined;

    const currentIndex = tabs.findIndex(
      (tab) => tab.panel === this._activePanel
    );

    switch (e.key) {
      case prevKey:
        // Move to previous tab (wrap around)
        targetTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
        handled = true;
        break;
      case nextKey:
        // Move to next tab (wrap around)
        targetTab = tabs[(currentIndex + 1) % tabs.length];
        handled = true;
        break;
      case 'Home':
        // Move to first tab
        targetTab = tabs[0];
        handled = true;
        break;
      case 'End':
        // Move to last tab
        targetTab = tabs[tabs.length - 1];
        handled = true;
        break;
    }

    if (handled && targetTab) {
      e.preventDefault();
      // Activate the tab (automatic activation pattern)
      this._activePanel = targetTab.panel;
      this._updatePanels();
      // Focus the tab button
      targetTab.focus();
      // Emit tab-change event
      this.dispatchEvent(
        new CustomEvent<TabChangeDetail>('tab-change', {
          detail: { panel: targetTab.panel },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <div
        class="tab-bar"
        role="tablist"
        aria-orientation="${this.orientation}"
        @keydown="${this._handleTablistKeyDown}"
      >
        <slot name="nav" @slotchange="${() => this._updatePanels()}"></slot>
      </div>
      <div class="panel-container">
        <slot @slotchange="${() => this._updatePanels()}"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-tabs': MdTabs;
  }
}
