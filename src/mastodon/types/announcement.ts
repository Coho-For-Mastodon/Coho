/**
 * Mastodon Announcement entity
 * @see https://docs.joinmastodon.org/entities/Announcement/
 */

import type { Emoji } from './account';

export interface Announcement {
  id: string;
  content: string;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  published_at: string;
  updated_at: string;
  read?: boolean;
  mentions: AnnouncementMention[];
  statuses: AnnouncementStatusLink[];
  tags: AnnouncementTag[];
  emojis: Emoji[];
  reactions: AnnouncementReaction[];
}

export interface AnnouncementMention {
  id: string;
  username: string;
  url: string;
  acct: string;
}

export interface AnnouncementStatusLink {
  id: string;
  url: string;
}

export interface AnnouncementTag {
  name: string;
  url: string;
}

export interface AnnouncementReaction {
  name: string;
  count: number;
  me: boolean;
  url?: string;
  static_url?: string;
}
