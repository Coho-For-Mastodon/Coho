import type { Emoji } from '../mastodon/types/account';
import { getCustomEmojiMap } from '../services/custom-emojis';

const SHORTCODE_RE = /:([a-zA-Z0-9_]+):/g;

function emojiImg(shortcode: string, url: string): string {
  return `<img src="${url}" alt=":${shortcode}:" class="custom-emoji" style="height: 1.2em; vertical-align: middle; object-fit: contain;" />`;
}

export function parseEmojis(
  text: string,
  emojis: Emoji[],
  escape: boolean = false
): string {
  if (!text) return '';

  let newText = text;

  if (escape) {
    newText = newText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Build a local map from the per-status emojis for fast lookup
  const localMap = new Map<string, Emoji>();
  if (emojis && emojis.length > 0) {
    for (const emoji of emojis) {
      localMap.set(emoji.shortcode, emoji);
    }
  }

  // Instance-wide emoji map (may be empty if not yet loaded)
  const instanceMap = getCustomEmojiMap();

  // Single-pass replacement: try local emojis first, then instance emojis
  newText = newText.replace(SHORTCODE_RE, (match, shortcode: string) => {
    const local = localMap.get(shortcode);
    if (local) return emojiImg(shortcode, local.url);

    const instance = instanceMap.get(shortcode);
    if (instance) return emojiImg(shortcode, instance.url);

    return match;
  });

  return newText;
}
