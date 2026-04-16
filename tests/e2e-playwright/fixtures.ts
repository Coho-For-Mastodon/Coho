import { test as base, Page } from '@playwright/test';
import {
  mockTimelinePosts,
  mockNotifications,
  mockBookmarks,
  mockFavorites,
  mockSearchResult,
  mockTrendingStatuses,
  mockTrendingLinks,
  mockAccountProfile,
  mockInstanceInfo,
  mockTrendingTags,
  mockMediaAttachment,
  mockCreatedPost,
  mockOAuthApp,
  mockOAuthToken,
  mockExpandedTimeline,
  mockTimelinePageTwo,
} from '../mocks/mock-data';

// Re-export mock data for use in tests
export {
  mockTimelinePosts,
  mockNotifications,
  mockBookmarks,
  mockFavorites,
  mockSearchResult,
  mockAccountProfile,
  mockExpandedTimeline,
};

/**
 * Sets up API mocking using Playwright route interception
 */
export async function setupApiMocks(page: Page) {
  // Disable apiFetch retries in e2e tests to avoid retry delays causing flakiness
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__TEST_API_RETRIES = 0;
  });
  // Timeline endpoints
  await page.route('**/api/v1/timelines/home*', (route) => {
    route.fulfill({ json: mockTimelinePosts });
  });

  await page.route('**/api/v1/timelines/public*', (route) => {
    route.fulfill({ json: mockTimelinePosts });
  });

  await page.route('**/api/v1/timelines/tag/*', (route) => {
    route.fulfill({ json: mockTimelinePosts });
  });

  // Account endpoints
  await page.route('**/api/v1/accounts/verify_credentials', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  await page.route('**/api/v1/accounts/lookup*', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  await page.route('**/api/v1/accounts/*/statuses*', (route) => {
    route.fulfill({ json: mockTimelinePosts });
  });

  await page.route('**/api/v1/accounts/*/followers*', (route) => {
    route.fulfill({ json: [mockAccountProfile] });
  });

  await page.route('**/api/v1/accounts/*/following*', (route) => {
    route.fulfill({ json: [mockAccountProfile] });
  });

  await page.route('**/api/v1/accounts/*', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  // Notifications
  await page.route('**/api/v1/notifications', (route) => {
    route.fulfill({ json: mockNotifications });
  });

  await page.route('**/api/v1/notifications/*', (route) => {
    const id = route.request().url().split('/').pop();
    const notification = mockNotifications.find((n) => n.id === id);
    if (notification) {
      route.fulfill({ json: notification });
    } else {
      route.fulfill({ status: 404, json: { error: 'Not found' } });
    }
  });

  // Status action endpoints (must be registered before generic statuses/*)
  // Firebase function routes for favourite (boost) and reblog
  await page.route('**/boost', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const post =
        mockTimelinePosts.find((p) => p.id === body?.id) ||
        mockTimelinePosts[0];
      route.fulfill({
        json: {
          ...post,
          favourited: true,
          favourites_count: (post.favourites_count || 0) + 1,
        },
      });
    } else {
      route.fallback();
    }
  });

  await page.route('**/reblog', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const post =
        mockTimelinePosts.find((p) => p.id === body?.id) ||
        mockTimelinePosts[0];
      route.fulfill({
        json: {
          ...post,
          reblogged: true,
          reblogs_count: (post.reblogs_count || 0) + 1,
        },
      });
    } else {
      route.fallback();
    }
  });

  await page.route('**/api/v1/statuses/*/favourite', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({
      json: {
        ...post,
        favourited: true,
        favourites_count: (post.favourites_count || 0) + 1,
      },
    });
  });

  await page.route('**/api/v1/statuses/*/unfavourite', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({ json: { ...post, favourited: false } });
  });

  await page.route('**/api/v1/statuses/*/reblog', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({
      json: {
        ...post,
        reblogged: true,
        reblogs_count: (post.reblogs_count || 0) + 1,
      },
    });
  });

  await page.route('**/api/v1/statuses/*/unreblog', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({ json: { ...post, reblogged: false } });
  });

  await page.route('**/api/v1/statuses/*/bookmark', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({ json: { ...post, bookmarked: true } });
  });

  await page.route('**/api/v1/statuses/*/unbookmark', (route) => {
    const url = route.request().url();
    const id = url.split('/statuses/')[1]?.split('/')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) || mockTimelinePosts[0];
    route.fulfill({ json: { ...post, bookmarked: false } });
  });

  // Create new status
  await page.route('**/api/v1/statuses', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ json: mockCreatedPost });
    } else {
      route.fallback();
    }
  });

  // Media upload
  await page.route('**/api/v2/media', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ json: mockMediaAttachment });
    } else {
      route.fallback();
    }
  });

  // OAuth app registration
  await page.route('**/api/v1/apps', (route) => {
    route.fulfill({ json: mockOAuthApp });
  });

  // OAuth token exchange
  await page.route('**/oauth/token', (route) => {
    route.fulfill({ json: mockOAuthToken });
  });

  // Status endpoints
  await page.route('**/api/v1/statuses/*/context', (route) => {
    route.fulfill({ json: { ancestors: [], descendants: [] } });
  });

  await page.route('**/api/v1/statuses/*/reactions', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/statuses/*', (route) => {
    const url = route.request().url();
    // Skip if it's a sub-route like /context or /reactions
    if (url.includes('/context') || url.includes('/reactions')) {
      return;
    }
    const id = url.split('/').pop()?.split('?')[0];
    const post =
      mockTimelinePosts.find((p) => p.id === id) ||
      mockBookmarks.find((p) => p.id === id) ||
      mockFavorites.find((p) => p.id === id);
    if (post) {
      route.fulfill({ json: post });
    } else {
      // Return first mock post as fallback
      route.fulfill({ json: mockTimelinePosts[0] });
    }
  });

  // Bookmarks
  await page.route('**/api/v1/bookmarks*', (route) => {
    route.fulfill({ json: mockBookmarks });
  });

  // Favorites
  await page.route('**/api/v1/favourites*', (route) => {
    route.fulfill({ json: mockFavorites });
  });

  // Search
  await page.route('**/api/v2/search*', (route) => {
    route.fulfill({ json: mockSearchResult });
  });

  // Trends
  await page.route('**/api/v1/trends/statuses*', (route) => {
    route.fulfill({ json: mockTrendingStatuses });
  });

  await page.route('**/api/v1/trends/links*', (route) => {
    route.fulfill({ json: mockTrendingLinks });
  });

  await page.route('**/api/v1/trends/tags*', (route) => {
    route.fulfill({ json: mockTrendingTags });
  });

  await page.route('**/api/v1/trends*', (route) => {
    route.fulfill({ json: mockTrendingTags });
  });

  // Instance info
  await page.route('**/api/v1/instance*', (route) => {
    route.fulfill({ json: mockInstanceInfo });
  });

  await page.route('**/api/v2/instance*', (route) => {
    route.fulfill({ json: mockInstanceInfo });
  });

  // Streaming - just acknowledge the connection
  await page.route('**/api/v1/streaming*', (route) => {
    route.fulfill({ status: 200, body: '' });
  });

  // Custom emojis
  await page.route('**/api/v1/custom_emojis', (route) => {
    route.fulfill({ json: [] });
  });

  // Preferences
  await page.route('**/api/v1/preferences', (route) => {
    route.fulfill({
      json: {
        'posting:default:visibility': 'public',
        'posting:default:sensitive': false,
        'posting:default:language': 'en',
        'reading:expand:media': 'default',
        'reading:expand:spoilers': false,
      },
    });
  });

  // Lists
  await page.route('**/api/v1/lists*', (route) => {
    route.fulfill({ json: [] });
  });

  // Filters
  await page.route('**/api/v1/filters*', (route) => {
    route.fulfill({ json: [] });
  });

  // Announcements
  await page.route('**/api/v1/announcements*', (route) => {
    route.fulfill({ json: [] });
  });

  // Conversations (DMs)
  await page.route('**/api/v1/conversations*', (route) => {
    route.fulfill({ json: [] });
  });

  // Markers (read positions)
  await page.route('**/api/v1/markers*', (route) => {
    route.fulfill({ json: {} });
  });

  // Suggestions
  await page.route('**/api/v1/suggestions*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v2/suggestions*', (route) => {
    route.fulfill({ json: [] });
  });
}

