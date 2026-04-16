import { fileOpen } from 'browser-fs-access';
import { addMedia } from './media';
import type { Account } from '../mastodon/types/account';
import { Post, PostPublishResult } from '../interfaces/Post';
import type { MediaAttachment } from '../mastodon/types/media';
import {
  apiFetch,
  buildMastodonUrl,
  fetchMastodonJson,
} from '../utils/api-client';

export async function getFavouritedBy(id: string): Promise<Account[]> {
  return fetchMastodonJson<Account[]>(`/api/v1/statuses/${id}/favourited_by`);
}

export async function getRebloggedBy(id: string): Promise<Account[]> {
  return fetchMastodonJson<Account[]>(`/api/v1/statuses/${id}/reblogged_by`);
}

export async function getQuotesOf(id: string): Promise<Post[]> {
  try {
    const data = await fetchMastodonJson<Post[]>(
      `/api/v1/statuses/${id}/quotes`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function revokeQuote(
  statusId: string,
  quotingStatusId: string
): Promise<Post> {
  return fetchMastodonJson<Post>(
    `/api/v1/statuses/${statusId}/quotes/${quotingStatusId}/revoke`,
    { method: 'POST' }
  );
}

export interface EditPostParams {
  status: string;
  media_ids?: string[];
  sensitive?: boolean;
  spoiler_text?: string;
  visibility?: string;
}

export async function editPost(
  id: string,
  params: EditPostParams
): Promise<Post> {
  const formData = new FormData();
  formData.append('status', params.status);
  if (params.media_ids !== undefined) {
    for (const mediaId of params.media_ids) {
      formData.append('media_ids[]', mediaId);
    }
  }
  if (params.sensitive !== undefined) {
    formData.append('sensitive', params.sensitive ? 'true' : 'false');
  }
  if (params.spoiler_text !== undefined) {
    formData.append('spoiler_text', params.spoiler_text);
  }
  if (params.visibility) {
    formData.append('visibility', params.visibility);
  }
  const url = buildMastodonUrl(`/api/v1/statuses/${id}`);
  const response = await apiFetch(url, { method: 'PUT', body: formData });
  return response.json();
}

export async function getStatusSource(
  id: string
): Promise<{ id: string; text: string; spoiler_text: string }> {
  return fetchMastodonJson(`/api/v1/statuses/${id}/source`);
}

export async function deletePost(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}`, {
    method: 'DELETE',
  });
}

export async function pinPost(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}/pin`, {
    method: 'POST',
  });
}

export async function unpinPost(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}/unpin`, {
    method: 'POST',
  });
}

export async function muteConversation(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}/mute`, {
    method: 'POST',
  });
}

