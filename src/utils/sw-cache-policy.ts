export interface CacheDecision {
  shouldCache: boolean;
  reason?: string;
}

function isJavaScriptContentType(contentType: string): boolean {
  return (
    contentType.includes('javascript') || contentType.includes('ecmascript')
  );
}

function isStyleContentType(contentType: string): boolean {
  return contentType.includes('text/css');
}

/**
 * Determines whether a response is safe to store in cache for the given
 * request destination. This prevents HTML rewrite responses from being cached
 * under JS/CSS asset keys during deploy transitions.
 */
export function evaluateCacheResponse(
  request: Pick<Request, 'destination' | 'url'>,
  response: Response
): CacheDecision {
  if (response.type === 'error') {
    return { shouldCache: false, reason: 'response type is error' };
  }

  const destination = request.destination;
  const contentType = (
    response.headers.get('content-type') || ''
  ).toLowerCase();

  if (destination === 'script') {
    if (!response.ok) {
      return {
        shouldCache: false,
        reason: `script response status ${response.status}`,
      };
    }
    if (!isJavaScriptContentType(contentType)) {
      return {
        shouldCache: false,
        reason: `script MIME mismatch: ${contentType || 'missing'}`,
      };
    }
    return { shouldCache: true };
  }

  if (destination === 'style') {
    if (!response.ok) {
      return {
        shouldCache: false,
        reason: `style response status ${response.status}`,
      };
    }
    if (!isStyleContentType(contentType)) {
      return {
        shouldCache: false,
        reason: `style MIME mismatch: ${contentType || 'missing'}`,
      };
    }
    return { shouldCache: true };
  }

  // Opaque responses are acceptable for cross-origin image and similar
  // requests used by the app.
  return { shouldCache: response.ok || response.type === 'opaque' };
}
