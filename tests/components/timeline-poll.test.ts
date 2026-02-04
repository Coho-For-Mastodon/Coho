import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/timeline-poll';
import type { TimelinePoll } from '../../src/components/timeline-poll';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

const basePost = mockTimelinePosts[0] as unknown as Post;

function createPostWithPoll(): Post {
  return {
    ...basePost,
    poll: {
      id: 'poll-1',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      expired: false,
      multiple: false,
      votes_count: 10,
      voted: false,
      own_votes: [],
      options: [
        { title: 'Option A', votes_count: 6 },
        { title: 'Option B', votes_count: 4 },
      ],
    },
  };
}

describe('timeline-poll', () => {
  beforeEach(() => {
    cleanupFixtures();
    localStorage.removeItem('currentUserID');
  });

  it('disables vote button until an option is selected', async () => {
    const post = createPostWithPoll();
    const el = await fixture<TimelinePoll>(
      html`<timeline-poll .post=${post}></timeline-poll>`
    );
    await elementUpdated(el);

    let button = el.shadowRoot?.querySelector('md-button') as HTMLElement;
    expect(button?.hasAttribute('disabled')).toBe(true);

    (el as any)._onCheckboxChange(
      {
        stopPropagation: () => {},
        currentTarget: { checked: true },
      } as Event,
      0
    );

    await elementUpdated(el);

    expect((el as any).selected).toEqual([0]);
    button = el.shadowRoot?.querySelector('md-button') as HTMLElement;
    expect(button?.hasAttribute('disabled')).toBe(false);
  });

  it('resets local state when post changes', async () => {
    const post = createPostWithPoll();
    const el = await fixture<TimelinePoll>(
      html`<timeline-poll .post=${post}></timeline-poll>`
    );
    await elementUpdated(el);

    (el as any).selected = [0];
    (el as any).error = 'oops';
    (el as any).submitting = true;

    el.post = createPostWithPoll();
    await elementUpdated(el);

    expect((el as any).selected).toEqual([]);
    expect((el as any).error).toBeNull();
    expect((el as any).submitting).toBe(false);
  });
});