/**
 * Navigate to a page with authentication already set up.
 * This ensures localStorage is populated before the app loads.
 */
export async function gotoWithAuth(
  page: Page,
  path: string,
  server = 'tech.lgbt',
  accessToken = 'mock-access-token'
) {
  // Use addInitScript to set localStorage before the page loads
  // This runs before ANY JavaScript on the page
  await page.addInitScript(
    ({ server, accessToken }) => {
      localStorage.setItem('server', server);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken);
    },
    { server, accessToken }
  );

  // Now navigate to the target page with auth already set
  await page.goto(path);
}

/**
 * Extended test fixture with API mocking pre-configured
 */
export const test = base.extend<{ authedPage: Page; statefulPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupApiMocks(page);
    await use(page);
  },
  statefulPage: async ({ page }, use) => {
    await setupStatefulApiMocks(page);
    await use(page);
  },
});

// ────────────────────────────────────────────────────────────
// Stateful mock infrastructure
// ────────────────────────────────────────────────────────────

type MockPost = (typeof mockExpandedTimeline)[number];

/**
 * Sets up API mocks backed by mutable in-memory state.
 * Mutations (favourite, bookmark, compose, etc.) update the state
 * so subsequent reads reflect the change.
 *
 * The timeline is served from `mockExpandedTimeline` (15 posts) with
 * cursor-based pagination via the `max_id` query parameter (page size 10).
 */
