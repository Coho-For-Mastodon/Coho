/**
 * Mastodon Status Types
 * @see https://docs.joinmastodon.org/entities/Status/
 */

import { Account, Emoji } from './account';
import { MediaAttachment } from './media';

export interface Status {
  id: string;
  created_at: string;
  in_reply_to_id: string | null;
  in_reply_to_account_id: string | null;
  sensitive: boolean;
  spoiler_text: string;
  visibility: StatusVisibility;
  uri: string;
  url: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  favourited: boolean;
  reblogged: boolean;
  muted: boolean;
  bookmarked: boolean;
  pinned: boolean;
  content: string;
  reblog: Status | null;
  application: Application | null;
  account: Account;
  media_attachments: MediaAttachment[];
  mentions: Mention[];
  tags: Tag[];
  emojis: Emoji[];
  card: Card | null;
  poll: Poll | null;
  reply_to?: Status;
  ancestors?: Status[];
  thread_continuation?: Status[];
}

export type StatusVisibility = 'public' | 'unlisted' | 'private' | 'direct';

export interface Application {
  name: string;
  website: string | null;
}

export interface Mention {
  id: string;
  username: string;
  url: string;
  acct: string;
}

export interface Tag {
  name: string;
  url: string;
}

export interface Card {
  url: string;
  title: string;
  description: string;
  type: 'link' | 'photo' | 'video' | 'rich';
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width: number;
  height: number;
  image: string;
}

export interface Poll {
  id: string;
  expires_at: string;
  expired: boolean;
  multiple: boolean;
  votes_count: number;
  voters_count?: number;
  options: PollOption[];
  emojis: Emoji[];
  voted?: boolean;
  own_votes?: number[];
}

export interface PollOption {
  title: string;
  votes_count: number;
}

export interface StatusContext {
  ancestors: Status[];
  descendants: Status[];
}

export interface ScheduledStatusParams {
  text?: string;
  warning_text?: string;
  visibility?: StatusVisibility;
  sensitive?: string;
  language?: string;
  media_ids?: string[];
  scheduled_at?: string;
  poll?: {
    options?: string[];
    expires_in?: string;
    multiple?: string;
  };
}

export interface ScheduledStatus {
  id: string;
  scheduled_at: string;
  params?: ScheduledStatusParams;
  media_attachments?: MediaAttachment[];
}

/**
 * @deprecated Use Status instead - this alias exists for backwards compatibility
 */
export type Post = Status;
