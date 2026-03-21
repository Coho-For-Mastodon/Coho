import { Capacitor, registerPlugin } from '@capacitor/core';

interface SharedFile {
  name: string;
  type: string;
  path: string;
  size: number;
}

interface SharedContent {
  hasShare: boolean;
  text?: string;
  subject?: string;
  files?: SharedFile[];
}

interface ShareTargetBridgePlugin {
  getSharedContent(): Promise<SharedContent>;
  clearSharedContent(): Promise<void>;
  addListener(
    event: 'shareIntent',
    callback: () => void
  ): Promise<{ remove: () => void }>;
}

const ShareTargetBridge =
  registerPlugin<ShareTargetBridgePlugin>('ShareTargetBridge');

export interface NativeShareResult {
  hasShare: boolean;
  text?: string;
  subject?: string;
  /** Name of the file written to the shareTarget cache (for media shares). */
  cachedFileName?: string;
}

/**
 * Check for shared content from an Android ACTION_SEND intent.
 * If media files were shared, they are written into the Cache API using
 * the same key format as the PWA share target (`/_share/{name}`),
 * so the existing post-dialog shareTarget flow can pick them up.
 */
export async function checkNativeShare(): Promise<NativeShareResult> {
  if (!Capacitor.isNativePlatform()) {
    return { hasShare: false };
  }

  const shared = await ShareTargetBridge.getSharedContent();
  if (!shared.hasShare) {
    return { hasShare: false };
  }

  const result: NativeShareResult = {
    hasShare: true,
    text: shared.text,
    subject: shared.subject,
  };

  // If media files were shared, write the first one into the Cache API
  // so the existing compose-dialog media flow can handle it.
  if (shared.files && shared.files.length > 0) {
    const file = shared.files[0];
    const webPath = Capacitor.convertFileSrc(file.path);

    const response = await fetch(webPath);
    const blob = await response.blob();

    const cache = await caches.open('shareTarget');
    const cacheKey = `/_share/${encodeURIComponent(file.name)}`;
    await cache.put(
      cacheKey,
      new Response(blob, {
        headers: {
          'content-length': file.size.toString(),
          'content-type': file.type,
        },
      })
    );

    result.cachedFileName = file.name;
  }

  // Clear the intent so it doesn't re-trigger on next resume
  await ShareTargetBridge.clearSharedContent();

  return result;
}

/**
 * Listen for share intents that arrive while the app is already open
 * (warm start via onNewIntent). Calls the handler with the shared content.
 */
export function onNativeShareIntent(
  handler: (result: NativeShareResult) => void
): { remove: () => void } {
  if (!Capacitor.isNativePlatform()) {
    return { remove: () => {} };
  }

  let listenerHandle: { remove: () => void } | null = null;

  ShareTargetBridge.addListener('shareIntent', async () => {
    const result = await checkNativeShare();
    if (result.hasShare) {
      handler(result);
    }
  }).then((handle) => {
    listenerHandle = handle;
  });

  return {
    remove: () => {
      listenerHandle?.remove();
    },
  };
}
