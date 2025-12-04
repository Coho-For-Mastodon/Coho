import { Post, TrendingTag, TrendingLink } from '../types';
/**
 * Enriches posts that are replies with their parent post data.
 * This allows the timeline to show thread context for reply posts.
 * Also filters out standalone posts that will be shown as reply_to context
 * to avoid duplicate display.
 */
export declare const enrichPostsWithReplyContext: (posts: Post[]) => Promise<Post[]>;
export declare const getHomeTimeline: (maxId?: string, sinceId?: string) => Promise<Post[]>;
export declare const getPublicTimeline: (local?: boolean, maxId?: string) => Promise<Post[]>;
/**
 * Get the preview/federated timeline (unauthenticated)
 */
export declare const getPreviewTimeline: (maxId?: string) => Promise<Post[]>;
/**
 * Get trending statuses
 */
export declare const getTrendingStatuses: () => Promise<Post[]>;
/**
 * Get trending tags
 */
export declare const getTrendingTags: () => Promise<TrendingTag[]>;
/**
 * Get trending links
 */
export declare const getTrendingLinks: () => Promise<TrendingLink[]>;
/**
 * Get hashtag timeline
 */
export declare const getHashtagTimeline: (hashtag: string, maxId?: string) => Promise<Post[]>;
/**
 * Get a specific status by ID
 */
export declare const getStatus: (id: string) => Promise<Post>;
/**
 * Get status context (ancestors and descendants)
 */
export declare const getStatusContext: (id: string) => Promise<{
    ancestors: Post[];
    descendants: Post[];
}>;
/**
 * Boost/favorite a post
 */
export declare const favoritePost: (id: string) => Promise<Post>;
/**
 * Unfavorite a post
 */
export declare const unfavoritePost: (id: string) => Promise<Post>;
/**
 * Reblog a post
 */
export declare const reblogPost: (id: string) => Promise<Post>;
/**
 * Unreblog a post
 */
export declare const unreblogPost: (id: string) => Promise<Post>;
/**
 * Bookmark a post
 */
export declare const bookmarkPost: (id: string) => Promise<Post>;
/**
 * Unbookmark a post
 */
export declare const unbookmarkPost: (id: string) => Promise<Post>;
/**
 * Get user's media timeline
 */
export declare const getMediaTimeline: (userId?: string) => Promise<Post[]>;
/**
 * Save marker for last read position
 */
export declare const saveMarker: (lastReadId: string) => Promise<Record<string, unknown>>;
/**
 * Get markers for last read position
 */
export declare const getMarkers: () => Promise<Record<string, unknown>>;
