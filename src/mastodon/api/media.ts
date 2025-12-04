import { getClientConfig } from '../config/client';
import { MediaAttachment } from '../types';

export async function uploadImageFromURL(
  url: string
): Promise<MediaAttachment> {
  const { url: serverUrl, accessToken } = getClientConfig();
  const response = await fetch(`https://${serverUrl}/api/v2/media`, {
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
  const { url: serverUrl, accessToken } = getClientConfig();
  const formData = new FormData();
  formData.append('file', blob);

  const response = await fetch(`https://${serverUrl}/api/v2/media`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function uploadMediaFile(file: File): Promise<MediaAttachment> {
  const { url: serverUrl, accessToken } = getClientConfig();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`https://${serverUrl}/api/v2/media`, {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function updateMedia(
  id: string,
  description: string
): Promise<MediaAttachment> {
  const { url: serverUrl, accessToken } = getClientConfig();
  const formData = new FormData();
  formData.append('description', description);

  const response = await fetch(`https://${serverUrl}/api/v1/media/${id}`, {
    method: 'PUT',
    headers: new Headers({
      Authorization: `Bearer ${accessToken}`,
    }),
    body: formData,
  });

  const data = await response.json();
  return data;
}
