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

  // Follow requests
  http.get('https://*/api/v1/follow_requests', () => {
    return HttpResponse.json([
      {
        id: 'fr_acct_1',
        username: 'alice',
        acct: 'alice@remote.social',
        display_name: 'Alice',
        locked: false,
        bot: false,
        created_at: '2025-01-01T00:00:00.000Z',
        note: '<p>Hello</p>',
        url: 'https://remote.social/@alice',
        avatar: '',
        avatar_static: '',
        header: '',
        header_static: '',
        followers_count: 10,
        following_count: 20,
        statuses_count: 50,
        emojis: [],
        fields: [],
      },
      {
        id: 'fr_acct_2',
        username: 'bob',
        acct: 'bob@other.social',
        display_name: 'Bob',
        locked: false,
        bot: false,
        created_at: '2025-01-01T00:00:00.000Z',
        note: '<p>Hi there</p>',
        url: 'https://other.social/@bob',
        avatar: '',
        avatar_static: '',
        header: '',
        header_static: '',
        followers_count: 5,
        following_count: 15,
        statuses_count: 30,
        emojis: [],
        fields: [],
      },
    ]);
  }),

  http.post('https://*/api/v1/follow_requests/:id/authorize', () => {
    return HttpResponse.json({});
  }),

  http.post('https://*/api/v1/follow_requests/:id/reject', () => {
    return HttpResponse.json({});
  }),

  // Server preferences
  http.get('https://*/api/v1/preferences', () => {
    return HttpResponse.json({
      'posting:default:visibility': 'public',
      'posting:default:sensitive': false,
      'posting:default:language': 'en',
      'reading:expand:media': 'default',
      'reading:expand:spoilers': false,
    });
  }),
];

// Firebase Functions handlers
export const functionsHandlers = [
  http.post(
    'https://us-central1-coho-mastodon.cloudfunctions.net/getBookmarks',
    () => {
      return HttpResponse.json(mockBookmarks);
    }
  ),

  http.post(
    'https://us-central1-coho-mastodon.cloudfunctions.net/getFavorites',
    () => {
      return HttpResponse.json(mockFavorites);
    }
  ),

  http.post(
    'https://us-central1-coho-mastodon.cloudfunctions.net/search',
    () => {
      return HttpResponse.json(mockSearchResult);
    }
  ),

  http.post('https://us-central1-coho-mastodon.cloudfunctions.net/*', () => {
    return HttpResponse.json({ ok: true });
  }),
];

// Combined handlers
export const handlers = [...mastodonHandlers, ...functionsHandlers];
