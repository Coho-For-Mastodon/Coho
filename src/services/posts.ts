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

export async function editPost(id: string, newContent: string): Promise<Post> {
  const server = getServer();
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.append('status', newContent);
  const response = await fetch(`https://${server}/api/v1/statuses/${id}`, {
    method: 'PUT',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

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

export async function uploadImageFromURL(
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

  const data = await response.json();
  return data;
}

export async function uploadImageFromBlob(
  blob: Blob
): Promise<MediaAttachment> {
  // const formData = new FormData();
  // formData.append('file', blob);

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

  const data = await response.json();
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

  const data = await response.json();
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

    const data = await response.json();

    uploaded = [...uploaded, data];

    await addMedia(files[i]);

    console.log('uploaded', uploaded);
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
