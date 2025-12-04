import { Account, Post } from '../types';
export declare const editAccount: (display_name: string, note: string, locked: string, bot: string, avatar: File | string, header: File | string) => Promise<any>;
export declare const getPeers: () => Promise<any>;
export declare const checkFollowing: (id: string) => Promise<any>;
export declare const getCurrentUser: () => Promise<Account>;
export declare const getUsersPosts: (id: string, excludeReplies?: boolean) => Promise<Post[]>;
