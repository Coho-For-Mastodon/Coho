import { Post } from '../interfaces/Post';
/**
 * Enriches posts that are replies with their parent post data.
 * This allows the timeline to show thread context for reply posts.
 * Also filters out standalone posts that will be shown as reply_to context
 * to avoid duplicate display.
 */
export declare const enrichPostsWithReplyContext: (posts: Post[]) => Promise<Post[]>;
export declare const savePlace: (id: string) => Promise<void>;
export declare const getHomeTimeline: () => Promise<Post[]>;
export declare const mixTimeline: (type?: string) => Promise<Post[]>;
export declare const addSomeInterestFinds: () => Promise<any>;
export declare const getPreviewTimeline: () => Promise<Post[]>;
export declare const getTrendingLinks: () => Promise<any>;
export declare const resetLastPageID: () => Promise<void>;
export declare const getLastPlaceTimeline: () => Promise<Post[] | undefined>;
export declare const getPaginatedHomeTimeline: (type?: string) => Promise<Post[]>;
export declare const getPublicTimeline: () => Promise<Post[]>;
export declare const boostPost: (id: string) => Promise<any>;
export declare const reblogPost: (id: string) => Promise<any>;
export declare const getReplies: (id: string) => Promise<{
    ancestors: Post[];
    descendants: Post[];
}>;
export declare const reply: (id: string, reply: string) => Promise<any>;
export declare const mediaTimeline: () => Promise<Post[]>;
export declare const searchTimeline: (query: string) => Promise<any>;
export declare const getHashtagTimeline: (hashtag: string) => Promise<Post[]>;
export declare const getAStatus: (id: string) => Promise<Post>;
export declare const getTrendingStatuses: () => Promise<Post[]>;
export declare const getTrendingTags: () => Promise<any[]>;
