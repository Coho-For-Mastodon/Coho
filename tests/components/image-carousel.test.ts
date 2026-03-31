import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import type { MediaAttachment } from '../../src/types/interfaces/MediaAttachment';

const hoisted = vi.hoisted(() => {
  return {
    generateBlurhash: vi.fn(
      (
        id: string,
        _hash: string,
        _width: number,
        _height: number,
        callback: (id: string, dataUrl: string) => void
      ) => {
        callback(id, `data:image/png;base64,${id}`);
      }
    ),
  };
});

vi.mock('../../src/services/blurhash-worker', () => ({
  getBlurhashWorker: () => ({
    generateBlurhash: hoisted.generateBlurhash,
    cancel: vi.fn(),
  }),
}));

import '../../src/components/image-carousel';
import type { ImageCarousel } from '../../src/components/image-carousel';

describe('image-carousel', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
  });

  const images: MediaAttachment[] = [
    {
      id: 'img-1',
      type: 'image',
      url: 'https://example.com/img-1.png',
      preview_url: 'https://example.com/img-1-preview.png',
      remote_url: null,
      text_url: null,
      description: 'Mock image',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      meta: {
        original: { width: 800, height: 600, size: '800x600', aspect: 1.333 },
      },
    },
  ];

  it('requests blurhash generation when images change', async () => {
    const el = await fixture<ImageCarousel>(
      html`<image-carousel></image-carousel>`
    );

    el.images = images;
    await elementUpdated(el);

    expect(hoisted.generateBlurhash).toHaveBeenCalledTimes(1);
    expect(hoisted.generateBlurhash).toHaveBeenCalledWith(
      'img-1',
      images[0].blurhash,
      20,
      20,
      expect.any(Function)
    );
  });

  it('renders blurhash image when available', async () => {
    const el = await fixture<ImageCarousel>(
      html`<image-carousel></image-carousel>`
    );

    el.images = images;
    await elementUpdated(el);
    await elementUpdated(el);

    const blurhashImg = el.shadowRoot?.querySelector('.blurhash-canvas');
    expect(blurhashImg).toBeDefined();
  });

  it('dispatches preview-image event on click', async () => {
    const el = await fixture<ImageCarousel>(
      html`<image-carousel></image-carousel>`
    );

    el.images = images;
    await elementUpdated(el);

    const handler = vi.fn();
    window.addEventListener('preview-image', handler);

    const container = el.shadowRoot?.querySelector('.image-container');
    container?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail?.src).toBe(images[0].url);
  });
});
