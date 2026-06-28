/**
 * Mastodon v2 Filter Types
 * @see https://docs.joinmastodon.org/entities/Filter/
 * @see https://docs.joinmastodon.org/entities/FilterKeyword/
 * @see https://docs.joinmastodon.org/entities/FilterStatus/
 * @see https://docs.joinmastodon.org/entities/FilterResult/
 */

export type FilterContext =
  'home' | 'notifications' | 'public' | 'thread' | 'account';

export type FilterAction = 'warn' | 'hide' | 'blur';

export interface FilterKeyword {
  id: string;
  keyword: string;
  whole_word: boolean;
}

export interface FilterStatus {
  id: string;
  status_id: string;
}

export interface Filter {
  id: string;
  title: string;
  context: FilterContext[];
  expires_at: string | null;
  filter_action: FilterAction;
  keywords: FilterKeyword[];
  statuses: FilterStatus[];
}

export interface FilterResult {
  filter: Filter;
  keyword_matches: string[] | null;
  status_matches: string[] | null;
}

export interface KeywordAttribute {
  keyword: string;
  whole_word: boolean;
  id?: string;
  _destroy?: boolean;
}

export interface CreateFilterParams {
  title: string;
  context: FilterContext[];
  filter_action: FilterAction;
  expires_in?: number | null;
  keywords_attributes?: KeywordAttribute[];
}

export interface UpdateFilterParams {
  title?: string;
  context?: FilterContext[];
  filter_action?: FilterAction;
  expires_in?: number | null;
  keywords_attributes?: KeywordAttribute[];
}
