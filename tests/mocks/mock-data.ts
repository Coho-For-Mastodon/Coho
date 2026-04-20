// Use static timestamps for deterministic tests
const MOCK_TIMESTAMP = '2025-01-01T12:00:00.000Z';
const MOCK_TIMESTAMP_EARLIER = '2025-01-01T11:55:00.000Z';

/**
 * Generate N mock posts with sequential IDs and descending timestamps.
 * Post 0 starts at MOCK_TIMESTAMP, each subsequent post is 5 minutes earlier.
 */
export function generateMockPosts(
  count: number,
  account = mockAccount,
  idPrefix = 'post_mock_'
) {
  const base = new Date(MOCK_TIMESTAMP).getTime();
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}${i + 1}`,
    created_at: new Date(base - i * 5 * 60 * 1000).toISOString(),
    in_reply_to_id: null,
    in_reply_to_account_id: null,
    sensitive: false,
    spoiler_text: '',
    visibility: 'public' as const,
    uri: `https://tech.lgbt/users/coho/statuses/${idPrefix}${i + 1}`,
    url: `https://tech.lgbt/@coho/${idPrefix}${i + 1}`,
    replies_count: Math.max(0, 3 - i),
    reblogs_count: Math.max(0, 2 - i),
    favourites_count: Math.max(0, 5 - i),
    favourited: false,
    reblogged: false,
    muted: false,
    bookmarked: false,
    pinned: false,
    content: `<p>Mock post number ${i + 1}.</p>`,
    reblog: null,
    application: { name: 'Coho Test Harness', website: null },
    account,
    media_attachments: [] as never[],
    mentions: [] as never[],
    tags: [] as never[],
    emojis: [] as never[],
    card: null,
    poll: null,
    reply_to: null,
    ancestors: [] as never[],
    thread_continuation: [] as never[],
  }));
}

const mockAccount = {
  id: 'acct_mock_1',
  username: 'coho',
  acct: 'coho@mock.social',
  display_name: 'Coho Bot',
  locked: false,
  bot: false,
  created_at: MOCK_TIMESTAMP,
  note: '<p>Resident test account</p>',
  url: 'https://tech.lgbt/@coho',
  avatar: '/assets/icons/icon-128.png',
  avatar_static: '/assets/icons/icon-128.png',
  header: '/assets/icons/icon-512.png',
  header_static: '/assets/icons/icon-512.png',
  followers_count: 420,
  following_count: 133,
  statuses_count: 2048,
  emojis: [],
  fields: [],
};

const basePost = {
  id: 'post_mock_1',
  created_at: MOCK_TIMESTAMP,
  in_reply_to_id: null,
  in_reply_to_account_id: null,
  sensitive: false,
  spoiler_text: '',
  visibility: 'public',
  uri: 'https://tech.lgbt/users/coho/statuses/post_mock_1',
  url: 'https://tech.lgbt/@coho/post_mock_1',
  replies_count: 3,
  reblogs_count: 2,
  favourites_count: 5,
  favourited: false,
  reblogged: false,
  muted: false,
  bookmarked: false,
  pinned: false,
  content: '<p>Welcome to the mocked timeline!</p>',
  reblog: null,
  application: {
    name: 'Coho Test Harness',
    website: null,
  },
  account: mockAccount,
  media_attachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  card: null,
  poll: null,
  reply_to: null,
  ancestors: [],
  thread_continuation: [],
};

const secondaryPost = {
  ...basePost,
  id: 'post_mock_2',
  created_at: MOCK_TIMESTAMP_EARLIER,
  content: '<p>Timeline post number two.</p>',
  replies_count: 1,
  favourites_count: 2,
};

export const mockTimelinePosts = [basePost, secondaryPost];

/**
 * Expanded timeline with 15 posts for pagination testing.
 * First two entries are basePost and secondaryPost (same IDs/content)
 * so existing tests referencing their text still pass.
 */
