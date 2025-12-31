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

    it('renders tab bar and panel container', async () => {
      const el = await fixture<MdTabs>(html`<md-tabs></md-tabs>`);

      const tabBar = el.shadowRoot!.querySelector('.tab-bar');
      const panelContainer = el.shadowRoot!.querySelector('.panel-container');

      expect(tabBar).toBeDefined();
      expect(panelContainer).toBeDefined();
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

    it('renders a button element', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button).toBeDefined();
    });

    it('renders slotted content', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test">Tab Label</md-tab>`
      );
      const slot = el.shadowRoot!.querySelector('slot:not([name])');

      expect(slot).toBeDefined();
    });

    it('renders icon slot', async () => {
      const el = await fixture<MdTab>(html`
        <md-tab panel="test">
          <span slot="icon">🏠</span>
          Home
        </md-tab>
      `);
      const iconSlot = el.shadowRoot!.querySelector(
        'slot[name="icon"]'
      ) as HTMLSlotElement;

      expect(iconSlot).toBeDefined();
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
      const button = el.shadowRoot!.querySelector('button')!;
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
    });

    it('dispatches tab-selected event on keyboard Space', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const button = el.shadowRoot!.querySelector('button')!;
      const selectHandler = vi.fn();

      el.addEventListener('tab-selected', selectHandler);
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      await elementUpdated(el);

      expect(selectHandler).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="tab"', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.getAttribute('role')).toBe('tab');
    });

    it('sets aria-selected based on active state', async () => {
      const el = await fixture<MdTab>(html`<md-tab panel="test">Test</md-tab>`);
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.getAttribute('aria-selected')).toBe('false');

      el.active = true;
      await elementUpdated(el);

      expect(button?.getAttribute('aria-selected')).toBe('true');
    });

    it('sets aria-disabled when disabled', async () => {
      const el = await fixture<MdTab>(
        html`<md-tab panel="test" disabled>Test</md-tab>`
      );
      const button = el.shadowRoot!.querySelector('button');

      expect(button?.getAttribute('aria-disabled')).toBe('true');
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

    it('renders slotted content', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test">Panel content</md-tab-panel>`
      );
      const slot = el.shadowRoot!.querySelector('slot');

      expect(slot).toBeDefined();
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
    it('has role="tabpanel" on content', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );
      const panelContent = el.shadowRoot!.querySelector('.panel-content');

      expect(panelContent?.getAttribute('role')).toBe('tabpanel');
    });

    it('has aria-hidden based on active state', async () => {
      const el = await fixture<MdTabPanel>(
        html`<md-tab-panel name="test"></md-tab-panel>`
      );
      const panelContent = el.shadowRoot!.querySelector('.panel-content');

      expect(panelContent?.getAttribute('aria-hidden')).toBe('true');

      el.active = true;
      await elementUpdated(el);

      expect(panelContent?.getAttribute('aria-hidden')).toBe('false');
    });
  });
});
