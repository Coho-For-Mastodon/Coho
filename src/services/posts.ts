import { fileOpen } from 'browser-fs-access';
import { addMedia } from './media';
import { Account } from '../types/interfaces/Account';
import { Post, PostPublishResult } from '../interfaces/Post';
import { MediaAttachment } from '../types/interfaces/MediaAttachment';

// Helper functions to always get fresh values from localStorage
const getServer = () => localStorage.getItem('server') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';

export async function whoBoostedAndFavorited(id: string): Promise<Account[]> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/reactions`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  const data = await response.json();
  return data;
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
  const server = getServer();
  const accessToken = getAccessToken();
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
  const response = await fetch(`https://${server}/api/v1/statuses/${id}`, {
    method: 'PUT',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to edit post: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function getStatusSource(
  id: string
): Promise<{ id: string; text: string; spoiler_text: string }> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/source`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch status source: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function deletePost(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(`https://${server}/api/v1/statuses/${id}`, {
    method: 'DELETE',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
}

export async function pinPost(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(`https://${server}/api/v1/statuses/${id}/pin`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
}

export async function unpinPost(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/unpin`,
    {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  const data = await response.json();
  return data;
}

export async function muteConversation(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(`https://${server}/api/v1/statuses/${id}/mute`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
}

export async function unmuteConversation(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/unmute`,
    {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  const data = await response.json();
  return data;
}

export async function getEditHistory(
  id: string
): Promise<import('../mastodon/types/status').StatusEdit[]> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/history`,
    {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch edit history: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function getPostDetail(id: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(`https://${server}/api/v1/statuses/${id}`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to load post: ${response.status}`);
  }

  const data = await response.json();
  return data;
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
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();

  if (language) {
    formData.append('lang', language);
  }

  const response = await fetch(
    `https://${server}/api/v1/statuses/${id}/translate`,
    {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to translate post: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function publishPost(
  post: string,
  ids?: Array<string>,
  sensitive: boolean = false,
  spoilerText: string = '',
  visibility: string = 'public',
  poll?: { options: string[]; expiresIn: number; multiple: boolean },
  scheduledAt?: string
): Promise<PostPublishResult> {
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();

  formData.append('status', post && post.length > 0 ? post : '');
  formData.append('visibility', visibility);

  // Mastodon constraint: media and poll are mutually exclusive.
  if (poll && ids && ids.length > 0) {
    throw new Error('Cannot publish a post with both media and a poll.');
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

  // make a fetch request to post a status using the mastodon api
  const response = await fetch(`https://${server}/api/v1/statuses`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
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
  const server = getServer();
  const accessToken = getAccessToken();
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

  // make a fetch request to post a status using the mastodon api
  const response = await fetch(`https://${server}/api/v1/statuses`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
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
  const server = getServer();
  const accessToken = getAccessToken();

  let delay = 1000;
  const maxDelay = 8000;
  const maxElapsed = 60_000;
  const start = Date.now();

  while (Date.now() - start < maxElapsed) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(`https://${server}/api/v1/media/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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
  const server = getServer();
  const accessToken = getAccessToken();
  const response = await fetch(`https://${server}/api/v2/media`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: JSON.stringify({
      url: url,
    }),
  });

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

/** @deprecated Use uploadMediaFromURL instead */
export const uploadImageFromURL = uploadMediaFromURL;

export async function uploadMediaBlob(blob: Blob): Promise<MediaAttachment> {
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.append('file', blob);

  const response = await fetch(`https://${server}/api/v2/media`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

/** @deprecated Use uploadMediaBlob instead */
export const uploadImageFromBlob = uploadMediaBlob;

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
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`https://${server}/api/v2/media`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
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

  const server = getServer();
  const accessToken = getAccessToken();

  // loop through the files and upload them

  for (let i = 0; i < files.length; i++) {
    const formData = new FormData();
    formData.append('file', files[i]);

    const response = await fetch(`https://${server}/api/v2/media`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
      body: formData,
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
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.append('description', description);

  const response = await fetch(`https://${server}/api/v1/media/${id}`, {
    method: 'PUT',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}
