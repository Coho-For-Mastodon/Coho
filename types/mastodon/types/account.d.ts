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
}
export interface Field {
    name: string;
    value: string;
    verified_at: string | null;
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
