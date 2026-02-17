/**
 * Mastodon Account Types
 * @see https://docs.joinmastodon.org/entities/Account/
 */

export interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  created_at: string;
  note: string;
  url: string;
  avatar: string;
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  last_status_at: string;
  emojis: Emoji[];
  fields: Field[];
}

export interface Emoji {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
  category?: string;
}

export interface Field {
  name: string;
  value: string;
  verified_at: string | null;
}

/**
 * Source object containing plain-text versions for editing
 * @see https://docs.joinmastodon.org/entities/Account/#source
 */
export interface AccountSource {
  note: string; // Plain text version of bio
  fields: { name: string; value: string }[]; // Plain text field values
  privacy: 'public' | 'unlisted' | 'private' | 'direct';
  sensitive: boolean;
  language: string; // ISO 639-1 language code
  follow_requests_count?: number;
}

/**
 * Extended Account returned by verify_credentials
 * Contains additional fields and source object for editing
 * @see https://docs.joinmastodon.org/entities/Account/#CredentialAccount
 */
export interface CredentialAccount extends Account {
  source: AccountSource;
  discoverable: boolean | null;
  hide_collections: boolean | null;
  indexable: boolean | null;
  role?: {
    id: string;
    name: string;
    permissions: string;
    color: string;
    highlighted: boolean;
  };
}

/**
 * Parameters for updating account credentials
 * @see https://docs.joinmastodon.org/methods/accounts/#update_credentials
 */
export interface UpdateCredentialsParams {
  display_name?: string;
  note?: string;
  avatar?: File;
  header?: File;
  locked?: boolean;
  bot?: boolean;
  discoverable?: boolean;
  hide_collections?: boolean;
  indexable?: boolean;
  fields_attributes?: { name: string; value: string }[];
  source?: {
    privacy?: 'public' | 'unlisted' | 'private' | 'direct';
    sensitive?: boolean;
    language?: string;
  };
}

export interface Relationship {
  id: string;
  following: boolean;
  showing_reblogs: boolean;
  notifying: boolean;
  followed_by: boolean;
  blocking: boolean;
  blocked_by: boolean;
  muting: boolean;
  muting_notifications: boolean;
  requested: boolean;
  domain_blocking: boolean;
  endorsed: boolean;
  note: string;
}

export interface ReportOptions {
  statusIds?: string[];
  comment?: string;
  category?: 'spam' | 'legal' | 'violation' | 'other';
  forward?: boolean;
}
