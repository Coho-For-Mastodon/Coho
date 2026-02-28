import { getClientConfig } from '../config/client';
import { MediaAttachment } from '../types';

/**
 * Polls GET /api/v1/media/:id until the server finishes processing.
 * Uses exponential back-off and gives up after ~60 s.
 */

// not sure if polling is right here just yet
export async function waitForMediaProcessing(
  id: string
): Promise<MediaAttachment> {
  const { url: serverUrl, accessToken } = getClientConfig();

  let delay = 1000;
  const maxDelay = 8000;
  const maxElapsed = 60_000;
  const start = Date.now();

  while (Date.now() - start < maxElapsed) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(`https://${serverUrl}/api/v1/media/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 200) {
      return res.json();
    }

    if (res.status !== 206) {
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

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

/** @deprecated Use uploadMediaFromURL instead */
export const uploadImageFromURL = uploadMediaFromURL;

export async function uploadMediaBlob(blob: Blob): Promise<MediaAttachment> {
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

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

  return data;
}

/** @deprecated Use uploadMediaBlob instead */
export const uploadImageFromBlob = uploadMediaBlob;

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

  const data: MediaAttachment = await response.json();

  if (response.status === 202) {
    return waitForMediaProcessing(data.id);
  }

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
