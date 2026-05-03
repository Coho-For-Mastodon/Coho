import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

const hoisted = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    set: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn(),
  };
});

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

vi.mock('idb-keyval', () => ({
  set: hoisted.set,
  get: hoisted.get,
  del: hoisted.del,
}));

import '../../src/components/timeline';
import type { Timeline } from '../../src/components/timeline';

const post = mockTimelinePosts[0] as unknown as Post;

describe('app-timeline actions', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
  });

  it('maps timelineType to title', async () => {
    const el = await fixture<Timeline>(
      html`<app-timeline .autoLoad=${false}></app-timeline>`
    );

    el.timelineType = 'federated';
    expect(el.timelineTitle).toBe('Federated');
  });

  it('updates timeline when data changes', async () => {
    const el = await fixture<Timeline>(
      html`<app-timeline .autoLoad=${false}></app-timeline>`
    );

    el.data = [post];
    await elementUpdated(el);

    expect(el.timeline).toEqual([post]);
  });

  it('dispatches summary, translating, and open events', async () => {
    const el = await fixture<Timeline>(
      html`<app-timeline .autoLoad=${false}></app-timeline>`
    );

    const summaryHandler = vi.fn();
    const translatingHandler = vi.fn();
    const openHandler = vi.fn();

    el.addEventListener('handle-summary', summaryHandler);
    el.addEventListener('handle-translating', translatingHandler);
    el.addEventListener('open', openHandler);

    el.handleSummary(
      new CustomEvent('summarize', { detail: { data: 'summary' } })
    );
    el.handleTranslating(
      new CustomEvent('translating', { detail: { tweet: post } })
    );
    el.handleOpen(post);

    expect(summaryHandler).toHaveBeenCalledTimes(1);
    expect(translatingHandler).toHaveBeenCalledTimes(1);
    expect(openHandler).toHaveBeenCalledTimes(1);
  });

  it('navigates to image preview route', async () => {
    const el = await fixture<Timeline>(
      html`<app-timeline .autoLoad=${false}></app-timeline>`
    );

    await el.showImage('https://example.com/image.png');

    expect(hoisted.navigate).toHaveBeenCalledWith(
      '/home/img-preview?src=https://example.com/image.png'
    );
  });

  it('changes timeline type and persists selection', async () => {
    const el = await fixture<Timeline>(
      html`<app-timeline .autoLoad=${false}></app-timeline>`
    );

    const refreshSpy = vi
      .spyOn(el, 'refreshTimeline')
      .mockResolvedValue(undefined);

    await el.changeTimelineType('media');

    expect(el.timelineType).toBe('media');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(hoisted.set).toHaveBeenCalledWith('timelineType', 'media');
  });
});
