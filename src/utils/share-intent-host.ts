import { msg } from '@lit/localize';
import type { NativeShareResult } from '../services/native-share-target';

export interface ShareHandlers {
  openNewDialog(
    shareName?: string,
    origin?: { x: number; y: number },
    text?: string
  ): Promise<void>;
  openDialogAndAttach(names: string[]): Promise<void>;
  showError(message: string): Promise<void>;
}

async function processNativeShare(
  result: NativeShareResult,
  handlers: ShareHandlers
): Promise<void> {
  if (result.cachedFileName) {
    await handlers.openNewDialog(result.cachedFileName, undefined, result.text);
  } else if (result.text) {
    await handlers.openNewDialog(undefined, undefined, result.text);
  }
}

/**
 * Set up the warm-start listener for Android share intents arriving while
 * the app is already open. Returns a cleanup function to call on disconnect.
 * Safe to call on non-native — returns a no-op cleanup.
 */
export async function initNativeShareListener(
  handlers: ShareHandlers
): Promise<() => void> {
  const { onNativeShareIntent } =
    await import('../services/native-share-target');
  const listener = onNativeShareIntent((result) => {
    processNativeShare(result, handlers);
  });
  return () => listener.remove();
}

/**
 * Handle shares that were pending at startup:
 * - Web share target (?name= params from PWA share)
 * - Android cold-start share intent (if isNative)
 */
export async function handlePendingShares(
  webShareNames: string[],
  isNative: boolean,
  handlers: ShareHandlers
): Promise<void> {
  if (webShareNames.length > 0) {
    const { shareTarget } = await import('../services/share-target');
    const validNames: string[] = [];

    for (const name of webShareNames) {
      const result = await shareTarget(name);
      if (result.success) {
        validNames.push(result.decodedName);
      } else {
        console.warn('[Share Target] No cached file found for:', name);
      }
    }

    if (validNames.length === 0) {
      await handlers.showError(
        msg('Failed to load shared image. Please try sharing again.')
      );
    } else {
      await handlers.openDialogAndAttach(validNames);
    }
  }

  if (isNative) {
    const { checkNativeShare } =
      await import('../services/native-share-target');
    const result = await checkNativeShare();
    if (result.hasShare) {
      await processNativeShare(result, handlers);
    }
  }
}
