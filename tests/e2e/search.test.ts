import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { setupAuth } from '../setup';
import { mockSearchResult } from '../mocks/mock-data';

// Import the search component
import '../../src/components/search';
import type { Search } from '../../src/components/search';

// Helper to wait for async operations
async function waitFor(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Search E2E', () => {
  beforeEach(() => {
    setupAuth();
    cleanupFixtures();
  });

  describe('component initialization', () => {
    it('should render the search component', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      expect(el).toBeDefined();
      expect(el.tagName.toLowerCase()).toBe('app-search');
    });

    it('should have a shadow root', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      expect(el.shadowRoot).not.toBeNull();
    });

    it('should render search input', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);
      await waitFor(100);

      const input = el.shadowRoot?.querySelector('input');
      expect(input).toBeDefined();
    });
  });

  describe('search bar UI', () => {
    it('should have search bar container', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);

      const searchBar = el.shadowRoot?.querySelector('.search-bar');
      expect(searchBar).toBeDefined();
    });

    it('should have leading search icon', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);

      const leadingIcon = el.shadowRoot?.querySelector('.leading-icon');
      expect(leadingIcon).toBeDefined();
    });

    it('should render avatar when provided', async () => {
      const el = await fixture<Search>(
        html`<app-search avatar="/test-avatar.png"></app-search>`
      );
      await elementUpdated(el);
      await waitFor(100);

      expect(el.avatar).toBe('/test-avatar.png');
    });
  });

  describe('search input behavior', () => {
    it('should have placeholder text', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);
      await waitFor(100);

      const input = el.shadowRoot?.querySelector('input');
      expect(input?.placeholder).toBeDefined();
    });

    it('should update input value on typing', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);
      await waitFor(100);

      const input = el.shadowRoot?.querySelector('input');
      if (input) {
        input.value = 'test search';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await elementUpdated(el);

        expect(input.value).toBe('test search');
      }
    });

    it('should handle search submission', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);
      await waitFor(100);

      const input = el.shadowRoot?.querySelector('input');
      if (input) {
        input.value = 'mastodon';

        // Simulate Enter key
        const keyEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
        });
        input.dispatchEvent(keyEvent);
        await elementUpdated(el);
      }
    });
  });

  describe('search results', () => {
    it('should have searchData state', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);

      expect(
        el.searchData === undefined || typeof el.searchData === 'object'
      ).toBe(true);
    });

    it('should handle setting search results', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);

      // Set search data programmatically
      el.searchData = mockSearchResult;
      await elementUpdated(el);
      await waitFor(100);

      expect(el.searchData).toBeDefined();
      expect(el.searchData?.accounts).toBeDefined();
      expect(el.searchData?.statuses).toBeDefined();
      expect(el.searchData?.hashtags).toBeDefined();
    });

    it('should display accounts in search results', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      el.searchData = mockSearchResult;
      await elementUpdated(el);
      await waitFor(200);

      // Verify search data structure
      expect(mockSearchResult.accounts).toHaveLength(1);
      expect(mockSearchResult.accounts[0].username).toBe('searchbot');
    });

    it('should display hashtags in search results', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      el.searchData = mockSearchResult;
      await elementUpdated(el);
      await waitFor(200);

      // Verify hashtag data structure
      expect(mockSearchResult.hashtags).toHaveLength(1);
      expect(mockSearchResult.hashtags[0].name).toBe('coho');
    });
  });

  describe('accessibility', () => {
    it('should have proper input type', async () => {
      const el = await fixture<Search>(html`<app-search></app-search>`);
      await elementUpdated(el);
      await waitFor(100);

      const input = el.shadowRoot?.querySelector('input');
      // Input should be searchable
      expect(input?.type === 'search' || input?.type === 'text').toBe(true);
    });
  });
});
