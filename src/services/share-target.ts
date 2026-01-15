import { msg } from '@lit/localize';

export async function shareTarget(
  name: string
): Promise<{ success: boolean; decodedName: string; errorMessage?: string }> {
  // Decode the URL-encoded filename from the query param
  const decodedName = decodeURIComponent(name);

  try {
    const cache = await caches.open('shareTarget');

    // Build the expected cache key (must match SW's format)
    const expectedKey = `/_share/${encodeURIComponent(decodedName)}`;

    console.log('[Share Target] Looking for cache key:', expectedKey);
    console.log(
      '[Share Target] Available cache keys:',
      (await cache.keys()).map((r) => r.url)
    );

    const response = await cache.match(expectedKey);

    if (response) {
      console.log('[Share Target] Found cached file');
      return { success: true, decodedName };
    } else {
      console.log('[Share Target] No cached file found');
      return {
        success: false,
        decodedName,
        errorMessage: msg(
          'Failed to load shared image. Please try sharing again.'
        ),
      };
    }
  } catch (e) {
    console.error('[Share Target] Error accessing cache', e);
    return {
      success: false,
      decodedName,
      errorMessage: msg('Error accessing shared file.'),
    };
  }
}
