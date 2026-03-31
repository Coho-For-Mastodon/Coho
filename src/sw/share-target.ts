/**
 * Share Target Handler
 *
 * Handles the Web Share Target API. When the user shares content
 * (images) to Coho from another app, the shared files are cached
 * and the app redirects to /home with the file info.
 */

import { CACHE_NAMES } from './constants';

/**
 * Handle a share target POST request. Caches shared media files
 * and redirects to the compose view.
 */
export async function shareTargetHandler(event: FetchEvent): Promise<Response> {
  console.log('[SW] shareTargetHandler invoked');

  try {
    const formData = await event.request.formData();
    const mediaFiles = formData.getAll('image') as File[];
    const cache = await caches.open(CACHE_NAMES.share);

    console.log('[SW] Share target received', mediaFiles.length, 'files');

    if (mediaFiles.length === 0) {
      console.warn('[SW] Share target: No files received in form data');
      return Response.redirect('/home', 303);
    }

    const fileNames: string[] = [];

    for (const file of mediaFiles) {
      const cacheKey = `/_share/${encodeURIComponent(file.name)}`;
      console.log(
        '[SW] Caching file with key:',
        cacheKey,
        'size:',
        file.size,
        'type:',
        file.type
      );
      await cache.put(
        cacheKey,
        new Response(file, {
          headers: {
            'content-length': file.size.toString(),
            'content-type': file.type,
          },
        })
      );
      fileNames.push(file.name);
    }

    const params = new URLSearchParams();
    for (const name of fileNames) {
      params.append('name', name);
    }
    const redirectUrl = `/home?${params.toString()}`;
    console.log('[SW] Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 303);
  } catch (error) {
    console.error('[SW] shareTargetHandler error:', error);
    return Response.redirect('/home', 303);
  }
}
