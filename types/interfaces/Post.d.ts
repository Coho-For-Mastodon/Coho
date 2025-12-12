import { Account, Emoji } from '../types/interfaces/Account';
import { MediaAttachment } from '../types/interfaces/MediaAttachment';
export interface Post {
  id: string;
  created_at: string;
  in_reply_to_id: string | null;
  in_reply_to_account_id: string | null;
  sensitive: boolean;
  spoiler_text: string;
  visibility: string;
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
  reblog: Post | null;
  application: {
    name: string;
    website: string | null;
  } | null;
  account: Account;
  media_attachments: MediaAttachment[];
  mentions: {
    id: string;
    username: string;
    url: string;
    acct: string;
  }[];
  tags: {
    name: string;
    url: string;
  }[];
  emojis: Emoji[];
  card: {
    url: string;
    title: string;
    description: string;
    type: string;
    author_name: string;
    author_url: string;
    provider_name: string;
    provider_url: string;
    html: string;
    width: number;
    height: number;
    image: string;
  } | null;
  poll: {
    id: string;
    expires_at: string | null;
    expired: boolean;
    multiple: boolean;
    votes_count: number;
    voters_count?: number;
    options: {
      title: string;
      votes_count: number;
    }[];
    emojis?: Emoji[];
    voted?: boolean;
    own_votes?: number[];
  } | null;
  reply_to?: Post;
  ancestors?: Post[];
  thread_continuation?: Post[];
}
