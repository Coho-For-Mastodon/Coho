import type { VisibilityChangedEvent } from '@lit-labs/virtualizer';

export interface InfiniteScrollOptions {
  /** Number of items from the end to trigger loading (default: 5) */
  threshold?: number;
  /** Current items count */
  itemsCount: number;
  /** Whether data is currently being loaded */
  isLoading: boolean;
  /** Callback to load more items */
  loadMore: () => Promise<void>;
}

/**
 * Creates a visibility change handler for lit-virtualizer infinite scroll.
 * Shared utility to reduce code duplication across timeline, profile, etc.
 *
 * @example
 * ```ts
 * private _handleVisibilityChanged = createVisibilityHandler({
 *   get itemsCount() { return this.posts.length; },
 *   get isLoading() { return this.loadingMore; },
 *   loadMore: () => this.loadMorePosts(),
 * });
 * ```
 */
export function createVisibilityHandler(
  getOptions: () => InfiniteScrollOptions
): (e: VisibilityChangedEvent) => Promise<void> {
  return async (e: VisibilityChangedEvent) => {
    const { last } = e;
    const options = getOptions();
    const threshold = options.threshold ?? 5;

    // Load more when we're close to the end
    if (
      last >= options.itemsCount - threshold &&
      !options.isLoading &&
      options.itemsCount > 0
    ) {
      await options.loadMore();
    }
  };
}

/**
 * Standalone handler for simpler use cases where you manage loading state externally.
 * Returns true if load should be triggered.
 */
export function shouldLoadMore(
  e: VisibilityChangedEvent,
  itemsCount: number,
  isLoading: boolean,
  threshold: number = 5
): boolean {
  const { last } = e;
  return last >= itemsCount - threshold && !isLoading && itemsCount > 0;
}