export const mockExpandedTimeline = [
  basePost,
  secondaryPost,
  ...generateMockPosts(13, mockAccount, 'post_gen_').map((p, i) => ({
    ...p,
    // Start timestamps after secondaryPost
    created_at: new Date(
      new Date(MOCK_TIMESTAMP_EARLIER).getTime() - (i + 1) * 5 * 60 * 1000
    ).toISOString(),
  })),
];

/**
 * Second page of posts for pagination (older than everything in mockExpandedTimeline).
 */
export const mockTimelinePageTwo = generateMockPosts(
  10,
  mockAccount,
  'post_page2_'
).map((p, i) => ({
  ...p,
  created_at: new Date(
    new Date(MOCK_TIMESTAMP_EARLIER).getTime() - (15 + i) * 5 * 60 * 1000
  ).toISOString(),
}));

export const mockBookmarks = [
  {
    ...basePost,
    id: 'bookmark_mock_1',
    content: '<p>Saved post from your bookmarks.</p>',
    bookmarked: true,
  },
];

export const mockFavorites = [
  {
    ...basePost,
    id: 'favorite_mock_1',
    content: '<p>Your favorited post appears here.</p>',
    favourited: true,
  },
];

export const mockNotifications = [
  {
    id: 'notify_follow_1',
    type: 'follow',
    created_at: MOCK_TIMESTAMP,
    account: mockAccount,
    status: basePost,
  },
  {
    id: 'notify_favourite_1',
    type: 'favourite',
    created_at: MOCK_TIMESTAMP,
    account: mockAccount,
    status: secondaryPost,
  },
  {
    id: 'notify_mention_1',
    type: 'mention',
    created_at: MOCK_TIMESTAMP,
    account: mockAccount,
    status: {
      ...basePost,
      id: 'post_mention_1',
      content: '<p>@you This is a mention notification!</p>',
    },
  },
];

export const mockSearchResult = {
  query: 'Mastodon',
  accounts: [
    {
      id: 'acct_search_1',
      username: 'searchbot',
      acct: 'searchbot@mock.social',
      display_name: 'Search Bot',
      note: '<p>I love search results.</p>',
      url: 'https://tech.lgbt/@searchbot',
      avatar: '/assets/icons/icon-128.png',
      avatar_static: '/assets/icons/icon-128.png',
    },
  ],
  statuses: mockTimelinePosts,
  hashtags: [
    {
      name: 'coho',
      url: 'https://tech.lgbt/tags/coho',
    },
  ],
};

export const mockTrendingStatuses = mockTimelinePosts;

export const mockTrendingLinks = [
  {
    url: 'https://coho.app/blog/mock-news',
    title: 'Coho Mock News',
    description: 'Daily digest generated by the local mock server.',
    image: '/assets/screenshots/home.png',
  },
];

export const mockAccountProfile = mockAccount;

export const mockInstanceInfo = {
  title: 'Tech.LGBT Mock Instance',
  thumbnail: '/assets/icons/icon-192-maskable.png',
  description: '<p>Mock description for the local test instance.</p>',
  configuration: {
    statuses: {
      max_characters: 500,
      max_media_attachments: 4,
      characters_reserved_per_url: 23,
    },
    media_attachments: {
      supported_mime_types: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
      ],
      image_size_limit: 10485760,
      image_matrix_limit: 16777216,
      video_size_limit: 41943040,
      video_frame_rate_limit: 60,
      video_matrix_limit: 2304000,
    },
    polls: {
      max_options: 4,
      max_characters_per_option: 50,
      min_expiration: 300,
      max_expiration: 2629746,
    },
  },
};

export const mockMediaAttachment = {
  id: 'media_mock_1',
  type: 'image',
  url: 'https://files.tech.lgbt/mock-image.png',
  preview_url: 'https://files.tech.lgbt/mock-image-preview.png',
  remote_url: null,
  description: '',
  blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  meta: {
    original: {
      width: 1200,
      height: 800,
      size: '1200x800',
      aspect: 1.5,
    },
  },
};

export const mockTrendingTags = [
  {
    name: 'coho',
    url: 'https://tech.lgbt/tags/coho',
    history: [
      {
        day: '1668297600',
        uses: '100',
        accounts: '50',
      },
    ],
  },
];

