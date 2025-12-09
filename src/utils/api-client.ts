/**
 * Centralized API Client with error handling and resilience
 *
 * Features:
 * - Automatic 401 (Unauthorized) handling with logout redirect
 * - Standardized Mastodon API error parsing
 * - Network timeout handling
 * - Retry logic for transient failures
 */

import { router } from './router.js';

// Mastodon API error format
export interface MastodonApiError {
  error: string;
  error_description?: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public mastodonError?: MastodonApiError
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// Network error class for timeout/connectivity issues
export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Configuration for the API client
export interface ApiClientConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  timeout: 30000, // 30 seconds
  retries: 2,
  retryDelay: 1000, // 1 second
};

// Helper to get fresh auth values
const getAccessToken = () => localStorage.getItem('accessToken') || '';
const getServer = () => localStorage.getItem('server') || '';

/**
 * Clear authentication and redirect to login
 */
export function handleUnauthorized(): void {
  // Clear all auth-related data
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('server');
  localStorage.removeItem('account');

  // Clear from IndexedDB as well (async, fire and forget)
  import('idb-keyval').then(({ del }) => {
    del('accessToken').catch(console.error);
    del('token').catch(console.error);
    del('server').catch(console.error);
    del('account').catch(console.error);
  });

  // Navigate to login page
  router.navigate('/');
}

/**
 * Parse Mastodon API error response
 */
async function parseErrorResponse(
  response: Response
): Promise<MastodonApiError | undefined> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (data.error) {
        return data as MastodonApiError;
      }
    }
  } catch {
    // Failed to parse error response, return undefined
  }
  return undefined;
}

/**
 * Create a fetch request with timeout
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new NetworkError(`Request timed out after ${timeout}ms`));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new NetworkError('Request was aborted'));
        } else {
          reject(new NetworkError('Network request failed', error));
        }
      });
  });
}

/**
 * Sleep utility for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  if (error instanceof ApiError) {
    // Retry on server errors (5xx) or rate limiting (429)
    return error.isServerError || error.isRateLimited;
  }
  return false;
}

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
export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    skipAuth = false,
    timeout = DEFAULT_CONFIG.timeout,
    retries = DEFAULT_CONFIG.retries,
    handleUnauthorized: shouldHandleUnauthorized = true,
    ...fetchOptions
  } = options;

  // Build headers with auth
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, finalOptions, timeout);

      // Handle successful responses
      if (response.ok) {
        return response;
      }

      // Parse error response
      const mastodonError = await parseErrorResponse(response.clone());

      // Handle 401 Unauthorized
      if (response.status === 401 && shouldHandleUnauthorized) {
        handleUnauthorized();
        throw new ApiError(
          mastodonError?.error || 'Unauthorized',
          401,
          mastodonError
        );
      }

      // Create API error
      const error = new ApiError(
        mastodonError?.error || `HTTP ${response.status}`,
        response.status,
        mastodonError
      );

      // Check if we should retry
      if (isRetryableError(error) && attempt < retries) {
        lastError = error;
        await sleep(DEFAULT_CONFIG.retryDelay * (attempt + 1)); // Exponential backoff
        continue;
      }

      throw error;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors with retry
      if (error instanceof NetworkError && attempt < retries) {
        lastError = error;
        await sleep(DEFAULT_CONFIG.retryDelay * (attempt + 1));
        continue;
      }

      // Re-throw if we've exhausted retries
      if (error instanceof NetworkError) {
        throw error;
      }

      throw new NetworkError(
        'Network request failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Should never reach here, but just in case
  throw lastError || new NetworkError('Request failed after retries');
}

/**
 * Convenience method for GET requests
 */
export function apiGet(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  return apiFetch(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export function apiPost(
  url: string,
  body?: BodyInit | Record<string, unknown>,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const fetchOptions: ApiFetchOptions = { ...options, method: 'POST' };

  if (body) {
    if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      typeof body === 'string'
    ) {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
      const headers = new Headers(options.headers);
      headers.set('Content-Type', 'application/json');
      fetchOptions.headers = headers;
    }
  }

  return apiFetch(url, fetchOptions);
}

/**
 * Convenience method for PUT requests
 */
export function apiPut(
  url: string,
  body?: BodyInit | Record<string, unknown>,
  options: ApiFetchOptions = {}
): Promise<Response> {
  return apiPost(url, body, { ...options, method: 'PUT' });
}

/**
 * Convenience method for DELETE requests
 */
export function apiDelete(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  return apiFetch(url, { ...options, method: 'DELETE' });
}

/**
 * Build a Mastodon API URL
 */
export function buildMastodonUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const server = getServer();
  const url = new URL(`https://${server}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Fetch JSON from Mastodon API with error handling
 */
export async function fetchMastodonJson<T>(
  path: string,
  options: ApiFetchOptions = {},
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildMastodonUrl(path, params);
  const response = await apiFetch(url, options);
  return response.json();
}
