import { describe, it, expect } from 'vitest';
import {
  estimateMentionDropdownHeight,
  findMentionMatch,
} from '../../src/utils/mention-utils';

describe('mention-utils', () => {
  describe('findMentionMatch', () => {
    it('matches a mention at the start of the text', () => {
      const result = findMentionMatch('@alice', 6);
      expect(result).toEqual({ query: 'alice', start: 0, end: 6 });
    });

    it('matches a mention after whitespace', () => {
      const result = findMentionMatch('hello @bob', 10);
      expect(result).toEqual({ query: 'bob', start: 6, end: 10 });
    });

    it('matches a mention after opening punctuation', () => {
      const result = findMentionMatch('( @carol', 8);
      expect(result).toEqual({ query: 'carol', start: 2, end: 8 });
    });

    it('returns null when @ is in the middle of a word', () => {
      const result = findMentionMatch('email@host', 10);
      expect(result).toBeNull();
    });

    it('supports federated accounts with @ in the query', () => {
      const result = findMentionMatch('hello @alice@social', 20);
      expect(result).toEqual({ query: 'alice@social', start: 6, end: 20 });
    });

    it('returns empty query when only @ is typed', () => {
      const result = findMentionMatch('test @', 6);
      expect(result).toEqual({ query: '', start: 5, end: 6 });
    });
  });

  describe('estimateMentionDropdownHeight', () => {
    it('returns a compact height while loading', () => {
      expect(estimateMentionDropdownHeight(0, true)).toBe(52);
    });

    it('scales with result count up to the max height', () => {
      expect(estimateMentionDropdownHeight(1, false)).toBe(60);
      expect(estimateMentionDropdownHeight(3, false)).toBe(156);
      expect(estimateMentionDropdownHeight(10, false)).toBe(240);
    });
  });
});
