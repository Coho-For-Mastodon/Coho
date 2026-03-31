/**
 * Full Tag entity returned by GET /api/v1/tags/:name.
 * Extends the minimal Tag on statuses with history and following state.
 * @see https://docs.joinmastodon.org/entities/Tag/
 */
export interface TagInfo {
  name: string;
  url: string;
  history: TagHistoryEntry[];
  following?: boolean;
}

export interface TagHistoryEntry {
  day: string;
  uses: string;
  accounts: string;
}
