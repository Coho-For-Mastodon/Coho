import { describe, expect, it } from 'vitest';

import {
  createReloadTrampolineUrl,
  sanitizeReloadTarget,
} from '../../src/utils/reload-window';

describe('reload-window', () => {
  it('builds a trampoline url that preserves the current route', () => {
    expect(createReloadTrampolineUrl('/home?tab=following#composer')).toBe(
      '/reload.html?target=%2Fhome%3Ftab%3Dfollowing%23composer'
    );
  });

  it('normalizes same-origin reload targets', () => {
    expect(sanitizeReloadTarget('/home?tab=following#composer')).toBe(
      '/home?tab=following#composer'
    );
  });

  it('rejects protocol-relative and external targets', () => {
    expect(sanitizeReloadTarget('//evil.example')).toBe('/');
    expect(sanitizeReloadTarget('https://evil.example')).toBe('/');
  });

  it('rejects control characters in reload targets', () => {
    expect(sanitizeReloadTarget('/home\njavascript:alert(1)')).toBe('/');
  });
});
