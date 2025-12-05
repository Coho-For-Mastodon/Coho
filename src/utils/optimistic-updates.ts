/**
 * Optimistic UI Updates Utility
 *
 * Provides patterns for optimistic updates with automatic rollback on failure.
 * Use these utilities to update the UI immediately before API calls complete,
 * providing a snappy user experience while handling failures gracefully.
 *
 * Note: This works with the service worker's BackgroundSyncPlugin for offline
 * support. Failed requests are queued and retried when back online.
 */

import { ApiError, NetworkError } from './api-client.js';

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
export function dispatchToast(
    message: string,
    variant: 'error' | 'warning' | 'info' | 'success' = 'info'
): void {
    window.dispatchEvent(
        new CustomEvent<ToastEventDetail>('app-toast', {
            detail: { message, variant },
            bubbles: true,
            composed: true,
        })
    );
}

/**
 * Show an error toast
 */
export function showErrorToast(message: string): void {
    dispatchToast(message, 'error');
}

/**
 * Show an info toast
 */
export function showInfoToast(message: string): void {
    dispatchToast(message, 'info');
}

/**
 * Show a success toast
 */
export function showSuccessToast(message: string): void {
    dispatchToast(message, 'success');
}

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
 * For offline support, the service worker's BackgroundSyncPlugin will queue
 * failed POST requests and retry them when the connection is restored.
 *
 * @param apply - Function to apply the optimistic update (runs immediately)
 * @param execute - The actual async operation to perform
 * @param rollback - Function to roll back the optimistic update on failure
 * @param options - Additional options
 * @returns The result of the operation
 */
export async function withOptimisticUpdate<T>(
    apply: () => void,
    execute: () => Promise<T>,
    rollback: () => void,
    options: {
        errorMessage?: string;
        showToast?: boolean;
    } = {}
): Promise<OptimisticResult<T>> {
    const {
        errorMessage = 'Action failed. Please try again.',
        showToast = true,
    } = options;

    // Apply optimistic update immediately
    apply();

    try {
        // Execute the actual operation
        // If offline, service worker may queue this for background sync
        const data = await execute();
        return { success: true, data, rolledBack: false };
    } catch (error) {
        // Check if we're offline - if so, the service worker has queued the request
        // for background sync, so we should keep the optimistic update
        if (!navigator.onLine) {
            // Request was queued for background sync, keep the optimistic update
            console.log('[Optimistic] Offline - request queued for background sync');
            return { success: true, data: undefined, rolledBack: false };
        }

        // Online but failed - this is a real error, roll back
        rollback();

        // Show error toast
        if (showToast) {
            const message = getErrorMessage(error, errorMessage);
            showErrorToast(message);
        }

        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            rolledBack: true,
        };
    }
}

/**
 * Get a user-friendly error message from an error
 */
export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        // Use Mastodon's error message if available
        if (error.mastodonError?.error_description) {
            return error.mastodonError.error_description;
        }
        if (error.mastodonError?.error) {
            return error.mastodonError.error;
        }
        // Provide user-friendly messages for common HTTP errors
        if (error.isRateLimited) {
            return 'Rate limited. Please wait a moment and try again.';
        }
        if (error.isServerError) {
            return 'Server error. Please try again later.';
        }
        if (error.isNotFound) {
            return 'The requested item was not found.';
        }
    }

    if (error instanceof NetworkError) {
        return 'Network error. Please check your connection.';
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
}
