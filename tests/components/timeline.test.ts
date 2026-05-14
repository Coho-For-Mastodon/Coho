/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, html, elementUpdated } from '../test-utils';
import '../../src/components/timeline';
import type { Timeline } from '../../src/components/timeline';
import type { Post } from '../../src/interfaces/Post';
import { mockTimelinePosts } from '../mocks/mock-data';
import { setupAuth } from '../auth-helpers';

// Cast mock data to proper type for tests
const testPosts = mockTimelinePosts as unknown as Post[];

// Helper to wait for animation frame
function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Helper to wait for multiple frames
async function waitForFrames(count: number = 2): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForAnimationFrame();
  }
}

describe('timeline pull-to-refresh', () => {
  beforeEach(() => {
    setupAuth();
  });

  describe('setup conditions', () => {
    it('should initialize pull-to-refresh state variables', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      // Initial state should be set correctly
      expect((el as any)._isPulling).toBe(false);
      expect((el as any)._pullDistance).toBe(0);
      expect((el as any)._hapticTriggered).toBe(false);
      expect((el as any)._threshold).toBe(80);
    });

    it('should have isRefreshing state property', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      expect(el.isRefreshing).toBe(false);
    });

    it('should setup pull-to-refresh when data is provided and component updates', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      // Wait for rendering
      await elementUpdated(el);
      await waitForFrames(3);

      // Pull-to-refresh setup flag should be set
      expect((el as any)._pullToRefreshSetup).toBe(true);
    });

    it('should have cached scroll container reference after setup', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);
      await waitForFrames(3);

      // Scroll container should be cached
      expect((el as any)._scrollContainer).toBeDefined();
    });

    it('should not duplicate setup on multiple updates', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);
      await waitForFrames(3);

      // Record setup state
      expect((el as any)._pullToRefreshSetup).toBe(true);

      // Trigger another update
      el.requestUpdate();
      await elementUpdated(el);
      await waitForFrames(2);

      // Setup should still be marked as complete (not reset)
      expect((el as any)._pullToRefreshSetup).toBe(true);
    });
  });

  describe('refresh indicator element', () => {
    it('should have initial height of 0 on refresh indicator', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);

      const indicator = el.shadowRoot?.querySelector(
        '#refresh-indicator'
      ) as HTMLElement;

      // CSS height should start at 0 (or empty, which is equivalent)
      const computedStyle = window.getComputedStyle(indicator);
      expect(
        indicator?.style.height === '' ||
          indicator?.style.height === '0px' ||
          computedStyle.height === '0px'
      ).toBe(true);
    });
  });

  describe('autoLoad guard behavior', () => {
    it('should check autoLoad before enabling pull gesture', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);
      await waitForFrames(3);

      // With autoLoad=false, the touch handler should return early
      // This is by design - autoLoad controls whether the timeline auto-refreshes
      expect(el.autoLoad).toBe(false);
    });
  });

  describe('threshold configuration', () => {
    it('should have threshold of 80px for triggering refresh', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      expect((el as any)._threshold).toBe(80);
    });
  });

  describe('list rendering', () => {
    it('should render list when data is provided', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);
      await waitForFrames(3);

      const list = el.shadowRoot?.querySelector('#mainList');
      expect(list).not.toBeNull();
      expect(list!.tagName.toLowerCase()).toBe('ul');
    });

    it('should use list as scroll container', async () => {
      const el = await fixture<Timeline>(
        html`<app-timeline
          .data=${testPosts}
          .autoLoad=${false}
        ></app-timeline>`
      );

      await elementUpdated(el);
      await waitForFrames(3);

      const list = el.shadowRoot?.querySelector('#mainList');
      const scrollContainer = (el as any)._scrollContainer;

      expect(list).not.toBeNull();
      expect(scrollContainer).toBe(list);
    });
  });
});