export async function unmuteConversation(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}/unmute`, {
    method: 'POST',
  });
}

export async function getEditHistory(
  id: string
): Promise<import('../mastodon/types/status').StatusEdit[]> {
  return fetchMastodonJson(`/api/v1/statuses/${id}/history`);
}

export async function getPostDetail(id: string): Promise<Post> {
  return fetchMastodonJson<Post>(`/api/v1/statuses/${id}`);
}

interface PostTranslation {
  content: string;
  detected_source_language?: string;
  provider?: string;
}

export async function translateStatus(
  id: string,
  language?: string
): Promise<PostTranslation> {
  const formData = new FormData();
  if (language) {
    formData.append('lang', language);
  }
  const url = buildMastodonUrl(`/api/v1/statuses/${id}/translate`);
  const response = await apiFetch(url, { method: 'POST', body: formData });
  return response.json();
}

export async function publishPost(
  post: string,
  ids?: Array<string>,
  sensitive: boolean = false,
  spoilerText: string = '',
  visibility: string = 'public',
  poll?: { options: string[]; expiresIn: number; multiple: boolean },
  scheduledAt?: string,
  quotedStatusId?: string
): Promise<PostPublishResult> {
  const formData = new FormData();

  formData.append('status', post && post.length > 0 ? post : '');
  formData.append('visibility', visibility);

  // Mastodon constraint: media and poll are mutually exclusive.
  if (poll && ids && ids.length > 0) {
    throw new Error('Cannot publish a post with both media and a poll.');
  }

  // Mastodon constraint: quotes cannot have media or polls.
  if (quotedStatusId && ((ids && ids.length > 0) || poll)) {
    throw new Error('Cannot publish a quote post with media or a poll.');
  }

  if (quotedStatusId) {
    formData.append('quoted_status_id', quotedStatusId);
  }

  if (!poll && ids && ids.length > 0) {
    for (const id of ids) {
      formData.append('media_ids[]', id);
    }
  }

  if (poll) {
    for (const opt of poll.options) {
      formData.append('poll[options][]', opt);
    }
    formData.append('poll[expires_in]', String(poll.expiresIn));
    formData.append('poll[multiple]', poll.multiple ? 'true' : 'false');
  }

  if (scheduledAt) {
    formData.append('scheduled_at', scheduledAt);
  }

  if (sensitive) {
    formData.append('sensitive', 'true');

    if (spoilerText && spoilerText.length > 0) {
      formData.append('spoiler_text', spoilerText);
    }
  }

  const url = buildMastodonUrl('/api/v1/statuses');
  const response = await apiFetch(url, { method: 'POST', body: formData });
  return response.json();
}

/**
 * Convenience helper for publishing a poll post.
 * Keeps callsites clean and avoids accidental media_ids usage.
 */
export async function publishPollPost(
  post: string,
  poll: { options: string[]; expiresIn: number; multiple: boolean },
  sensitive: boolean = false,
  spoilerText: string = '',
  visibility: string = 'public',
  scheduledAt?: string
): Promise<PostPublishResult> {
  return publishPost(
    post,
    undefined,
    sensitive,
    spoilerText,
    visibility,
    poll,
    scheduledAt
  );
}

export async function replyToPost(
  id: string,
  content: string,
  mediaIds?: string[],
  visibility?: string,
  scheduledAt?: string
): Promise<PostPublishResult> {
  const formData = new FormData();

  formData.append('in_reply_to_id', id);

  formData.append('status', content && content.length > 0 ? content : '');

  if (visibility) {
    formData.append('visibility', visibility);
  }

  if (scheduledAt) {
    formData.append('scheduled_at', scheduledAt);
  }

  // Attach media IDs if provided
  if (mediaIds && mediaIds.length > 0) {
    for (const mediaId of mediaIds) {
      formData.append('media_ids[]', mediaId);
    }
  }

  const url = buildMastodonUrl('/api/v1/statuses');
  const response = await apiFetch(url, { method: 'POST', body: formData });
  return response.json();
}

/**
 * Polls GET /api/v1/media/:id until the server finishes processing
 * (video transcoding, etc.). Mastodon returns 206 while processing
 * and 200 when done. Uses exponential back-off (1 s → 2 s → 4 s …)
 * and gives up after ~60 s total.
 */
export async function waitForMediaProcessing(
  id: string
): Promise<MediaAttachment> {
  const url = buildMastodonUrl(`/api/v1/media/${id}`);

  let delay = 1000;
  const maxDelay = 8000;
  const maxElapsed = 60_000;
  const start = Date.now();

  while (Date.now() - start < maxElapsed) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await apiFetch(url, { skipResponseCheck: true });

    if (res.status === 200) {
      return res.json();
    }

    if (res.status !== 206) {
      // Unexpected status — bail out and let the caller handle it
      throw new Error(
        `Unexpected status ${res.status} while polling media ${id}`
      );
    }

    delay = Math.min(delay * 2, maxDelay);
  }

  throw new Error(`Media ${id} processing timed out after ${maxElapsed}ms`);
}

export async function uploadMediaFromURL(
  url: string
): Promise<MediaAttachment> {
  const apiUrl = buildMastodonUrl('/api/v2/media');
  const response = await apiFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    skipResponseCheck: true,
  });

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

export async function uploadMediaBlob(blob: Blob): Promise<MediaAttachment> {
  const formData = new FormData();
  formData.append('file', blob);

  const apiUrl = buildMastodonUrl('/api/v2/media');
  const response = await apiFetch(apiUrl, {
    method: 'POST',
    body: formData,
    skipResponseCheck: true,
  });

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

export async function pickMedia(): Promise<File[]> {
  try {
    const files = await fileOpen({
      mimeTypes: ['image/*', 'video/*'],
      multiple: true,
    });
    return Array.isArray(files) ? files : [files];
  } catch {
    return [];
  }
}

export async function uploadMediaFile(file: File): Promise<MediaAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const apiUrl = buildMastodonUrl('/api/v2/media');
  const response = await apiFetch(apiUrl, {
    method: 'POST',
    body: formData,
    skipResponseCheck: true,
  });

  let data: MediaAttachment = await response.json();

  if (response.status === 202) {
    data = await waitForMediaProcessing(data.id);
  }

  await addMedia(file);
  return data;
}

export async function uploadImageAsFormData(): Promise<MediaAttachment[]> {
  const files = await fileOpen({
    mimeTypes: ['image/*', 'video/*'],
    multiple: true,
  });

  let uploaded: MediaAttachment[] = [];

  const apiUrl = buildMastodonUrl('/api/v2/media');

  for (let i = 0; i < files.length; i++) {
    const formData = new FormData();
    formData.append('file', files[i]);

    const response = await apiFetch(apiUrl, {
      method: 'POST',
      body: formData,
      skipResponseCheck: true,
    });

    let data: MediaAttachment = await response.json();

    if (response.status === 202) {
      data = await waitForMediaProcessing(data.id);
    }

    uploaded = [...uploaded, data];

    await addMedia(files[i]);
  }

  return uploaded;
}

export async function updateMedia(
  id: string,
  description: string
): Promise<MediaAttachment> {
  const formData = new FormData();
  formData.append('description', description);

  const url = buildMastodonUrl(`/api/v1/media/${id}`);
  const response = await apiFetch(url, { method: 'PUT', body: formData });
  return response.json();
}
