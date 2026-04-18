/**
 * Timeline media cache warming for service worker.
 *
 * Best-effort prefetch of thumbnail media from timeline API responses so
 * images are already cached by the time users scroll into the next batch.
 */

import { IMAGE_CACHE_MAX_ENTRIES } from './constants';
import { safeCachePut, pruneCacheToMaxEntries } from './strategies';

type ConnectionLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type TimelineMediaAttachment = {
  type?: string;
  preview_url?: string | null;
};

type TimelineStatus = {
  media_attachments?: TimelineMediaAttachment[];
  reblog?: TimelineStatus | null;
};

function getPrefetchLimit(): number {
  const connection = (
    self.navigator as Navigator & { connection?: ConnectionLike }
  ).connection;

  if (!connection) {
    return 15;
  }

  if (connection.saveData) {
    return 0;
  }

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 0;
    case '3g':
      return 5;
    case '4g':
      return 15;
    default:
      return 15;
  }
}

function collectPreviewUrls(status: TimelineStatus, sink: Set<string>): void {
  const attachments = status.media_attachments ?? [];
  for (const media of attachments) {
    if (media.type === 'audio') {
      continue;
    }

    const previewUrl = media.preview_url;
    if (!previewUrl) {
      continue;
    }

    sink.add(previewUrl);
  }

  if (status.reblog) {
    collectPreviewUrls(status.reblog, sink);
  }
}

export async function warmMediaCache(
  responseClone: Response,
  imagesCacheName: string
): Promise<void> {
  const limit = getPrefetchLimit();
  if (limit <= 0) {
    return;
  }

  if (!responseClone.ok) {
    return;
  }

  const contentType = responseClone.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return;
  }

  try {
    const body = (await responseClone.json()) as unknown;
    if (!Array.isArray(body)) {
      return;
    }

    const allUrls = new Set<string>();
    for (const item of body) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      collectPreviewUrls(item as TimelineStatus, allUrls);
      if (allUrls.size >= limit) {
        break;
      }
    }

    const urls = Array.from(allUrls).slice(0, limit);
    if (urls.length === 0) {
      return;
    }

    const imageCache = await caches.open(imagesCacheName);

    await Promise.allSettled(
      urls.map(async (url) => {
        const cached = await imageCache.match(url);
        if (cached) {
          return;
        }

        const response = await fetch(url);
        if (!response.ok) {
          return;
        }

        await safeCachePut(imageCache, url, response.clone());
      })
    );

    await pruneCacheToMaxEntries(imageCache, IMAGE_CACHE_MAX_ENTRIES);
  } catch {
    // Media warming is best-effort and should never affect timeline loading.
  }
}
