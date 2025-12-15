import type { Page, Route } from '@playwright/test';
import {
  mockAccountProfile,
  mockBookmarks,
  mockFavorites,
  mockNotifications,
  mockSearchResult,
  mockTimelinePosts,
  mockTrendingLinks,
  mockTrendingStatuses,
  mockInstanceInfo,
  mockTrendingTags,
} from './mock-data';

const MASTODON_HOST = 'https://tech.lgbt';
const FUNCTIONS_HOST = 'https://us-central1-coho-mastodon.cloudfunctions.net';

const jsonResponse = (route: Route, data: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });

const defaultByMethod = (method: string) => {
  if (method === 'GET') {
    return [];
  }

  return { ok: true };
};

const latestTimelineId = () =>
  mockTimelinePosts[mockTimelinePosts.length - 1]?.id ?? 'post_mock_1';

// Helper to find a notification by ID
const findNotificationById = (id: string) =>
  mockNotifications.find((n) => n.id === id);

// Helper to find a post by ID
const findPostById = (id: string) => {
  // Check timeline posts
  const timelinePost = mockTimelinePosts.find((p) => p.id === id);
  if (timelinePost) return timelinePost;

  // Check notification statuses
  for (const notification of mockNotifications) {
    if (notification.status?.id === id) {
      return notification.status;
    }
  }

  return null;
};

async function handleMastodonRoute(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();

  if (pathname.startsWith('/api/v1/timelines')) {
    return jsonResponse(route, mockTimelinePosts);
  }

  if (pathname === '/api/v1/accounts/verify_credentials') {
    return jsonResponse(route, mockAccountProfile);
  }

  // Single notification by ID: /api/v1/notifications/:id
  const notificationMatch = pathname.match(
    /^\/api\/v1\/notifications\/([^/]+)$/
  );
  if (notificationMatch) {
    const notification = findNotificationById(notificationMatch[1]);
    if (notification) {
      return jsonResponse(route, notification);
    }
    return jsonResponse(route, { error: 'Record not found' }, 404);
  }

  if (pathname === '/api/v1/notifications') {
    return jsonResponse(route, mockNotifications);
  }

  // Single status by ID: /api/v1/statuses/:id
  const statusMatch = pathname.match(/^\/api\/v1\/statuses\/([^/]+)$/);
  if (statusMatch) {
    const post = findPostById(statusMatch[1]);
    if (post) {
      return jsonResponse(route, post);
    }
    return jsonResponse(route, { error: 'Record not found' }, 404);
  }

  // Status context (replies): /api/v1/statuses/:id/context
  const contextMatch = pathname.match(
    /^\/api\/v1\/statuses\/([^/]+)\/context$/
  );
  if (contextMatch) {
    return jsonResponse(route, { ancestors: [], descendants: [] });
  }

  if (pathname === '/api/v1/instance') {
    return jsonResponse(route, mockInstanceInfo);
  }

  if (pathname === '/api/v1/trends/statuses') {
    return jsonResponse(route, mockTrendingStatuses);
  }

  if (pathname === '/api/v1/trends/links') {
    return jsonResponse(route, mockTrendingLinks);
  }

  if (pathname === '/api/v1/trends/tags') {
    return jsonResponse(route, mockTrendingTags);
  }

  if (pathname === '/api/v1/markers' && method === 'POST') {
    return jsonResponse(route, [
      {
        home: {
          last_read_id: latestTimelineId(),
        },
      },
    ]);
  }

  return jsonResponse(route, defaultByMethod(method));
}

async function handleFunctionsRoute(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();

  if (pathname.endsWith('/getBookmarks')) {
    return jsonResponse(route, mockBookmarks);
  }

  if (pathname.endsWith('/getFavorites')) {
    return jsonResponse(route, mockFavorites);
  }

  if (pathname.endsWith('/search')) {
    return jsonResponse(route, mockSearchResult);
  }

  return jsonResponse(route, defaultByMethod(method));
}

export async function registerMockApis(page: Page) {
  await page.route(`${MASTODON_HOST}/api/v1/**`, handleMastodonRoute);
  // Also mock mastodon.social for the public preview timeline
  await page.route('https://mastodon.social/api/v1/**', handleMastodonRoute);
  await page.route(`${FUNCTIONS_HOST}/**`, handleFunctionsRoute);
}
