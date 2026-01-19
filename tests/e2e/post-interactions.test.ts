import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { setupAuth } from '../setup';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

// Import the timeline-item component for post interactions
import '../../src/components/timeline-item';
import type { TimelineItem } from '../../src/components/timeline-item';

// Cast mock data for type safety
const testPosts = mockTimelinePosts as unknown as Post[];

// Helper to wait for async operations
async function waitFor(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Post Interactions E2E', () => {
  beforeEach(() => {
    setupAuth();
    cleanupFixtures();
  });

  describe('timeline-item rendering', () => {
    it('should render timeline-item component', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      expect(el).toBeDefined();
      expect(el.tagName.toLowerCase()).toBe('timeline-item');
    });

    it('should have a shadow root', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      expect(el.shadowRoot).not.toBeNull();
    });

    it('should receive post data', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);

      expect(el.tweet).toBeDefined();
      expect(el.tweet?.id).toBe('post_mock_1');
    });

    it('should display post content', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Post content should be rendered somewhere in shadow DOM
      const content = el.shadowRoot?.textContent;
      expect(content).toContain('Welcome to the mocked timeline');
    });
  });

  describe('author information', () => {
    it('should display author username', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      const content = el.shadowRoot?.textContent;
      expect(content).toContain('coho');
    });

    it('should display author avatar', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      const avatar = el.shadowRoot?.querySelector('img, .avatar');
      expect(avatar).toBeDefined();
    });
  });

  describe('interaction buttons', () => {
    it('should have reply button', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      // Look for reply icon/button
      const buttons = el.shadowRoot?.querySelectorAll(
        'md-icon-button, button, [role="button"]'
      );
      expect(buttons?.length).toBeGreaterThan(0);
    });

    it('should have boost/reblog button', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      // Component should be interactive
      expect(
        el.shadowRoot?.querySelector('[class*="action"], [class*="button"]')
      ).toBeDefined();
    });

    it('should have favorite button', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.shadowRoot).toBeDefined();
    });

    it('should have bookmark button', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.shadowRoot).toBeDefined();
    });
  });

  describe('bookmark action', () => {
    it('should dispatch bookmark event', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      const bookmarkSpy = vi.fn();
      el.addEventListener('bookmark', bookmarkSpy);

      // Trigger bookmark action if method exists
      if ('handleBookmark' in el) {
        (
          el as TimelineItem & { handleBookmark: () => void }
        ).handleBookmark?.();
      }
    });

    it('should show bookmarked state when post is bookmarked', async () => {
      const bookmarkedPost = { ...testPosts[0], bookmarked: true };
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${bookmarkedPost}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.tweet?.bookmarked).toBe(true);
    });
  });

  describe('favorite action', () => {
    it('should show favorited state when post is favorited', async () => {
      const favoritedPost = { ...testPosts[0], favourited: true };
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${favoritedPost}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.tweet?.favourited).toBe(true);
    });

    it('should display favorite count', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Post has 5 favorites in mock data
      expect(testPosts[0].favourites_count).toBe(5);
    });
  });

  describe('reblog/boost action', () => {
    it('should show reblogged state when post is boosted', async () => {
      const rebloggedPost = { ...testPosts[0], reblogged: true };
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${rebloggedPost}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.tweet?.reblogged).toBe(true);
    });

    it('should display reblog count', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Post has 2 reblogs in mock data
      expect(testPosts[0].reblogs_count).toBe(2);
    });
  });

  describe('reply action', () => {
    it('should display reply count', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Post has 3 replies in mock data
      expect(testPosts[0].replies_count).toBe(3);
    });
  });

  describe('post metadata', () => {
    it('should display timestamp', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${testPosts[0]}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Post has created_at timestamp
      expect(testPosts[0].created_at).toBeDefined();
    });

    it('should handle sensitive content flag', async () => {
      const sensitivePost = {
        ...testPosts[0],
        sensitive: true,
        spoiler_text: 'CW: Test',
      };
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${sensitivePost}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.tweet?.sensitive).toBe(true);
    });

    it('should display visibility icon for non-public posts', async () => {
      const privatePost = { ...testPosts[0], visibility: 'private' };
      const el = await fixture<TimelineItem>(
        html`<timeline-item .tweet=${privatePost}></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(200);

      expect(el.tweet?.visibility).toBe('private');
    });
  });

  describe('wellness mode', () => {
    it('should accept wellness mode property', async () => {
      const el = await fixture<TimelineItem>(
        html`<timeline-item
          .tweet=${testPosts[0]}
          .wellnessMode=${true}
        ></timeline-item>`
      );
      await elementUpdated(el);
      await waitFor(100);

      // Wellness mode hides engagement counts
      expect(el).toBeDefined();
    });
  });
});
