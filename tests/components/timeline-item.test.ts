import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

vi.mock('../../src/services/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
  SETTINGS_CHANGED_EVENT: 'settings-changed',
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

  it('renders favourite and boost counts from the tweet data', async () => {
    const tweet = { ...(mockTimelinePosts[0] as Post) } as Post;
    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    const favouriteButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Favourite"]'
    );
    const boostButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Boost"]'
    );

    expect(favouriteButton?.textContent).toContain('5');
    expect(boostButton?.textContent).toContain('2');
  });

  it('uses the legacy optimistic favourite state without toggling boost', async () => {
    const tweet = { ...(mockTimelinePosts[0] as Post) } as Post;
    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    el.isBoosted = true;
    await elementUpdated(el);

    const unfavouriteButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Unfavourite"]'
    );
    const boostButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Boost"]'
    );

    expect(unfavouriteButton).not.toBeNull();
    expect(boostButton?.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders reblog action counts from the boosted status', async () => {
    const reblog = {
      ...(mockTimelinePosts[0] as Post),
      id: 'reblog-target',
      favourites_count: 7,
      reblogs_count: 4,
    } as Post;
    const tweet = {
      ...(mockTimelinePosts[0] as Post),
      favourites_count: 0,
      reblogs_count: 0,
      reblog,
    } as Post;

    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    const favouriteButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Favourite"]'
    );
    const boostButton = el.shadowRoot?.querySelector(
      'md-button[aria-label="Boost"]'
    );

    expect(favouriteButton?.textContent).toContain('7');
    expect(boostButton?.textContent).toContain('4');
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

  it('renders link cards for thread posts', async () => {
    const tweet = { ...(mockTimelinePosts[0] as Post) } as Post;
    const el = await fixture<TimelineItem>(
      html`<timeline-item .tweet=${tweet}></timeline-item>`
    );
    await elementUpdated(el);

    const threadPost = {
      ...(mockTimelinePosts[0] as Post),
      id: 'thread-1',
      card: {
        url: 'https://example.com/thread-card',
        title: 'Thread card title',
        description: 'Thread card description',
        type: 'link',
        author_name: '',
        author_url: '',
        provider_name: '',
        provider_url: '',
        html: '',
        width: 0,
        height: 0,
        image: '/assets/icons/icon-128.png',
      },
    } as Post;

    el.threadExpanded = true;
    el.threadPosts = [threadPost];
    await elementUpdated(el);

    const linkCard = el.shadowRoot?.querySelector(
      '.thread-continuation .link-card'
    );
    expect(linkCard).not.toBeNull();
    expect(linkCard?.querySelector('h4')?.textContent).toBe(
      'Thread card title'
    );
  });
});
