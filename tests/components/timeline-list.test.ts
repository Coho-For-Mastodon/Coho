import { describe, it, expect, beforeEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/timeline-list';
import type { TimelineList } from '../../src/components/timeline-list';

describe('timeline-list', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  it('renders a list container with slot', async () => {
    const el = await fixture<TimelineList>(
      html`<timeline-list><li>Item</li></timeline-list>`
    );
    await elementUpdated(el);

    const list = el.shadowRoot?.querySelector('ul');
    expect(list).toBeDefined();
    expect(list?.getAttribute('part')).toBe('list');
  });
});
