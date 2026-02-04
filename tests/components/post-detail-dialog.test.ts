import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import { mockTimelinePosts } from '../mocks/mock-data';
import type { Post } from '../../src/interfaces/Post';

vi.mock('../../src/pages/post-detail', () => {
  class PostDetailStub extends HTMLElement {}
  if (!customElements.get('post-detail')) {
    customElements.define('post-detail', PostDetailStub);
  }
  return {};
});

import '../../src/components/post-detail-dialog';
import type { PostDetailDialog } from '../../src/components/post-detail-dialog';

const post = mockTimelinePosts[0] as unknown as Post;

function ensureDialogMethods() {
  if (!('HTMLDialogElement' in globalThis)) return;
  const proto = HTMLDialogElement.prototype as HTMLDialogElement;

  if (!proto.showModal) {
    Object.defineProperty(proto, 'showModal', {
      value: function showModal(this: HTMLDialogElement) {
        this.open = true;
      },
      configurable: true,
    });
  }

  if (!proto.close) {
    Object.defineProperty(proto, 'close', {
      value: function close(this: HTMLDialogElement) {
        this.open = false;
      },
      configurable: true,
    });
  }
}

describe('post-detail-dialog', () => {
  beforeEach(() => {
    cleanupFixtures();
    ensureDialogMethods();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes history state and emits open event', async () => {
    const el = await fixture<PostDetailDialog>(
      html`<post-detail-dialog></post-detail-dialog>`
    );
    await elementUpdated(el);

    const openHandler = vi.fn();
    el.addEventListener('post-detail-dialog-open', openHandler);

    const pushSpy = vi.spyOn(history, 'pushState');

    el.open(post);
    await elementUpdated(el);

    expect(pushSpy).toHaveBeenCalled();
    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(el.post).toBe(post);
  });

  it('closes dialog and emits close event', async () => {
    const el = await fixture<PostDetailDialog>(
      html`<post-detail-dialog></post-detail-dialog>`
    );
    await elementUpdated(el);

    el.open(post);
    await elementUpdated(el);

    const closeHandler = vi.fn();
    el.addEventListener('post-detail-dialog-close', closeHandler);

    const dialog = el.shadowRoot?.querySelector('dialog');
    const closePromise = el.close(true);

    dialog?.dispatchEvent(new Event('animationend'));
    await closePromise;

    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(el.post).toBeNull();
  });
});
