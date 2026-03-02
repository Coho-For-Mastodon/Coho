import { describe, expect, it, vi, beforeEach } from 'vitest';
import { stripHtml, buildFollowAction } from '../../src/sw/helpers';

describe('helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // stripHtml
  // ==========================================================================

  describe('stripHtml', () => {
    it('strips simple HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('strips nested HTML tags', () => {
      expect(stripHtml('<div><b>Bold</b> text</div>')).toBe('Bold text');
    });

    it('strips self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });

    it('returns plain text unchanged', () => {
      expect(stripHtml('Hello World')).toBe('Hello World');
    });

    it('strips Mastodon-style content', () => {
      const input = '<p>@user <span class="h-card">mentioned</span> you</p>';
      const result = stripHtml(input);
      expect(result).toBe('@user mentioned you');
    });

    it('handles empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('handles unclosed tags', () => {
      expect(stripHtml('<p>Unclosed')).toBe('Unclosed');
    });
  });

  // ==========================================================================
  // buildFollowAction
  // ==========================================================================

  describe('buildFollowAction', () => {
    it('returns a follow action array', () => {
      const actions = buildFollowAction();
      expect(actions).toEqual([{ action: 'follow', title: 'Follow back' }]);
    });

    it('returns a new array each time', () => {
      const a1 = buildFollowAction();
      const a2 = buildFollowAction();
      expect(a1).not.toBe(a2);
    });
  });
});
