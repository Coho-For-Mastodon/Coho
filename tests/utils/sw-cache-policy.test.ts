import { describe, expect, it } from 'vitest';
import { evaluateCacheResponse } from '../../src/utils/sw-cache-policy';

describe('sw-cache-policy', () => {
  it('does not cache HTML response for script requests', () => {
    const decision = evaluateCacheResponse(
      {
        destination: 'script',
        url: 'https://example.com/code/main-abc123.js',
      } as Pick<Request, 'destination' | 'url'>,
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    );

    expect(decision.shouldCache).toBe(false);
    expect(decision.reason).toContain('MIME mismatch');
  });

  it('caches JavaScript response for script requests', () => {
    const decision = evaluateCacheResponse(
      {
        destination: 'script',
        url: 'https://example.com/code/main-abc123.js',
      } as Pick<Request, 'destination' | 'url'>,
      new Response('console.log("ok");', {
        status: 200,
        headers: { 'content-type': 'application/javascript; charset=utf-8' },
      })
    );

    expect(decision.shouldCache).toBe(true);
  });

  it('caches CSS response for style requests', () => {
    const decision = evaluateCacheResponse(
      {
        destination: 'style',
        url: 'https://example.com/code/app-abc123.css',
      } as Pick<Request, 'destination' | 'url'>,
      new Response('body{color:black}', {
        status: 200,
        headers: { 'content-type': 'text/css; charset=utf-8' },
      })
    );

    expect(decision.shouldCache).toBe(true);
  });
});
