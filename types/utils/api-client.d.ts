/**
 * Centralized API Client with error handling and resilience
 *
 * Features:
 * - Automatic 401 (Unauthorized) handling with logout redirect
 * - Standardized Mastodon API error parsing
 * - Network timeout handling
 * - Retry logic for transient failures
 */
export interface MastodonApiError {
    error: string;
    error_description?: string;
}
export declare class ApiError extends Error {
    status: number;
    mastodonError?: MastodonApiError | undefined;
    constructor(message: string, status: number, mastodonError?: MastodonApiError | undefined);
    get isUnauthorized(): boolean;
    get isForbidden(): boolean;
    get isNotFound(): boolean;
    get isRateLimited(): boolean;
    get isServerError(): boolean;
}
export declare class NetworkError extends Error {
    originalError?: Error | undefined;
    constructor(message: string, originalError?: Error | undefined);
}
export interface ApiClientConfig {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
/**
 * Clear authentication and redirect to login
 */
export declare function handleUnauthorized(): void;
export interface ApiFetchOptions extends RequestInit {
    /** Skip automatic auth header injection */
    skipAuth?: boolean;
    /** Custom timeout in ms */
    timeout?: number;
    /** Number of retries for transient failures */
    retries?: number;
    /** Whether to handle 401 by redirecting to login (default: true) */
    handleUnauthorized?: boolean;
}
/**
 * Centralized fetch wrapper for Mastodon API calls
 *
 * @param url - The URL to fetch (can be relative to server or absolute)
 * @param options - Fetch options plus custom API client options
 * @returns The fetch Response
 * @throws {ApiError} For HTTP error responses
 * @throws {NetworkError} For network/timeout issues
 */
export declare function apiFetch(url: string, options?: ApiFetchOptions): Promise<Response>;
/**
 * Convenience method for GET requests
 */
export declare function apiGet(url: string, options?: ApiFetchOptions): Promise<Response>;
/**
 * Convenience method for POST requests
 */
export declare function apiPost(url: string, body?: BodyInit | Record<string, unknown>, options?: ApiFetchOptions): Promise<Response>;
/**
 * Convenience method for PUT requests
 */
export declare function apiPut(url: string, body?: BodyInit | Record<string, unknown>, options?: ApiFetchOptions): Promise<Response>;
/**
 * Convenience method for DELETE requests
 */
export declare function apiDelete(url: string, options?: ApiFetchOptions): Promise<Response>;
/**
 * Build a Mastodon API URL
 */
export declare function buildMastodonUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string;
/**
 * Fetch JSON from Mastodon API with error handling
 */
export declare function fetchMastodonJson<T>(path: string, options?: ApiFetchOptions, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
