import { http, HttpResponse } from 'msw';
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
  mockMediaAttachment,
} from './mock-data';

// Helper to find a notification by ID
const findNotificationById = (id: string) =>
  mockNotifications.find((n) => n.id === id);

// Helper to find a post by ID
const findPostById = (id: string) => {
  // Check timeline posts
  const timelinePost = mockTimelinePosts.find((p) => p.id === id);
  if (timelinePost) return timelinePost;

  // Check bookmarks
  const bookmark = mockBookmarks.find((p) => p.id === id);
  if (bookmark) return bookmark;

  // Check favorites
  const favorite = mockFavorites.find((p) => p.id === id);
  if (favorite) return favorite;

  // Check notification statuses
  for (const notification of mockNotifications) {
    if (notification.status?.id === id) {
      return notification.status;
    }
  }

  return null;
};

// Mastodon API handlers - use wildcard * for server-agnostic matching
export const mastodonHandlers = [
  // Timeline endpoints
  http.get('https://*/api/v1/timelines/home', () => {
    return HttpResponse.json(mockTimelinePosts);
  }),

  http.get('https://*/api/v1/timelines/public', () => {
    return HttpResponse.json(mockTimelinePosts);
  }),

  http.get('https://*/api/v1/timelines/tag/:tag', () => {
    return HttpResponse.json(mockTimelinePosts);
  }),

  // Account endpoints
  http.get('https://*/api/v1/accounts/verify_credentials', () => {
    return HttpResponse.json(mockAccountProfile);
  }),

  // Notifications
  http.get('https://*/api/v1/notifications/:id', ({ params }) => {
    const notification = findNotificationById(params.id as string);
    if (notification) {
      return HttpResponse.json(notification);
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.get('https://*/api/v1/notifications', () => {
    return HttpResponse.json(mockNotifications);
  }),

  // Single status by ID
  http.get('https://*/api/v1/statuses/:id/context', () => {
    return HttpResponse.json({ ancestors: [], descendants: [] });
  }),

  http.get('https://*/api/v1/statuses/:id/reactions', () => {
    return HttpResponse.json([]);
  }),

  http.get('https://*/api/v1/statuses/:id', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json(post);
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  // Status actions
  http.post('https://*/api/v1/statuses/:id/bookmark', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, bookmarked: true });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses/:id/unbookmark', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, bookmarked: false });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses/:id/favourite', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, favourited: true });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses/:id/unfavourite', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, favourited: false });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses/:id/reblog', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, reblogged: true });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses/:id/unreblog', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({ ...post, reblogged: false });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.delete('https://*/api/v1/statuses/:id', ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json(post);
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.put('https://*/api/v1/statuses/:id', async ({ params }) => {
    const post = findPostById(params.id as string);
    if (post) {
      return HttpResponse.json({
        ...post,
        edited_at: '2025-01-01T00:00:00.000Z',
      });
    }
    return HttpResponse.json({ error: 'Record not found' }, { status: 404 });
  }),

  http.post('https://*/api/v1/statuses', () => {
    return HttpResponse.json({
      ...mockTimelinePosts[0],
      id: 'new_post_' + Date.now(),
    });
  }),

  // Media upload
  http.post('https://*/api/v1/media', () => {
    return HttpResponse.json({
      ...mockMediaAttachment,
      id: 'media_' + Date.now(),
    });
  }),

  http.post('https://*/api/v2/media', () => {
    return HttpResponse.json({
      ...mockMediaAttachment,
      id: 'media_' + Date.now(),
    });
  }),

  http.put('https://*/api/v1/media/:id', () => {
    return HttpResponse.json(mockMediaAttachment);
  }),

  // Instance info
  http.get('https://*/api/v1/instance', () => {
    return HttpResponse.json(mockInstanceInfo);
  }),

  // Trends
  http.get('https://*/api/v1/trends/statuses', () => {
    return HttpResponse.json(mockTrendingStatuses);
  }),

  http.get('https://*/api/v1/trends/links', () => {
    return HttpResponse.json(mockTrendingLinks);
  }),

  http.get('https://*/api/v1/trends/tags', () => {
    return HttpResponse.json(mockTrendingTags);
  }),

  // Markers
  http.post('https://*/api/v1/markers', () => {
    const latestId =
      mockTimelinePosts[mockTimelinePosts.length - 1]?.id ?? 'post_mock_1';
    return HttpResponse.json({
      home: {
        last_read_id: latestId,
      },
    });
  }),

  http.get('https://*/api/v1/markers', () => {
    return HttpResponse.json({
      home: {
        last_read_id: 'post_mock_1',
        version: 1,
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    });
  }),
];

// Mock instance search results
export const mockInstanceSearchResults = {
  instances: [
    {
      name: 'mastodon.social',
      users: 1000000,
      thumbnail: 'https://mastodon.social/icon.png',
      info: { short_description: 'The original Mastodon server' },
    },
    {
      name: 'tech.lgbt',
      users: 50000,
      thumbnail: 'https://tech.lgbt/icon.png',
      info: { short_description: 'For LGBTQ+ people in tech' },
    },
    {
      name: 'fosstodon.org',
      users: 75000,
      thumbnail: 'https://fosstodon.org/icon.png',
      info: {
        short_description: 'For Free & Open Source Software enthusiasts',
      },
    },
  ],
};

// Firebase Functions handlers
export const functionsHandlers = [
  http.get(
    'https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks',
    () => {
      return HttpResponse.json(mockBookmarks);
    }
  ),

  http.get(
    'https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites',
    () => {
      return HttpResponse.json(mockFavorites);
    }
  ),

  http.get(
    'https://us-central1-coho-mastodon.cloudfunctions.net/search',
    () => {
      return HttpResponse.json(mockSearchResult);
    }
  ),

  // OAuth authentication - initiate OAuth flow
  http.post(
    'https://us-central1-coho-mastodon.cloudfunctions.net/authenticate',
    async ({ request }) => {
      const url = new URL(request.url);
      const server = url.searchParams.get('server');
      const redirectUri =
        url.searchParams.get('redirect_uri') || 'http://localhost:3000';
      // Return a mock OAuth redirect URL with code and state
      return HttpResponse.json({
        url: `${redirectUri}?code=mock_auth_code_12345&state=mock_state_${server}`,
      });
    }
  ),

  // OAuth token exchange - get access token from code
  http.post(
    'https://us-central1-coho-mastodon.cloudfunctions.net/getClient',
    async ({ request }) => {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      if (!code) {
        return HttpResponse.json(
          { error: 'Missing code parameter' },
          { status: 400 }
        );
      }
      // Return a mock access token
      return HttpResponse.json({
        access_token: 'mock-access-token-from-oauth',
      });
    }
  ),

  http.post('https://us-central1-coho-mastodon.cloudfunctions.net/*', () => {
    return HttpResponse.json({ ok: true });
  }),
];

// Instance search API handlers (instances.social)
export const instanceSearchHandlers = [
  http.get(
    'https://instances.social/api/1.0/instances/search',
    ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('q')?.toLowerCase() || '';

      // Filter mock instances based on query
      const filtered = mockInstanceSearchResults.instances.filter((inst) =>
        inst.name.toLowerCase().includes(query)
      );

      return HttpResponse.json({
        instances:
          filtered.length > 0 ? filtered : mockInstanceSearchResults.instances,
      });
    }
  ),
];

// Combined handlers
export const handlers = [
  ...mastodonHandlers,
  ...functionsHandlers,
  ...instanceSearchHandlers,
];
