import { describe, it, expect } from 'vitest';
import { groupSelfThreads } from '../../../src/mastodon/api/timelines';
import type { Post } from '../../../src/interfaces/Post';

const MOCK_ACCOUNT = {
  id: 'acct_1',
  username: 'alice',
  acct: 'alice@example.com',
  display_name: 'Alice',
  locked: false,
  bot: false,
  created_at: '2025-01-01T00:00:00Z',
  note: '',
  url: '',
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

const OTHER_ACCOUNT = { ...MOCK_ACCOUNT, id: 'acct_2', username: 'bob' };

/** Helper to create a minimal Post for testing. */
function makePost(overrides: Partial<Post> & { id: string }): Post {
  return {
    created_at: '2025-01-01T00:00:00Z',
    in_reply_to_id: null,
    in_reply_to_account_id: null,
    sensitive: false,
    spoiler_text: '',
    visibility: 'public',
    uri: '',
    url: '',
    replies_count: 0,
    reblogs_count: 0,
    favourites_count: 0,
    favourited: false,
    reblogged: false,
    muted: false,
    bookmarked: false,
    pinned: false,
    content: '',
    reblog: null,
    application: null,
    account: MOCK_ACCOUNT,
    media_attachments: [],
    mentions: [],
    tags: [],
    emojis: [],
    card: null,
    poll: null,
    ...overrides,
  } as Post;
}

describe('groupSelfThreads', () => {
  it('returns empty array for empty input', () => {
    expect(groupSelfThreads([])).toEqual([]);
  });

  it('passes through posts with no self-replies', () => {
    const posts = [makePost({ id: '1' }), makePost({ id: '2' })];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('groups a simple 2-post self-thread', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', in_reply_to_id: '1' }),
    ];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].thread_continuation).toHaveLength(1);
    expect(result[0].thread_continuation![0].id).toBe('2');
    expect(result[0].thread_truncated).toBeFalsy();
  });

  it('groups a 3-post self-thread (root + 2 continuations)', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', in_reply_to_id: '1' }),
      makePost({ id: '3', in_reply_to_id: '2' }),
    ];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(1);
    expect(result[0].thread_continuation).toHaveLength(2);
    expect(result[0].thread_truncated).toBeFalsy();
  });

  it('truncates self-thread longer than 3 posts (root + 2)', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', in_reply_to_id: '1' }),
      makePost({ id: '3', in_reply_to_id: '2' }),
      makePost({ id: '4', in_reply_to_id: '3' }),
      makePost({ id: '5', in_reply_to_id: '4' }),
    ];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].thread_continuation).toHaveLength(2);
    expect(result[0].thread_continuation![0].id).toBe('2');
    expect(result[0].thread_continuation![1].id).toBe('3');
    expect(result[0].thread_truncated).toBe(true);
  });

  it('handles reverse-chronological ordering (newest first)', () => {
    // Timeline often returns newest-first: [5, 4, 3, 2, 1]
    const posts = [
      makePost({ id: '5', in_reply_to_id: '4' }),
      makePost({ id: '4', in_reply_to_id: '3' }),
      makePost({ id: '3', in_reply_to_id: '2' }),
      makePost({ id: '2', in_reply_to_id: '1' }),
      makePost({ id: '1' }),
    ];
    const result = groupSelfThreads(posts);
    // Should produce a single root (post 1) with continuations
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].thread_continuation).toHaveLength(2);
    expect(result[0].thread_truncated).toBe(true);
  });

  it('does not group replies from different authors', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', in_reply_to_id: '1', account: OTHER_ACCOUNT }),
    ];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(2);
    expect(result[0].thread_continuation).toBeUndefined();
    expect(result[1].thread_continuation).toBeUndefined();
  });

  it('handles multiple independent self-threads in one batch', () => {
    const posts = [
      makePost({ id: 'a1' }),
      makePost({ id: 'a2', in_reply_to_id: 'a1' }),
      makePost({ id: 'b1', account: OTHER_ACCOUNT }),
      makePost({ id: 'b2', in_reply_to_id: 'b1', account: OTHER_ACCOUNT }),
    ];
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a1');
    expect(result[0].thread_continuation).toHaveLength(1);
    expect(result[1].id).toBe('b1');
    expect(result[1].thread_continuation).toHaveLength(1);
  });

  it('handles a 20-post self-thread (long thread)', () => {
    const posts: Post[] = [];
    for (let i = 1; i <= 20; i++) {
      posts.push(
        makePost({
          id: String(i),
          in_reply_to_id: i === 1 ? null : String(i - 1),
        })
      );
    }
    const result = groupSelfThreads(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].thread_continuation).toHaveLength(2);
    expect(result[0].thread_truncated).toBe(true);
  });

  it('does not produce duplicate posts when thread is mixed with other posts', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', in_reply_to_id: '1' }),
      makePost({ id: 'x', account: OTHER_ACCOUNT }), // unrelated
      makePost({ id: '3', in_reply_to_id: '2' }),
    ];
    const result = groupSelfThreads(posts);
    // post 1 groups with 2 and 3; post x is standalone
    const allIds = result.flatMap((p) => [
      p.id,
      ...(p.thread_continuation?.map((c) => c.id) || []),
    ]);
    // No duplicates
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(result).toHaveLength(2);
  });

  it('handles self-reply whose parent is outside the batch', () => {
    // Post 2 replies to post 1, but post 1 is NOT in the batch
    const posts = [
      makePost({ id: '2', in_reply_to_id: '1' }),
      makePost({ id: '3', in_reply_to_id: '2' }),
    ];
    const result = groupSelfThreads(posts);
    // Post 2 is root (parent not in batch), post 3 is continuation
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
    expect(result[0].thread_continuation).toHaveLength(1);
    expect(result[0].thread_continuation![0].id).toBe('3');
  });
});
