import { getClientConfig } from '../config/client';
import { Account, Post } from '../types';

export async function whoBoostedAndFavorited(id: string): Promise<Account[]> {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(
    `https://${url}/api/v1/statuses/${id}/reactions`,
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
  const { url, accessToken } = getClientConfig();
  const formData = new FormData();
  formData.append('status', newContent);
  const response = await fetch(`https://${url}/api/v1/statuses/${id}`, {
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
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'DELETE',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const data = await response.json();
  return data;
}

export async function getPostDetail(id: string): Promise<Post> {
  const { url, accessToken } = getClientConfig();
  const response = await fetch(`https://${url}/api/v1/statuses/${id}`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
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
  const { url, accessToken } = getClientConfig();
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

  const response = await fetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function replyToPost(id: string, content: string): Promise<Post> {
  const { url, accessToken } = getClientConfig();
  const formData = new FormData();

  formData.append('in_reply_to_id', id);
  formData.append('status', content && content.length > 0 ? content : '');

  const response = await fetch(`https://${url}/api/v1/statuses`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}
