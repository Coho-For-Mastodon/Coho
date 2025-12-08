export declare const editAccount: (display_name: string, note: string, locked: string, bot: string, avatar: File | string, header: File | string) => Promise<any>;
export declare const getPeers: () => Promise<any>;
export declare const checkFollowing: (id: string) => Promise<any>;
export declare const getCurrentUser: () => Promise<any>;
export declare const unfollowUser: (id: string) => Promise<any>;
export declare const getAccount: (id: string) => Promise<any>;
export type ProfilePostsFilter = 'posts' | 'posts_replies' | 'media';
export declare const getUsersPosts: (id: string, filter?: ProfilePostsFilter) => Promise<any>;
export declare const getUsersFollowers: (id: string) => Promise<any>;
export declare const getFollowing: (id: string) => Promise<any>;
export declare const followUser: (id: string) => Promise<any>;
export declare const getInstanceInfo: () => Promise<any>;
export declare const initAuth: (serverURL: string) => Promise<void>;
export declare const authToClient: (code: string, state: string) => Promise<any>;
export declare const registerAccount: (username: string, email: string, password: string, agreement: boolean, locale: string, chosenServer: string) => Promise<any>;
export declare const getServers: () => Promise<any>;
export declare const isFollowingMe: (id: string) => Promise<any>;
export declare const muteUser: (id: string) => Promise<any>;
export declare const unmuteUser: (id: string) => Promise<any>;
export declare const blockUser: (id: string) => Promise<any>;
export declare const unblockUser: (id: string) => Promise<any>;
export interface ReportOptions {
    statusIds?: string[];
    comment?: string;
    category?: 'spam' | 'legal' | 'violation' | 'other';
    forward?: boolean;
}
export declare const reportUser: (accountId: string, options?: ReportOptions) => Promise<any>;
