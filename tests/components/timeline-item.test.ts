import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

vi.mock('../../src/services/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/services/ai', () => ({
  isOnDeviceTranslationAvailable: vi.fn(() => false),
}));

import '../../src/components/timeline-item';
import type { TimelineItem } from '../../src/components/timeline-item';

describe('timeline-item', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('dispatches open event when openPost is called', async () => {
    const tweet = mockTimelinePosts[0] as unknown as Post;
    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    const handler = vi.fn();
    el.addEventListener('open', handler);

    await el.openPost();

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail?.tweet).toBe(tweet);
  });

  it('clears sensitive flags on viewSensitive', async () => {
    const reblog = { ...mockTimelinePosts[0], sensitive: true } as Post;
    const tweet = {
      ...(mockTimelinePosts[0] as Post),
      sensitive: true,
      reblog,
    } as Post;

    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    el.viewSensitive();

    expect(tweet.sensitive).toBe(false);
    expect(reblog.sensitive).toBe(false);
  });

  it('updates threadPosts when revealing a thread post', async () => {
    const el = await fixture<TimelineItem>(
      html`<timeline-item></timeline-item>`
    );
    await elementUpdated(el);

    const threadPost = {
      ...(mockTimelinePosts[0] as Post),
      id: 'thread-1',
      sensitive: true,
    } as Post;

    const original = [threadPost];
    el.threadPosts = original;

    el.viewThreadSensitive('thread-1');

    expect(el.threadPosts).not.toBe(original);
    expect(el.threadPosts[0].sensitive).toBe(false);
  });
});
