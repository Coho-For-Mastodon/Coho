import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-tabs';
import '../../../src/components/md/md-tab';
import '../../../src/components/md/md-tab-panel';
import type { MdTabs } from '../../../src/components/md/md-tabs';
import type { MdTab } from '../../../src/components/md/md-tab';
import type { MdTabPanel } from '../../../src/components/md/md-tab-panel';

describe('md-tabs', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdTabs>(html`<md-tabs></md-tabs>`);

      expect(el).toBeDefined();
      expect(el.orientation).toBe('horizontal');
      expect(el.placement).toBe('top');
    });

    it('renders with tabs and panels', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);

      const tabs = el.querySelectorAll('md-tab');
      const panels = el.querySelectorAll('md-tab-panel');

      expect(tabs.length).toBe(2);
      expect(panels.length).toBe(2);
    });
  });

  describe('orientation', () => {
    it('reflects horizontal orientation', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs orientation="horizontal"></md-tabs>`
      );

      expect(el.getAttribute('orientation')).toBe('horizontal');
    });

    it('reflects vertical orientation', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs orientation="vertical"></md-tabs>`
      );

      expect(el.getAttribute('orientation')).toBe('vertical');
    });
  });

  describe('placement', () => {
    it('supports top placement', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs placement="top"></md-tabs>`
      );

      expect(el.getAttribute('placement')).toBe('top');
    });

    it('supports bottom placement', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs placement="bottom"></md-tabs>`
      );

      expect(el.getAttribute('placement')).toBe('bottom');
    });

    it('supports start placement for vertical', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs orientation="vertical" placement="start"></md-tabs>`
      );

      expect(el.getAttribute('placement')).toBe('start');
    });

    it('supports end placement for vertical', async () => {
      const el = await fixture<MdTabs>(
        html`<md-tabs orientation="vertical" placement="end"></md-tabs>`
      );

      expect(el.getAttribute('placement')).toBe('end');
    });
  });

  describe('active tab', () => {
    it('auto-selects first tab when no active specified', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const firstTab = el.querySelector('md-tab[panel="tab1"]') as MdTab;
      const firstPanel = el.querySelector(
        'md-tab-panel[name="tab1"]'
      ) as MdTabPanel;

      expect(firstTab.hasAttribute('active')).toBe(true);
      expect(firstPanel.hasAttribute('active')).toBe(true);
    });

    it('sets active tab from active property', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs active="tab2">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const secondTab = el.querySelector('md-tab[panel="tab2"]') as MdTab;
      const secondPanel = el.querySelector(
        'md-tab-panel[name="tab2"]'
      ) as MdTabPanel;

      expect(secondTab.hasAttribute('active')).toBe(true);
      expect(secondPanel.hasAttribute('active')).toBe(true);
    });

    it('changes active tab programmatically', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      el.active = 'tab2';
      await elementUpdated(el);

      const secondTab = el.querySelector('md-tab[panel="tab2"]') as MdTab;
      const secondPanel = el.querySelector(
        'md-tab-panel[name="tab2"]'
      ) as MdTabPanel;

      expect(secondTab.hasAttribute('active')).toBe(true);
      expect(secondPanel.hasAttribute('active')).toBe(true);
    });
  });

  describe('tab-change event', () => {
    it('dispatches tab-change event when tab is clicked', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const tabChangeHandler = vi.fn();
      el.addEventListener('tab-change', tabChangeHandler);

      const secondTab = el.querySelector('md-tab[panel="tab2"]') as MdTab;
      // Click the button inside the tab's shadow DOM
      const button = secondTab.shadowRoot!.querySelector(
        'button'
      ) as HTMLElement;
      button.click();
      await elementUpdated(el);

      expect(tabChangeHandler).toHaveBeenCalled();
      expect(tabChangeHandler.mock.calls[0][0].detail.panel).toBe('tab2');
    });

    it('does not dispatch tab-change when clicking already active tab', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const tabChangeHandler = vi.fn();
      el.addEventListener('tab-change', tabChangeHandler);

      const firstTab = el.querySelector('md-tab[panel="tab1"]') as MdTab;
      firstTab.click();
      await elementUpdated(el);

      expect(tabChangeHandler).not.toHaveBeenCalled();
    });
  });

  describe('panel visibility', () => {
    it('only shows active panel', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const panel1 = el.querySelector(
        'md-tab-panel[name="tab1"]'
      ) as MdTabPanel;
      const panel2 = el.querySelector(
        'md-tab-panel[name="tab2"]'
      ) as MdTabPanel;

      expect(panel1.hasAttribute('active')).toBe(true);
      expect(panel2.hasAttribute('active')).toBe(false);
    });
  });
});

describe('md-tab', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);

      expect(el).toBeDefined();
      expect(el.panel).toBe('test');
      expect(el.active).toBe(false);
      expect(el.disabled).toBe(false);
    });
  });

  describe('active state', () => {
    it('reflects active attribute', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test" active>Test</md-tab>`
      );

      expect(el.active).toBe(true);
      expect(el.hasAttribute('active')).toBe(true);
    });

    it('updates active state dynamically', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);

      el.active = true;
      await elementUpdated(el);

      expect(el.hasAttribute('active')).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('reflects disabled attribute', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test" disabled>Test</md-tab>`
      );

      expect(el.disabled).toBe(true);
      expect(el.hasAttribute('disabled')).toBe(true);
    });

    it('does not dispatch event when disabled', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test" disabled>Test</md-tab>`
      );
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      el.click();
      await elementUpdated(el);

      expect(selectHandler).not.toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('dispatches tab-selected event on click', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      // Click the button inside the shadow DOM
      const button = el.shadowRoot!.querySelector('button') as HTMLElement;
      button.click();
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
      expect(selectHandler.mock.calls[0][0].detail.panel).toBe('test');
    });

    it('dispatches tab-selected event on keyboard Enter', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
    });

    it('dispatches tab-selected event on keyboard Space', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="tab"', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);

      expect(el.getAttribute('role')).toBe('tab');
    });

    it('sets aria-selected based on active state', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);

      expect(el.getAttribute('aria-selected')).toBe('false');

      el.active = true;
      await elementUpdated(el);

      expect(el.getAttribute('aria-selected')).toBe('true');
    });

    it('sets aria-disabled when disabled', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test" disabled>Test</md-tab>`
      );

      expect(el.getAttribute('aria-disabled')).toBe('true');
    });

    it('has panel property for reference', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="tab1">Test</md-tab>`);

      expect(el.panel).toBe('tab1');
    });
  });
});

describe('md-tab-panel', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );

      expect(el).toBeDefined();
      expect(el.name).toBe('test');
      expect(el.active).toBe(false);
    });
  });

  describe('active state', () => {
    it('reflects active attribute', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test" active></md-tab-panel>`
      );

      expect(el.active).toBe(true);
      expect(el.hasAttribute('active')).toBe(true);
    });

    it('is hidden when not active', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );

      // The component uses display: none via CSS when not active
      expect(el.hasAttribute('active')).toBe(false);
    });

    it('is visible when active', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test" active></md-tab-panel>`
      );

      expect(el.hasAttribute('active')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has role="tabpanel" on host', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );

      expect(el.getAttribute('role')).toBe('tabpanel');
    });

    it('has aria-hidden based on active state', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );

      expect(el.getAttribute('aria-hidden')).toBe('true');

      el.active = true;
      await elementUpdated(el);

      expect(el.getAttribute('aria-hidden')).toBe('false');
    });
  });
});

