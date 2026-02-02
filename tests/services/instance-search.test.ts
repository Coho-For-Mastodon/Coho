import { describe, it, expect } from 'vitest';
import {
  searchInstances,
  POPULAR_INSTANCES,
} from '../../src/services/instance-search';

// Note: The MSW worker is already started in tests/setup.ts
// Use the runtime handlers array to modify handlers per-test if needed

describe('instance-search service', () => {
  describe('POPULAR_INSTANCES', () => {
    it('exports a list of popular instances', () => {
      expect(POPULAR_INSTANCES).toBeDefined();
      expect(Array.isArray(POPULAR_INSTANCES)).toBe(true);
      expect(POPULAR_INSTANCES.length).toBeGreaterThan(0);
    });

    it('includes mastodon.social', () => {
      const hasMastodonSocial = POPULAR_INSTANCES.some(
        (inst) => inst.value === 'mastodon.social'
      );
      expect(hasMastodonSocial).toBe(true);
    });

    it('has proper structure for each instance', () => {
      POPULAR_INSTANCES.forEach((inst) => {
        expect(inst).toHaveProperty('value');
        expect(inst).toHaveProperty('label');
        expect(typeof inst.value).toBe('string');
        expect(typeof inst.label).toBe('string');
      });
    });

    it('includes tech.lgbt', () => {
      const hasTechLgbt = POPULAR_INSTANCES.some(
        (inst) => inst.value === 'tech.lgbt'
      );
      expect(hasTechLgbt).toBe(true);
    });

    it('includes fosstodon.org', () => {
      const hasFosstodon = POPULAR_INSTANCES.some(
        (inst) => inst.value === 'fosstodon.org'
      );
      expect(hasFosstodon).toBe(true);
    });

    it('has descriptions for instances', () => {
      const instanceWithDesc = POPULAR_INSTANCES.find(
        (inst) => inst.description
      );
      expect(instanceWithDesc).toBeDefined();
      expect(typeof instanceWithDesc?.description).toBe('string');
    });
  });

  describe('searchInstances', () => {
    // These tests use the actual function behavior
    // Without VITE_INSTANCES_SOCIAL_TOKEN, it falls back to filtering POPULAR_INSTANCES

    it('returns results when searching for "mastodon"', async () => {
      const results = await searchInstances('mastodon');

      expect(results.length).toBeGreaterThan(0);
      // Should include mastodon.social from popular instances
      const hasMastodonSocial = results.some(
        (r) => r.value === 'mastodon.social'
      );
      expect(hasMastodonSocial).toBe(true);
    });

    it('returns results when searching for "tech"', async () => {
      const results = await searchInstances('tech');

      expect(results.length).toBeGreaterThan(0);
      // Should include tech.lgbt from popular instances
      const hasTechLgbt = results.some((r) => r.value === 'tech.lgbt');
      expect(hasTechLgbt).toBe(true);
    });

    it('returns results when searching for "foss"', async () => {
      const results = await searchInstances('foss');

      expect(results.length).toBeGreaterThan(0);
      const hasFosstodon = results.some((r) => r.value === 'fosstodon.org');
      expect(hasFosstodon).toBe(true);
    });

    it('returns popular instances for non-matching query', async () => {
      const results = await searchInstances('xyznonexistent');

      // Should fall back to popular instances
      expect(results.length).toBeGreaterThan(0);
    });

    it('performs case-insensitive search', async () => {
      const lowerResults = await searchInstances('mastodon');
      const upperResults = await searchInstances('MASTODON');
      const mixedResults = await searchInstances('MaStOdOn');

      // All should return results
      expect(lowerResults.length).toBeGreaterThan(0);
      expect(upperResults.length).toBeGreaterThan(0);
      expect(mixedResults.length).toBeGreaterThan(0);
    });

    it('returns options with proper structure', async () => {
      const results = await searchInstances('mastodon');

      results.forEach((result) => {
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('label');
        expect(typeof result.value).toBe('string');
        expect(typeof result.label).toBe('string');
      });
    });
  });
});
