/**
 * Share Target Handler
 *
 * Handles the Web Share Target API. When the user shares content
 * (images) to Coho from another app, the shared files are cached
 * and the app redirects to /home with the file info.
 */

/**
 * Handle a share target POST request. Caches shared media files
 * and redirects to the compose view.
 */
export async function shareTargetHandler(event: FetchEvent): Promise<Response> {
  console.log('[SW] shareTargetHandler invoked');

  try {
    const formData = await event.request.formData();
    const mediaFiles = formData.getAll('image') as File[];
    const cache = await caches.open('shareTarget');

    console.log('[SW] Share target received', mediaFiles.length, 'files');

    if (mediaFiles.length === 0) {
      console.warn('[SW] Share target: No files received in form data');
      return Response.redirect('/home', 303);
    }

    for (const mediaFile of mediaFiles) {
      const cacheKey = `/_share/${encodeURIComponent(mediaFile.name)}`;
      console.log(
        '[SW] Caching file with key:',
        cacheKey,
        'size:',
        mediaFile.size,
        'type:',
        mediaFile.type
      );
      await cache.put(
        cacheKey,
        new Response(mediaFile, {
          headers: {
            'content-length': mediaFile.size.toString(),
            'content-type': mediaFile.type,
          },
        })
      );
    }

    const redirectUrl = `/home?name=${encodeURIComponent(mediaFiles[0].name)}`;
    console.log('[SW] Redirecting to:', redirectUrl);
    return Response.redirect(redirectUrl, 303);
  } catch (error) {
    console.error('[SW] shareTargetHandler error:', error);
    return Response.redirect('/home', 303);
  }
}
