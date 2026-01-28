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
} from '../mocks/mock-data';

// Re-export mock data for use in tests
export {
  mockTimelinePosts,
  mockNotifications,
  mockBookmarks,
  mockFavorites,
  mockSearchResult,
  mockAccountProfile,
};

/**
 * Sets up API mocking using Playwright route interception
 */
export async function setupApiMocks(page: Page) {
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
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupApiMocks(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
