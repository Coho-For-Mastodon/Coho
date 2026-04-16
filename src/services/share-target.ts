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

    const response = await cache.match(expectedKey);

    if (response) {
      return { success: true, decodedName };
    } else {
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
