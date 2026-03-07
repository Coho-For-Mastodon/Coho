import { describe, expect, it } from 'vitest';

import { createReloadTrampolineUrl } from '../../src/utils/reload-window';

describe('reload-window', () => {
  it('builds a trampoline url that preserves the current route', () => {
    expect(createReloadTrampolineUrl('/home?tab=following#composer')).toBe(
      '/reload.html?target=%2Fhome%3Ftab%3Dfollowing%23composer'
    );
  });
});
