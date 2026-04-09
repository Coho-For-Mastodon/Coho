import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';
import type { Account } from '../../src/mastodon/types';

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

import {
  renderSensitive,
  renderRegularTweet,
  renderReblog,
  renderThread,
  type TimelineItemHandlers,
  type TimelineItemState,
} from '../../src/components/timeline-renderers';

function createHandlers(): TimelineItemHandlers {
  return {
    viewSensitive: vi.fn(),
    viewThreadSensitive: vi.fn(),
    viewReplySensitive: vi.fn(),
    replies: vi.fn(),
    bookmark: vi.fn(),
    favorite: vi.fn(),
    reblog: vi.fn(),
    togglePin: vi.fn(),
    muteConversation: vi.fn(),
    addToList: vi.fn(),
    translatePost: vi.fn(),
    shareStatus: vi.fn(),
    deleteStatus: vi.fn(),
    initEditStatus: vi.fn(),
    openPost: vi.fn(),
    openParentPost: vi.fn(),
    openLinkCard: vi.fn(),
    handleContentClick: vi.fn(),
    showThread: vi.fn(),
    muteUser: vi.fn(),
    blockUser: vi.fn(),
    reportUser: vi.fn(),
  };
}

function createState(
  overrides: Partial<TimelineItemState> = {}
): TimelineItemState {
  const baseTweet = {
    ...(mockTimelinePosts[0] as Post),
    account: {
      ...(mockTimelinePosts[0].account as Account),
      id: 'acct-1',
      acct: 'acct-1',
      display_name: 'User One',
      emojis: [],
    },
  } as Post;

  return {
    tweet: baseTweet,
    show: true,
    currentUser: { id: 'current-user', acct: 'me' } as Account,
    settings: { wellness: false },
    isBookmarked: false,
    isBoosted: false,
    isReblogged: false,
    isMuted: false,
    canPin: false,
    loadingThread: false,
    threadExpanded: false,
    threadPosts: [],
    threadAncestors: [],
    threadDescendants: [],
    isOnDeviceTranslateAvailable: false,
    guestMode: false,
    ...overrides,
  };
}

describe('timeline-renderers', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
    vi.stubGlobal('requestIdleCallback', () => 1);
  });

  it('renders sensitive content view and wires view button', async () => {
    const handlers = createHandlers();
    const state = createState({
      tweet: { ...(mockTimelinePosts[0] as Post), sensitive: true },
    });

    const root = await fixture<HTMLDivElement>(
      html`<div>${renderSensitive(state, handlers)}</div>`
    );
    await elementUpdated(root);

    const button = root.querySelector('md-button');
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handlers.viewSensitive).toHaveBeenCalledTimes(1);
  });

  it('handles link card click and menu actions in regular tweets', async () => {
    const handlers = createHandlers();
    const tweet = {
      ...(mockTimelinePosts[0] as Post),
      account: {
        ...(mockTimelinePosts[0].account as Account),
        id: 'acct-2',
        acct: 'acct-2',
        emojis: [],
      },
      card: {
        url: 'https://coho.app',
        title: 'Coho',
        description: 'Coho site',
        type: 'link',
        author_name: 'Coho',
        author_url: 'https://coho.app',
        provider_name: 'Coho',
        provider_url: 'https://coho.app',
        html: '',
        width: 0,
        height: 0,
        image: '/assets/bookmark-outline.svg',
      },
    } as Post;

    const state = createState({ tweet });

    const root = await fixture<HTMLDivElement>(
      html`<div>${renderRegularTweet(state, handlers)}</div>`
    );
    await elementUpdated(root);

    const linkCard = root.querySelector('.link-card');
    linkCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handlers.openLinkCard).toHaveBeenCalledWith('https://coho.app');

    const menuItems = Array.from(root.querySelectorAll('md-menu-item'));
    const muteUserItem = menuItems.find((item) =>
      item.textContent?.includes('Mute @')
    );
    muteUserItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handlers.muteUser).toHaveBeenCalledTimes(1);
  });

  it('navigates to booster profile when clicking reblog header', async () => {
    const handlers = createHandlers();
    const booster = {
      ...(mockTimelinePosts[0].account as Account),
      id: 'booster',
      acct: 'booster',
      display_name: 'Booster',
      emojis: [],
    } as Account;
    const reblog = {
      ...(mockTimelinePosts[0] as Post),
      id: 'reblog',
      account: booster,
    } as Post;
    const tweet = {
      ...(mockTimelinePosts[0] as Post),
      account: booster,
      reblog,
    } as Post;

    const state = createState({ tweet });

    const root = await fixture<HTMLDivElement>(
      html`<div>${renderReblog(state, handlers)}</div>`
    );
    await elementUpdated(root);

    const indicator = root.querySelector('.boost-indicator');
    indicator?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(hoisted.navigate).toHaveBeenCalledWith('/account?id=booster', {
      state: { account: booster },
    });
  });

  it('shows thread continuation and handles view sensitive', async () => {
    const handlers = createHandlers();
    const threadPost = {
      ...(mockTimelinePosts[0] as Post),
      id: 'thread-1',
      sensitive: true,
      spoiler_text: 'Sensitive',
    } as Post;

    const state = createState({
      threadExpanded: true,
      threadPosts: [threadPost],
      threadDescendants: [threadPost],
    });

    const root = await fixture<HTMLDivElement>(
      html`<div>${renderThread(state, handlers)}</div>`
    );
    await elementUpdated(root);

    const button = root.querySelector('.sensitive md-button');
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handlers.viewThreadSensitive).toHaveBeenCalledWith('thread-1');
  });
});
