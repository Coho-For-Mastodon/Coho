import { withOptimisticUpdate, dispatchToast } from './optimistic-updates';
import { Post } from '../interfaces/Post';

export function showGuestActionToast(action: string) {
  dispatchToast(`Sign in to ${action}`, 'info');
}

export async function shareStatus(tweet: Post | undefined | null) {
  if (!tweet) return;

  const content = tweet.reblog ? tweet.reblog.content : tweet.content;
  const id = tweet.reblog ? tweet.reblog.id : tweet.id;
  const url = `https://mastodon.social/web/statuses/${id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Coho',
        text: content,
        url: url,
      });
    } catch (err) {
      // User cancelled or share failed, ignore
      console.warn('Share failed:', err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      dispatchToast('Link copied to clipboard', 'info');
    } catch (err) {
      console.error('Failed to copy link:', err);
      dispatchToast('Failed to copy link', 'error');
    }
  }
}

interface ToggleOptions {
  guestMode: boolean;
  actionName: string; // for guest prompt, e.g. "boost posts"
  isActive: boolean; // current state
  onOptimisticUpdate: (targetState: boolean) => void;
  doApiCall: () => Promise<unknown>;
  undoApiCall: () => Promise<unknown>;
  onRollback: () => void;
  errorMessageDo: string;
  errorMessageUndo: string;
}

export async function toggleStatusAction(options: ToggleOptions) {
  const {
    guestMode,
    actionName,
    isActive,
    onOptimisticUpdate,
    doApiCall,
    undoApiCall,
    onRollback,
    errorMessageDo,
    errorMessageUndo,
  } = options;

  if (guestMode) {
    showGuestActionToast(actionName);
    return;
  }

  if (isActive) {
    // UNDO
    await withOptimisticUpdate(
      () => onOptimisticUpdate(false),
      undoApiCall,
      onRollback,
      { errorMessage: errorMessageUndo }
    );
  } else {
    // DO
    await withOptimisticUpdate(
      () => onOptimisticUpdate(true),
      doApiCall,
      onRollback,
      { errorMessage: errorMessageDo }
    );
  }
}

export async function performOneWayAction(
  guestMode: boolean,
  actionName: string,
  onOptimisticUpdate: () => void,
  apiCall: () => Promise<unknown>,
  onRollback: () => void,
  errorMessage: string
) {
  if (guestMode) {
    showGuestActionToast(actionName);
    return;
  }

  await withOptimisticUpdate(onOptimisticUpdate, apiCall, onRollback, {
    errorMessage,
  });
}