describe('md-tabs accessibility', () => {
  describe('tablist role and orientation', () => {
    it('has role="tablist" on tab bar', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
        </md-tabs>
      `);
      const tabBar = el.shadowRoot!.querySelector('.tab-bar');

      expect(tabBar?.getAttribute('role')).toBe('tablist');
    });

    it('has aria-orientation="horizontal" by default', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
        </md-tabs>
      `);
      const tabBar = el.shadowRoot!.querySelector('.tab-bar');

      expect(tabBar?.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('has aria-orientation="vertical" for vertical orientation', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs orientation="vertical">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
        </md-tabs>
      `);
      const tabBar = el.shadowRoot!.querySelector('.tab-bar');

      expect(tabBar?.getAttribute('aria-orientation')).toBe('vertical');
    });
  });

  describe('tab-panel ID linking', () => {
    it('sets aria-controls on tabs linking to panels', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const tabs = el.querySelectorAll('md-tab');
      expect(tabs[0].getAttribute('aria-controls')).toBeTruthy();
      expect(tabs[1].getAttribute('aria-controls')).toBeTruthy();
    });

    it('sets aria-labelledby on panels linking back to tabs', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const panels = el.querySelectorAll('md-tab-panel');
      expect(panels[0].getAttribute('aria-labelledby')).toBeTruthy();
      expect(panels[1].getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('links tabs and panels with matching IDs', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const tab = el.querySelector('md-tab');
      const panel = el.querySelector('md-tab-panel');
      const tabId = tab?.getAttribute('id');
      const panelId = panel?.getAttribute('id');

      expect(tab?.getAttribute('aria-controls')).toBe(panelId);
      expect(panel?.getAttribute('aria-labelledby')).toBe(tabId);
    });
  });

  describe('roving tabindex', () => {
    it('active tab has tabindex="0"', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const activeTab = el.querySelector('md-tab[active]');
      expect(activeTab?.getAttribute('tabindex')).toBe('0');
    });

    it('inactive tabs have tabindex="-1"', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);

      const inactiveTab = el.querySelector('md-tab:not([active])');
      expect(inactiveTab?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates to next tab with ArrowRight in horizontal mode', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
      await elementUpdated(el);

      const secondTab = el.querySelector('md-tab[panel="tab2"]');
      expect(secondTab?.hasAttribute('active')).toBe(true);
    });

    it('navigates to previous tab with ArrowLeft in horizontal mode', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs active="tab2">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      );
      await elementUpdated(el);

      const firstTab = el.querySelector('md-tab[panel="tab1"]');
      expect(firstTab?.hasAttribute('active')).toBe(true);
    });

    it('wraps around to first tab when pressing ArrowRight on last tab', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs active="tab2">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
      await elementUpdated(el);

      const firstTab = el.querySelector('md-tab[panel="tab1"]');
      expect(firstTab?.hasAttribute('active')).toBe(true);
    });

    it('navigates to first tab with Home key', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs active="tab2">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
      );
      await elementUpdated(el);

      const firstTab = el.querySelector('md-tab[panel="tab1"]');
      expect(firstTab?.hasAttribute('active')).toBe(true);
    });

    it('navigates to last tab with End key', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true })
      );
      await elementUpdated(el);

      const lastTab = el.querySelector('md-tab[panel="tab2"]');
      expect(lastTab?.hasAttribute('active')).toBe(true);
    });

    it('uses ArrowDown/ArrowUp in vertical mode', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs orientation="vertical">
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2">Tab 2</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      await elementUpdated(el);

      const secondTab = el.querySelector('md-tab[panel="tab2"]');
      expect(secondTab?.hasAttribute('active')).toBe(true);
    });

    it('skips disabled tabs during navigation', async () => {
      const el = await fixture<MdTabs>(html`
        <md-tabs>
          <md-tab slot="nav" panel="tab1">Tab 1</md-tab>
          <md-tab slot="nav" panel="tab2" disabled>Tab 2</md-tab>
          <md-tab slot="nav" panel="tab3">Tab 3</md-tab>
          <md-tab-panel name="tab1">Content 1</md-tab-panel>
          <md-tab-panel name="tab2">Content 2</md-tab-panel>
          <md-tab-panel name="tab3">Content 3</md-tab-panel>
        </md-tabs>
      `);
      await elementUpdated(el);
      await el.updateComplete;

      const tabBar = el.shadowRoot!.querySelector('.tab-bar')!;
      tabBar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
      await elementUpdated(el);

      // Should skip tab2 (disabled) and go to tab3
      const thirdTab = el.querySelector('md-tab[panel="tab3"]');
      expect(thirdTab?.hasAttribute('active')).toBe(true);
    });
  });
});
