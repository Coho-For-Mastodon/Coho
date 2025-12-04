/**
 * Mastodon Media Types
 * @see https://docs.joinmastodon.org/entities/MediaAttachment/
 */
export interface MediaAttachment {
    id: string;
    type: 'image' | 'video' | 'gifv' | 'unknown' | 'audio';
    url: string;
    preview_url: string;
    remote_url: string | null;
    text_url: string | null;
    meta: MediaMeta;
    description: string | null;
    blurhash: string;
}
export interface MediaMeta {
    small?: MediaSize;
    original?: MediaSize;
    focus?: MediaFocus;
}
export interface MediaSize {
    width: number;
    height: number;
    size: string;
    aspect: number;
}
export interface MediaFocus {
    x: number;
    y: number;
}
