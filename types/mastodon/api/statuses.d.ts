import { Account, Post } from '../types';
export declare function whoBoostedAndFavorited(id: string): Promise<Account[]>;
export declare function editPost(id: string, newContent: string): Promise<Post>;
export declare function deletePost(id: string): Promise<Post>;
export declare function getPostDetail(id: string): Promise<Post>;
export declare function publishPost(post: string, ids?: Array<string>, sensitive?: boolean, spoilerText?: string, visibility?: string): Promise<Post>;
export declare function replyToPost(id: string, content: string): Promise<Post>;
