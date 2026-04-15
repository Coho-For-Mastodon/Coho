import { set, get } from 'idb-keyval';
import type { Emoji } from '../mastodon/types/account';
import { getCustomEmojis as fetchCustomEmojis } from '../mastodon/api/custom-emojis';
import { getServer } from './auth-context';

let emojiList: Emoji[] | null = null;
let emojiMap: Map<string, Emoji> | null = null;

function cacheKey(): string {
  return `custom_emojis_${getServer()}`;
}

function buildMap(emojis: Emoji[]): Map<string, Emoji> {
  const map = new Map<string, Emoji>();
  for (const emoji of emojis) {
    map.set(emoji.shortcode, emoji);
  }
  return map;
}

/**
 * Fetch custom emojis from the API and cache them.
 * Safe to call multiple times; subsequent calls are cheap if data is
 * already in memory.
 */
export async function initCustomEmojis(): Promise<void> {
  if (emojiList) return;

  try {
    const emojis = await fetchCustomEmojis();
    emojiList = emojis;
    emojiMap = buildMap(emojis);
    await set(cacheKey(), emojis).catch(() => {});
  } catch (error) {
    console.error('[custom-emojis] Failed to fetch custom emojis', error);
    // Fall back to IndexedDB cache
    try {
      const cached = await get<Emoji[]>(cacheKey());
      if (cached) {
        emojiList = cached;
        emojiMap = buildMap(cached);
      }
    } catch {
      // No cached data available
    }
  }
}

/**
 * Get the full list of custom emojis for this instance.
 * Returns an empty array if not yet loaded.
 */
export function getCustomEmojis(): Emoji[] {
  return emojiList ?? [];
}

/**
 * Get a Map of shortcode → Emoji for O(1) lookup.
 * Returns an empty map if not yet loaded.
 */
export function getCustomEmojiMap(): Map<string, Emoji> {
  return emojiMap ?? new Map();
}

export interface EmojiCategory {
  name: string;
  emojis: Emoji[];
}

/**
 * Get emojis that should appear in the picker, grouped by category.
 * Only includes emojis with `visible_in_picker !== false`.
 */
export function getPickerEmojis(): EmojiCategory[] {
  const all = getCustomEmojis();
  const grouped = new Map<string, Emoji[]>();

  for (const emoji of all) {
    if (emoji.visible_in_picker === false) continue;
    const cat = emoji.category || 'Custom';
    let list = grouped.get(cat);
    if (!list) {
      list = [];
      grouped.set(cat, list);
    }
    list.push(emoji);
  }

  const categories: EmojiCategory[] = [];
  for (const [name, emojis] of grouped) {
    categories.push({ name, emojis });
  }
  return categories;
}

/**
 * Reset the in-memory cache.  Useful when switching accounts.
 */
export function clearCustomEmojiCache(): void {
  emojiList = null;
  emojiMap = null;
}
