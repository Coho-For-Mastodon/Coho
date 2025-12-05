import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import { Account, Post } from '../types';

export async function whoBoostedAndFavorited(id: string): Promise<Account[]> {
  const { url } = getClientConfig();
  const response = await apiFetch(
    `https://${url}/api/v1/statuses/${id}/reactions`,
    { method: 'GET' }
  );

  const data = await response.json();
  return data;
}

export async function editPost(id: string, newContent: string): Promise<Post> {
  const { url } = getClientConfig();
  const formData = new FormData();
  formData.append('status', newContent);
  const response = await apiFetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'PUT',
    body: formData,
  });

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
  visibility: string = 'public'
): Promise<Post> {
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

  const response = await apiFetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function replyToPost(id: string, content: string): Promise<Post> {
  const { url } = getClientConfig();
  const formData = new FormData();

  formData.append('in_reply_to_id', id);
  formData.append('status', content && content.length > 0 ? content : '');

  const response = await apiFetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data;
}