const mockAccountListFields = {
  locked: false,
  bot: false,
  created_at: MOCK_TIMESTAMP,
  note: '',
  avatar: '',
  avatar_static: '',
  header: '',
  header_static: '',
  followers_count: 0,
  following_count: 0,
  statuses_count: 0,
  emojis: [],
  fields: [],
};

/** Blocked accounts for MSW (paginated list + lookup tests). */
export const mockBlockedAccounts = [
  {
    id: 'block_1',
    username: 'blocked_a',
    acct: 'blocked_a@elsewhere',
    display_name: 'Blocked A',
    url: 'https://elsewhere/@blocked_a',
    ...mockAccountListFields,
  },
  {
    id: 'block_2',
    username: 'blocked_b',
    acct: 'blocked_b@elsewhere',
    display_name: 'Blocked B',
    url: 'https://elsewhere/@blocked_b',
    ...mockAccountListFields,
  },
];

export const mockMutedAccounts = [
  {
    id: 'mute_1',
    username: 'muted_a',
    acct: 'muted_a@elsewhere',
    display_name: 'Muted A',
    url: 'https://elsewhere/@muted_a',
    ...mockAccountListFields,
  },
  {
    id: 'mute_2',
    username: 'muted_b',
    acct: 'muted_b@elsewhere',
    display_name: 'Muted B',
    url: 'https://elsewhere/@muted_b',
    ...mockAccountListFields,
  },
];

export const mockLookupImportAccount = {
  id: 'lookup_import_1',
  username: 'importme',
  acct: 'importme@remote.social',
  display_name: 'Import Me',
  url: 'https://remote.social/@importme',
  ...mockAccountListFields,
};

export const mockEditHistory = [
  {
    content: '<p>Welcome to the mocked timeline! (edited)</p>',
    spoiler_text: '',
    sensitive: false,
    created_at: MOCK_TIMESTAMP,
    account: mockAccount,
    poll: null,
    media_attachments: [],
    emojis: [],
  },
  {
    content: '<p>Welcome to the mocked timeline!</p>',
    spoiler_text: '',
    sensitive: false,
    created_at: MOCK_TIMESTAMP_EARLIER,
    account: mockAccount,
    poll: null,
    media_attachments: [],
    emojis: [],
  },
];

export const mockCreatedPost = {
  ...basePost,
  id: 'post_created_1',
  created_at: '2025-01-01T12:05:00.000Z',
  content: '<p>This is a newly created post!</p>',
  replies_count: 0,
  reblogs_count: 0,
  favourites_count: 0,
};

export const mockOAuthApp = {
  id: 'app_mock_1',
  name: 'Coho',
  website: 'https://coho.app',
  redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
  client_id: 'mock-client-id',
  client_secret: 'mock-client-secret',
  vapid_key: 'mock-vapid-key',
};

export const mockOAuthToken = {
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  scope: 'read write follow push',
  created_at: 1672531200,
};

// ── Lists ─────────────────────────────────────────────────────────────────────

export const mockLists = [
  { id: 'list_mock_1', title: 'Mastodon', replies_policy: 'list' as const },
  { id: 'list_mock_2', title: 'Web', replies_policy: 'followed' as const },
];

export const mockListAccounts = [
  {
    ...mockAccount,
    id: 'acct_mock_1',
    username: 'coho',
    acct: 'coho@mock.social',
    display_name: 'Coho Bot',
  },
];

export const mockAccountSearchResults = [
  {
    ...mockAccount,
    id: 'acct_search_1',
    username: 'searchbot',
    acct: 'searchbot@mock.social',
    display_name: 'Search Bot',
    avatar_static: '/assets/icons/icon-128.png',
  },
  {
    ...mockAccount,
    id: 'acct_search_2',
    username: 'otheruser',
    acct: 'otheruser@mock.social',
    display_name: 'Other User',
    avatar_static: '/assets/icons/icon-128.png',
  },
];
