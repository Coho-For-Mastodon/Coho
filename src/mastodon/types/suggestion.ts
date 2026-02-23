/**
 * Mastodon Suggestion Types
 * @see https://docs.joinmastodon.org/entities/Suggestion/
 */

import type { Account } from './account';

/**
 * The source of the suggestion.
 * - `featured`: Profiles featured by staff
 * - `most_followed`: Most followed profiles
 * - `most_interactions`: Profiles with most interactions
 * - `similar_to_recently_followed`: Similar to recently followed accounts
 * - `friends_of_friends`: Accounts followed by people you follow
 */
export type SuggestionSource =
  | 'featured'
  | 'most_followed'
  | 'most_interactions'
  | 'similar_to_recently_followed'
  | 'friends_of_friends';

/**
 * Represents a suggested account to follow.
 * @see https://docs.joinmastodon.org/methods/suggestions/
 */
export interface Suggestion {
  /** The reason this account is being suggested. */
  source: SuggestionSource;
  /** The suggested account. */
  account: Account;
}
