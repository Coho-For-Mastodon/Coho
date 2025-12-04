/**
 * Mastodon Instance Types
 * @see https://docs.joinmastodon.org/entities/Instance/
 */

export interface Instance {
  uri: string;
  title: string;
  short_description: string;
  description: string;
  email: string;
  version: string;
  urls: InstanceUrls;
  stats: InstanceStats;
  thumbnail: string | null;
  languages: string[];
  registrations: boolean;
  approval_required: boolean;
  invites_enabled: boolean;
  configuration: InstanceConfiguration;
  contact_account: unknown;
  rules: InstanceRule[];
}

export interface InstanceUrls {
  streaming_api: string;
}

export interface InstanceStats {
  user_count: number;
  status_count: number;
  domain_count: number;
}

export interface InstanceConfiguration {
  statuses: {
    max_characters: number;
    max_media_attachments: number;
    characters_reserved_per_url: number;
  };
  media_attachments: {
    supported_mime_types: string[];
    image_size_limit: number;
    image_matrix_limit: number;
    video_size_limit: number;
    video_frame_rate_limit: number;
    video_matrix_limit: number;
  };
  polls: {
    max_options: number;
    max_characters_per_option: number;
    min_expiration: number;
    max_expiration: number;
  };
}

export interface InstanceRule {
  id: string;
  text: string;
}

export interface TrendingTag {
  name: string;
  url: string;
  history: TagHistory[];
}

export interface TagHistory {
  day: string;
  uses: string;
  accounts: string;
}

export interface TrendingLink {
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
  blurhash: string;
  history: TagHistory[];
}
