/**
 * Optimistic UI Updates Utility
 *
 * Provides patterns for optimistic updates with automatic rollback on failure.
 * Use these utilities to update the UI immediately before API calls complete,
 * providing a snappy user experience while handling failures gracefully.
 *
 * Note: This works with the service worker's background sync implementation
 * in src/sw.ts. Failed mutation requests are queued and retried when back online.
 */
/**
 * Toast event for global error notifications
 * Components can listen to this event on the window to show toasts
 */
export interface ToastEventDetail {
  message: string;
  variant: 'error' | 'warning' | 'info' | 'success';
}
/**
 * Dispatch a global toast event
 * This allows any component to show a toast without needing direct DOM access
 */
export declare function dispatchToast(
  message: string,
  variant?: 'error' | 'warning' | 'info' | 'success'
): void;
/**
 * Show an error toast
 */
export declare function showErrorToast(message: string): void;
/**
 * Show an info toast
 */
export declare function showInfoToast(message: string): void;
/**
 * Show a success toast
 */
export declare function showSuccessToast(message: string): void;
/**
 * Result of an optimistic operation
 */
export interface OptimisticResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rolledBack: boolean;
}
/**
 * Execute an operation with optimistic updates
 *
 * This function:
 * 1. Immediately applies the UI update (optimistic)
 * 2. Fires the async operation (which may be queued by service worker if offline)
 * 3. On error while online, rolls back the UI and shows a toast
 * 4. On error while offline, keeps the UI update (background sync will retry)
 *
 * For offline support, the service worker queues failed mutation requests
 * (POST/PUT/DELETE) to IndexedDB and retries them via the Background Sync API
 * when connectivity is restored. See src/sw.ts for implementation.
 *
 * @param apply - Function to apply the optimistic update (runs immediately)
 * @param execute - The actual async operation to perform
 * @param rollback - Function to roll back the optimistic update on failure
 * @param options - Additional options
 * @returns The result of the operation
 */
export declare function withOptimisticUpdate<T>(
  apply: () => void,
  execute: () => Promise<T>,
  rollback: () => void,
  options?: {
    errorMessage?: string;
    showToast?: boolean;
  }
): Promise<OptimisticResult<T>>;
/**
 * Get a user-friendly error message from an error
 */
export declare function getErrorMessage(
  error: unknown,
  fallback: string
): string;
