import { describe, it, expect } from 'vitest';
import { parseEmojis } from '../../src/utils/emoji-parser';
import type { Emoji } from '../../src/types/interfaces/Account';

describe('emoji-parser', () => {
  describe('parseEmojis', () => {
    it('returns empty string for empty input', () => {
      expect(parseEmojis('', [])).toBe('');
    });

    it('returns original text when no emojis provided', () => {
      const text = 'Hello, world!';
      expect(parseEmojis(text, [])).toBe(text);
    });

    it('returns original text when emojis is undefined', () => {
      const text = 'Hello, world!';
      // @ts-expect-error testing undefined case
      expect(parseEmojis(text, undefined)).toBe(text);
    });

    it('replaces emoji shortcode with img tag', () => {
      const emojis: Emoji[] = [
        {
          shortcode: 'wave',
          url: 'https://example.com/emoji/wave.png',
          static_url: 'https://example.com/emoji/wave.png',
          visible_in_picker: true,
        },
      ];
      const text = 'Hello :wave:';
      const result = parseEmojis(text, emojis);

      expect(result).toContain('<img');
      expect(result).toContain('src="https://example.com/emoji/wave.png"');
      expect(result).toContain('alt=":wave:"');
      expect(result).toContain('class="custom-emoji"');
    });

    it('replaces multiple occurrences of same emoji', () => {
      const emojis: Emoji[] = [
        {
          shortcode: 'star',
          url: 'https://example.com/emoji/star.png',
          static_url: 'https://example.com/emoji/star.png',
          visible_in_picker: true,
        },
      ];
      const text = ':star: Rating: :star::star::star:';
      const result = parseEmojis(text, emojis);

      const imgMatches = result.match(/<img/g);
      expect(imgMatches?.length).toBe(4);
    });

    it('replaces different emojis', () => {
      const emojis: Emoji[] = [
        {
          shortcode: 'smile',
          url: 'https://example.com/emoji/smile.png',
          static_url: 'https://example.com/emoji/smile.png',
          visible_in_picker: true,
        },
        {
          shortcode: 'heart',
          url: 'https://example.com/emoji/heart.png',
          static_url: 'https://example.com/emoji/heart.png',
          visible_in_picker: true,
        },
      ];
      const text = 'I :heart: you :smile:';
      const result = parseEmojis(text, emojis);

      expect(result).toContain('emoji/smile.png');
      expect(result).toContain('emoji/heart.png');
    });

    it('preserves text when no matching emoji shortcodes', () => {
      const emojis: Emoji[] = [
        {
          shortcode: 'wave',
          url: 'https://example.com/emoji/wave.png',
          static_url: 'https://example.com/emoji/wave.png',
          visible_in_picker: true,
        },
      ];
      const text = 'Hello :notanemoji:';
      const result = parseEmojis(text, emojis);

      expect(result).toBe('Hello :notanemoji:');
    });

    describe('escape mode', () => {
      it('escapes HTML entities when escape=true', () => {
        const text = '<script>alert("xss")</script>';
        const result = parseEmojis(text, [], true);

        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
        expect(result).toContain('&quot;');
      });

      it('escapes ampersands', () => {
        const text = 'A & B';
        const result = parseEmojis(text, [], true);

        expect(result).toBe('A &amp; B');
      });

      it('escapes quotes', () => {
        const text = 'It\'s a "test"';
        const result = parseEmojis(text, [], true);

        expect(result).toContain('&#039;');
        expect(result).toContain('&quot;');
      });

      it('escapes and then replaces emojis', () => {
        const emojis: Emoji[] = [
          {
            shortcode: 'wave',
            url: 'https://example.com/emoji/wave.png',
            static_url: 'https://example.com/emoji/wave.png',
            visible_in_picker: true,
          },
        ];
        const text = '<b>Hello</b> :wave:';
        const result = parseEmojis(text, emojis, true);

        expect(result).toContain('&lt;b&gt;');
        expect(result).toContain('<img');
        expect(result).toContain('emoji/wave.png');
      });

      it('does not escape when escape=false', () => {
        const text = '<b>Bold</b>';
        const result = parseEmojis(text, [], false);

        expect(result).toBe('<b>Bold</b>');
      });
    });

    describe('emoji img tag attributes', () => {
      it('includes correct styling', () => {
        const emojis: Emoji[] = [
          {
            shortcode: 'test',
            url: 'https://example.com/test.png',
            static_url: 'https://example.com/test.png',
            visible_in_picker: true,
          },
        ];
        const result = parseEmojis(':test:', emojis);

        expect(result).toContain('height: 1.2em');
        expect(result).toContain('vertical-align: middle');
        expect(result).toContain('object-fit: contain');
      });
    });
  });
});
