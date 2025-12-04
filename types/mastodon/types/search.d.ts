/**
 * Mastodon Search Types
 * @see https://docs.joinmastodon.org/methods/search/
 */
import { Account } from './account';
import { Status } from './status';
import { TrendingTag } from './instance';
export interface SearchResult {
    accounts: Account[];
    statuses: Status[];
    hashtags: TrendingTag[];
}
export type SearchType = 'accounts' | 'hashtags' | 'statuses';