export async function setupStatefulApiMocks(page: Page) {
  // Mutable state
  const posts = new Map<string, MockPost>();
  const bookmarkedIds = new Set<string>();
  for (const p of mockExpandedTimeline) {
    posts.set(p.id, { ...p });
  }
  for (const p of mockTimelinePageTwo) {
    posts.set(p.id, { ...p });
  }

  // Helper: ordered timeline (newest first)
  const orderedTimeline = () =>
    [...posts.values()].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // Helper: paginate with max_id
  const paginateTimeline = (url: string, pageSize = 10) => {
    const maxId = new URL(url).searchParams.get('max_id');
    const ordered = orderedTimeline();
    if (!maxId) return ordered.slice(0, pageSize);
    const idx = ordered.findIndex((p) => p.id === maxId);
    if (idx === -1) return [];
    return ordered.slice(idx + 1, idx + 1 + pageSize);
  };

  // --- Timeline endpoints (paginated) ---
  await page.route('**/api/v1/timelines/home*', (route) => {
    const url = route.request().url();
    route.fulfill({ json: paginateTimeline(url) });
  });

  await page.route('**/api/v1/timelines/public*', (route) => {
    const url = route.request().url();
    route.fulfill({ json: paginateTimeline(url) });
  });

  await page.route('**/api/v1/timelines/tag/*', (route) => {
    const url = route.request().url();
    route.fulfill({ json: paginateTimeline(url) });
  });

  // --- Account endpoints ---
  await page.route('**/api/v1/accounts/verify_credentials', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  await page.route('**/api/v1/accounts/lookup*', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  await page.route('**/api/v1/accounts/*/statuses*', (route) => {
    route.fulfill({ json: orderedTimeline().slice(0, 10) });
  });

  await page.route('**/api/v1/accounts/*/followers*', (route) => {
    route.fulfill({ json: [mockAccountProfile] });
  });

  await page.route('**/api/v1/accounts/*/following*', (route) => {
    route.fulfill({ json: [mockAccountProfile] });
  });

  await page.route('**/api/v1/accounts/*', (route) => {
    route.fulfill({ json: mockAccountProfile });
  });

  // --- Notifications ---
  await page.route('**/api/v1/notifications', (route) => {
    route.fulfill({ json: mockNotifications });
  });

  await page.route('**/api/v1/notifications/*', (route) => {
    const id = route.request().url().split('/').pop();
    const notification = mockNotifications.find((n) => n.id === id);
    route.fulfill(
      notification
        ? { json: notification }
        : { status: 404, json: { error: 'Not found' } }
    );
  });

  // --- Stateful action endpoints (before generic statuses/*) ---
  // Firebase function routes for favourite (boost) and reblog
  await page.route('**/boost', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const post =
        posts.get(body?.id) || posts.get(mockExpandedTimeline[0].id)!;
      post.favourited = true;
      post.favourites_count = (post.favourites_count || 0) + 1;
      route.fulfill({ json: { ...post } });
    } else {
      route.fallback();
    }
  });

  await page.route('**/reblog', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const post =
        posts.get(body?.id) || posts.get(mockExpandedTimeline[0].id)!;
      post.reblogged = true;
      post.reblogs_count = (post.reblogs_count || 0) + 1;
      route.fulfill({ json: { ...post } });
    } else {
      route.fallback();
    }
  });

  await page.route('**/api/v1/statuses/*/favourite', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.favourited = true;
    post.favourites_count = (post.favourites_count || 0) + 1;
    route.fulfill({ json: { ...post } });
  });

  await page.route('**/api/v1/statuses/*/unfavourite', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.favourited = false;
    post.favourites_count = Math.max(0, (post.favourites_count || 1) - 1);
    route.fulfill({ json: { ...post } });
  });

  await page.route('**/api/v1/statuses/*/reblog', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.reblogged = true;
    post.reblogs_count = (post.reblogs_count || 0) + 1;
    route.fulfill({ json: { ...post } });
  });

  await page.route('**/api/v1/statuses/*/unreblog', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.reblogged = false;
    post.reblogs_count = Math.max(0, (post.reblogs_count || 1) - 1);
    route.fulfill({ json: { ...post } });
  });

  await page.route('**/api/v1/statuses/*/bookmark', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.bookmarked = true;
    bookmarkedIds.add(post.id);
    route.fulfill({ json: { ...post } });
  });

  await page.route('**/api/v1/statuses/*/unbookmark', (route) => {
    const id = route.request().url().split('/statuses/')[1]?.split('/')[0];
    const post = posts.get(id) || posts.get(mockExpandedTimeline[0].id)!;
    post.bookmarked = false;
    bookmarkedIds.delete(post.id);
    route.fulfill({ json: { ...post } });
  });

  // --- Create new status (stateful — inserts into map) ---
  await page.route('**/api/v1/statuses', (route) => {
    if (route.request().method() === 'POST') {
      const newPost = {
        ...mockCreatedPost,
        created_at: new Date().toISOString(),
      };
      posts.set(newPost.id, newPost as MockPost);
      route.fulfill({ json: newPost });
    } else {
      route.fallback();
    }
  });

  // --- Media upload ---
  await page.route('**/api/v2/media', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ json: mockMediaAttachment });
    } else {
      route.fallback();
    }
  });

  // --- OAuth ---
  await page.route('**/api/v1/apps', (route) => {
    route.fulfill({ json: mockOAuthApp });
  });

  await page.route('**/oauth/token', (route) => {
    route.fulfill({ json: mockOAuthToken });
  });

  // --- Status detail endpoints ---
  await page.route('**/api/v1/statuses/*/context', (route) => {
    route.fulfill({ json: { ancestors: [], descendants: [] } });
  });

  await page.route('**/api/v1/statuses/*/reactions', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/statuses/*', (route) => {
    const url = route.request().url();
    if (url.includes('/context') || url.includes('/reactions')) return;
    const id = url.split('/').pop()?.split('?')[0];
    const post = id ? posts.get(id) : undefined;
    route.fulfill({ json: post || mockExpandedTimeline[0] });
  });

  // --- Bookmarks (stateful) ---
  await page.route('**/api/v1/bookmarks*', (route) => {
    const bookmarked = [...bookmarkedIds]
      .map((id) => posts.get(id))
      .filter(Boolean);
    route.fulfill({ json: bookmarked.length > 0 ? bookmarked : mockBookmarks });
  });

  // --- Favorites ---
  await page.route('**/api/v1/favourites*', (route) => {
    route.fulfill({ json: mockFavorites });
  });

  // --- Search ---
  await page.route('**/api/v2/search*', (route) => {
    route.fulfill({ json: mockSearchResult });
  });

  // --- Trends ---
  await page.route('**/api/v1/trends/statuses*', (route) => {
    route.fulfill({ json: mockTrendingStatuses });
  });

  await page.route('**/api/v1/trends/links*', (route) => {
    route.fulfill({ json: mockTrendingLinks });
  });

  await page.route('**/api/v1/trends/tags*', (route) => {
    route.fulfill({ json: mockTrendingTags });
  });

  await page.route('**/api/v1/trends*', (route) => {
    route.fulfill({ json: mockTrendingTags });
  });

  // --- Instance & misc ---
  await page.route('**/api/v1/instance*', (route) => {
    route.fulfill({ json: mockInstanceInfo });
  });

  await page.route('**/api/v2/instance*', (route) => {
    route.fulfill({ json: mockInstanceInfo });
  });

  await page.route('**/api/v1/streaming*', (route) => {
    route.fulfill({ status: 200, body: '' });
  });

  await page.route('**/api/v1/custom_emojis', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/preferences', (route) => {
    route.fulfill({
      json: {
        'posting:default:visibility': 'public',
        'posting:default:sensitive': false,
        'posting:default:language': 'en',
        'reading:expand:media': 'default',
        'reading:expand:spoilers': false,
      },
    });
  });

  await page.route('**/api/v1/lists*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/filters*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/announcements*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/conversations*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v1/markers*', (route) => {
    route.fulfill({ json: {} });
  });

  await page.route('**/api/v1/suggestions*', (route) => {
    route.fulfill({ json: [] });
  });

  await page.route('**/api/v2/suggestions*', (route) => {
    route.fulfill({ json: [] });
  });
}

export { expect } from '@playwright/test';
