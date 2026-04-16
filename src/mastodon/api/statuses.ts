import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Account, ScheduledStatus } from '../types';
import type { Post } from '../../interfaces/Post';
import type { StatusEdit } from '../types/status';

export async function getFavouritedBy(id: string): Promise<Account[]> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/favourited_by`,
    { method: 'GET' }
  );
  return response.json();
}

export async function getRebloggedBy(id: string): Promise<Account[]> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/reblogged_by`,
    { method: 'GET' }
  );
  return response.json();
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
  const { url } = getClientConfig();
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
  const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'PUT',
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
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/source`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch status source: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function getEditHistory(id: string): Promise<StatusEdit[]> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/history`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch edit history: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function deletePost(id: string): Promise<Post> {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json();
  return data;
}

export async function getPostDetail(id: string): Promise<Post> {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'GET',
  });

  const data = await response.json();
  return data;
}

export async function publishPost(
  post: string,
  ids?: Array<string>,
  sensitive: boolean = false,
  spoilerText: string = '',
  visibility: string = 'public',
  scheduledAt?: string
): Promise<Post | ScheduledStatus> {
  const { url } = getClientConfig();
  const formData = new FormData();

  formData.append('status', post && post.length > 0 ? post : '');
  formData.append('visibility', visibility);

  if (ids && ids.length > 0) {
    for (const id of ids) {
      formData.append('media_ids[]', id);
    }
  }

  if (sensitive) {
    formData.append('sensitive', 'true');

    if (spoilerText && spoilerText.length > 0) {
      formData.append('spoiler_text', spoilerText);
    }
  }

  if (scheduledAt) {
    formData.append('scheduled_at', scheduledAt);
  }

  const response = await apiFetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function replyToPost(
  id: string,
  content: string,
  mediaIds?: string[],
  scheduledAt?: string
): Promise<Post | ScheduledStatus> {
  const { url } = getClientConfig();
  const formData = new FormData();

  formData.append('in_reply_to_id', id);
  formData.append('status', content && content.length > 0 ? content : '');

  if (mediaIds && mediaIds.length > 0) {
    for (const mediaId of mediaIds) {
      formData.append('media_ids[]', mediaId);
    }
  }

  if (scheduledAt) {
    formData.append('scheduled_at', scheduledAt);
  }

  const response = await apiFetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
}
